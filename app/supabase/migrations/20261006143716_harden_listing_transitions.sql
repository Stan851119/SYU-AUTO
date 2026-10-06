-- RLS UPDATE policies combine their old/new row checks independently.
-- Enforce the intended transition against BOTH rows in a trigger as well.
create or replace function public.preserve_listing_identity_and_timestamp()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if new.id is distinct from old.id
     or new.seller_id is distinct from old.seller_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Listing identity cannot be changed';
  end if;
  if current_user in ('anon', 'authenticated')
     and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    if not (
      (old.status = 'draft' and new.status in ('draft', 'pending'))
      or (old.status in ('pending', 'active') and new.status = 'pending')
      or (old.status = 'active' and new.status = 'archived')
    ) then
      raise exception 'Invalid seller listing transition' using errcode = '42501';
    end if;
    if new.status = 'archived' and
       (to_jsonb(new) - 'status' - 'updated_at') is distinct from
       (to_jsonb(old) - 'status' - 'updated_at') then
      raise exception 'Archiving cannot change listing contents' using errcode = '42501';
    end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.preserve_listing_identity_and_timestamp() from public, anon, authenticated;

create function public.validate_listing_photo_paths()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if exists (
    select 1 from unnest(new.photo_paths) as p
    where p is null or p !~ (
      '^' || new.seller_id::text || '/' || new.id::text ||
      '/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
    )
  ) then
    raise exception 'Photos must belong to this seller and listing' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_listing_photo_paths() from public, anon, authenticated;
create trigger validate_listing_photo_paths
  before insert or update of photo_paths, seller_id, id on public.car_listings
  for each row execute function public.validate_listing_photo_paths();
