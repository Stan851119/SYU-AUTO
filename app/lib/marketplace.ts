import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Publishable/anon key only. Database RLS remains the authorization boundary.
export const marketplace = url && key ? createClient(url, key) : null;

export type ListingRow = {
  id: string;
  seller_id: string;
  make: string;
  model: string;
  year: number;
  mileage_km: number;
  price_eur: number;
  fuel: string;
  gearbox: string;
  body: string;
  city: string;
  details: string;
  photo_paths: string[];
  status: "draft" | "pending" | "active" | "archived";
  imageUrl?: string;
};

async function withImages(rows: ListingRow[]) {
  if (!marketplace) return rows;
  return Promise.all(rows.map(async (row) => {
    const path = row.photo_paths[0];
    const signed = path ? await marketplace.storage.from("car-photos").createSignedUrl(path, 3600) : null;
    return { ...row, imageUrl: signed?.data?.signedUrl || undefined };
  }));
}

export async function loadActiveListings() {
  if (!marketplace) return [];
  const { data, error } = await marketplace.from("car_listings")
    .select("id,seller_id,make,model,year,mileage_km,price_eur,fuel,gearbox,body,city,details,photo_paths,status")
    .eq("status", "active").order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return withImages((data || []) as ListingRow[]);
}

export async function loadMyListings(sellerId: string) {
  if (!marketplace) return [];
  const { data, error } = await marketplace.from("car_listings")
    .select("id,seller_id,make,model,year,mileage_km,price_eur,fuel,gearbox,body,city,details,photo_paths,status")
    .eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return withImages((data || []) as ListingRow[]);
}

export async function loadPendingListings() {
  if (!marketplace) return [];
  const { data, error } = await marketplace.from("car_listings")
    .select("id,seller_id,make,model,year,mileage_km,price_eur,fuel,gearbox,body,city,details,photo_paths,status")
    .eq("status", "pending").order("created_at", { ascending: true }).limit(100);
  if (error) throw error;
  return withImages((data || []) as ListingRow[]);
}
