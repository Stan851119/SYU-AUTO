-- Allow the owner to remove a published listing from the public catalog.
-- Keep its record and inquiries for the owner's account.
create policy "Sellers can archive their published listings"
  on public.car_listings for update to authenticated
  using (seller_id = (select auth.uid()) and status = 'active')
  with check (seller_id = (select auth.uid()) and status = 'archived');
