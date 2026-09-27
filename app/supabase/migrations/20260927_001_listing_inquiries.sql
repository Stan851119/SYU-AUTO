-- Buyers can send one inquiry per active listing. Only the buyer and the seller
-- can read it; contact_email is the buyer's verified sign-in address.
create table public.listing_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.car_listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  contact_email text not null check (char_length(contact_email) between 3 and 320),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);

create index listing_inquiries_listing_created_idx
  on public.listing_inquiries (listing_id, created_at desc);

alter table public.listing_inquiries enable row level security;
revoke all on public.listing_inquiries from anon, authenticated;
grant select, insert on public.listing_inquiries to authenticated;

create policy "Buyers and sellers read their inquiries"
  on public.listing_inquiries for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or exists (
      select 1 from public.car_listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  );

create policy "Buyers inquire about active listings"
  on public.listing_inquiries for insert to authenticated
  with check (
    buyer_id = (select auth.uid())
    and contact_email = (select auth.jwt() ->> 'email')
    and exists (
      select 1 from public.car_listings l
      where l.id = listing_id and l.status = 'active'
        and l.seller_id <> (select auth.uid())
    )
  );
