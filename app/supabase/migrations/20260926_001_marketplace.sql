-- SYU Auto marketplace foundation.
-- Apply to a new Supabase project only after reviewing and testing the policies.
-- No service-role key is used by the browser application.

create table if not exists public.car_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  make text not null check (char_length(btrim(make)) between 1 and 60),
  model text not null check (char_length(btrim(model)) between 1 and 80),
  year integer not null check (year between 1950 and 2030),
  mileage_km integer not null check (mileage_km between 0 and 3000000),
  price_eur integer not null check (price_eur between 1 and 10000000),
  fuel text not null check (fuel in ('Бензин', 'Дизел', 'Хибрид', 'Електрически')),
  gearbox text not null check (gearbox in ('Ръчна', 'Автоматична')),
  body text not null check (body in ('Хечбек', 'Седан', 'Комби', 'SUV / Джип', 'Купе', 'Кабрио', 'Бусове')),
  city text not null check (char_length(btrim(city)) between 1 and 80),
  details text not null default '' check (char_length(details) <= 5000),
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 12),
  status text not null default 'draft' check (status in ('draft', 'pending', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists car_listings_status_created_idx on public.car_listings (status, created_at desc);
create index if not exists car_listings_seller_idx on public.car_listings (seller_id, created_at desc);

alter table public.car_listings enable row level security;
revoke all on public.car_listings from anon, authenticated;
grant select on public.car_listings to anon;
grant select, insert, update, delete on public.car_listings to authenticated;

-- Public visitors see only moderated, active listings.
create policy "Public can read active listings"
  on public.car_listings for select to anon, authenticated
  using (status = 'active');

-- Sellers can see their own drafts and submissions.
create policy "Sellers can read their listings"
  on public.car_listings for select to authenticated
  using (seller_id = (select auth.uid()));

create policy "Sellers can create drafts or submissions"
  on public.car_listings for insert to authenticated
  with check (seller_id = (select auth.uid()) and status in ('draft', 'pending'));

-- Sellers submit drafts for review; submitted and active listings cannot be changed.
create policy "Sellers can submit their drafts"
  on public.car_listings for update to authenticated
  using (seller_id = (select auth.uid()) and status = 'draft')
  with check (seller_id = (select auth.uid()) and status in ('draft', 'pending'));

create policy "Sellers can remove their drafts or submissions"
  on public.car_listings for delete to authenticated
  using (seller_id = (select auth.uid()) and status in ('draft', 'pending'));

-- Set this claim only from the trusted Supabase Auth Admin API.
-- User-editable metadata must never be accepted as an admin role.
create policy "Admins can read every listing"
  on public.car_listings for select to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can moderate listings"
  on public.car_listings for update to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Private bucket: only owners can read drafts; public can obtain images of active listings.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('car-photos', 'car-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Object paths: <seller-uuid>/<listing-uuid>/<random-filename>.
create policy "Seller uploads photos to own draft"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'car-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.car_listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending')
    )
  );

create policy "Seller reads own photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'car-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Visitors read active listing photos"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'car-photos'
    and exists (
      select 1 from public.car_listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.status = 'active'
        and l.seller_id::text = (storage.foldername(name))[1]
        and name = any(l.photo_paths)
    )
  );

-- Moderators need access to private photos before approving an ad.
create policy "Admins read submitted listing photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'car-photos'
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and exists (
      select 1 from public.car_listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.status = 'pending'
        and l.seller_id::text = (storage.foldername(name))[1]
        and name = any(l.photo_paths)
    )
  );

create policy "Seller deletes own unpublished photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'car-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and exists (
      select 1 from public.car_listings l
      where l.id::text = (storage.foldername(name))[2]
        and l.seller_id = (select auth.uid())
        and l.status in ('draft', 'pending')
    )
  );
