-- Sellers may optionally publish a phone number with an approved listing.
alter table public.car_listings
  add column if not exists contact_phone text
  check (contact_phone is null or contact_phone ~ '^\+[1-9][0-9]{7,14}$');
