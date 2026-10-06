-- Seller edits keep the listing identity and return it to moderation.
create policy "Sellers can edit listings for review"
  on public.car_listings for update to authenticated
  using (seller_id = (select auth.uid()) and status in ('pending', 'active'))
  with check (seller_id = (select auth.uid()) and status = 'pending');

create policy "Seller uploads photos to own active listing"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'car-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.car_listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.seller_id = (select auth.uid()) and l.status = 'active'
    )
  );

-- Failed uploads may be cleaned up without deleting published photos.
create policy "Seller deletes unreferenced active listing photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'car-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.car_listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.seller_id = (select auth.uid()) and l.status = 'active'
        and not (name = any(l.photo_paths))
    )
  );

create function public.preserve_listing_identity_and_timestamp()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if new.id is distinct from old.id
     or new.seller_id is distinct from old.seller_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Listing identity cannot be changed';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.preserve_listing_identity_and_timestamp() from public, anon, authenticated;
create trigger preserve_listing_identity_and_timestamp
  before update on public.car_listings
  for each row execute function public.preserve_listing_identity_and_timestamp();
