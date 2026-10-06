create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
create table private.marketplace_quotas (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  bucket timestamptz not null,
  requests integer not null,
  primary key(user_id,action,bucket)
);
alter table private.marketplace_quotas enable row level security;
revoke all on private.marketplace_quotas from public,anon,authenticated;

create function private.consume_marketplace_quota(quota_action text)
returns boolean language plpgsql security definer set search_path = pg_catalog as $$
declare uid uuid := auth.uid(); cap integer; period timestamptz; used integer;
begin
  if uid is null or not exists(select 1 from auth.users u where u.id=uid and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)) then
    raise exception 'Verified account required' using errcode='42501';
  end if;
  case quota_action
    when 'assistant' then cap:=5; period:=date_trunc('hour',now());
    when 'photo' then cap:=30; period:=date_trunc('hour',now());
    when 'listing' then cap:=5; period:=date_trunc('day',now());
    when 'inquiry' then cap:=20; period:=date_trunc('hour',now());
    else raise exception 'Invalid quota action' using errcode='22023';
  end case;
  insert into private.marketplace_quotas as q values(uid,quota_action,period,1)
    on conflict(user_id,action,bucket) do update set requests=q.requests+1
    where q.requests<cap returning requests into used;
  return used is not null;
end;
$$;
revoke all on function private.consume_marketplace_quota(text) from public,anon;
grant execute on function private.consume_marketplace_quota(text) to authenticated;
create function public.consume_marketplace_quota(action text)
returns boolean language sql security invoker set search_path=pg_catalog
as $$ select private.consume_marketplace_quota(action); $$;
revoke all on function public.consume_marketplace_quota(text) from public,anon;
grant execute on function public.consume_marketplace_quota(text) to authenticated;

create function private.limit_marketplace_posts()
returns trigger language plpgsql security invoker set search_path=pg_catalog as $$
begin
  if current_user in ('anon','authenticated') then
    if not private.consume_marketplace_quota(case when tg_table_name='car_listings' then 'listing' else 'inquiry' end) then
      raise exception 'Достигнат е лимитът. Опитай по-късно.' using errcode='P0001';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.limit_marketplace_posts() from public,anon,authenticated;
create trigger limit_listing_inserts before insert on public.car_listings for each row execute function private.limit_marketplace_posts();
create trigger limit_inquiry_inserts before insert on public.listing_inquiries for each row execute function private.limit_marketplace_posts();

-- Original bytes must not bypass the verified upload function.
-- Activate the restrictive policy separately AFTER the updated UI is live.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
  if not exists(select 1 from vault.secrets where name='mmc-backup-token') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'mmc-backup-token','Internal backup job only');
  end if;
end $$;
create table private.backup_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check(status in ('running','success','failed')),
  archive_path text,
  error text
);
alter table private.backup_runs enable row level security;
revoke all on private.backup_runs from public,anon,authenticated;
grant select,insert,update on private.backup_runs to service_role;

create function private.marketplace_backup_snapshot(job_token text)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare result jsonb;
begin
  if job_token is null or not exists(select 1 from vault.decrypted_secrets where name='mmc-backup-token' and decrypted_secret=job_token) then
    raise exception 'Invalid job token' using errcode='42501';
  end if;
  select jsonb_build_object(
    'format','mmc-auto-backup-v1','created_at',now(),
    'car_listings',coalesce((select jsonb_agg(to_jsonb(l)) from public.car_listings l),'[]'::jsonb),
    'listing_inquiries',coalesce((select jsonb_agg(to_jsonb(i)) from public.listing_inquiries i),'[]'::jsonb),
    'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'email_confirmed_at',u.email_confirmed_at,'created_at',u.created_at,'app_metadata',u.raw_app_meta_data)) from auth.users u),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function private.marketplace_backup_snapshot(text) from public,anon,authenticated;
grant execute on function private.marketplace_backup_snapshot(text) to service_role;
create function public.marketplace_backup_snapshot(job_token text)
returns jsonb language sql security invoker set search_path=pg_catalog
as $$ select private.marketplace_backup_snapshot(job_token); $$;
revoke all on function public.marketplace_backup_snapshot(text) from public,anon,authenticated;
grant execute on function public.marketplace_backup_snapshot(text) to service_role;

create function private.marketplace_backup_log(run_id uuid, run_status text, path text, failure text)
returns uuid language plpgsql security definer set search_path=pg_catalog as $$
declare result uuid;
begin
  if run_id is null and run_status='running' then
    insert into private.backup_runs(status) values('running') returning id into result;
  elsif run_id is not null and run_status in ('success','failed') then
    update private.backup_runs set status=run_status,finished_at=now(),archive_path=path,error=left(failure,500) where id=run_id and status='running' returning id into result;
  else raise exception 'Invalid backup status'; end if;
  return result;
end; $$;
revoke all on function private.marketplace_backup_log(uuid,text,text,text) from public,anon,authenticated;
grant execute on function private.marketplace_backup_log(uuid,text,text,text) to service_role;
create function public.marketplace_backup_log(run_id uuid, run_status text, path text, failure text)
returns uuid language sql security invoker set search_path=pg_catalog
as $$ select private.marketplace_backup_log(run_id,run_status,path,failure); $$;
revoke all on function public.marketplace_backup_log(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.marketplace_backup_log(uuid,text,text,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('marketplace-backups','marketplace-backups',false,67108864,array['application/gzip','application/octet-stream'])
on conflict(id) do nothing;
-- Intentionally no user storage policies: service-role only.
select cron.schedule('mmc-marketplace-daily-backup','0 1 * * *',
  $job$ select net.http_post(
    url:='https://jnsdjmtaudosxoybiofm.supabase.co/functions/v1/marketplace-backup',
    headers:=jsonb_build_object('Content-Type','application/json','x-backup-token',(select decrypted_secret from vault.decrypted_secrets where name='mmc-backup-token')),
    body:='{}'::jsonb,timeout_milliseconds:=120000);
  $job$);
select cron.schedule('mmc-quota-cleanup','15 1 * * *',
  $job$ delete from private.marketplace_quotas where bucket < now()-interval '2 days'; $job$);
