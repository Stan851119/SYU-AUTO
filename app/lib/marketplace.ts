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
  emission_class: string | null;
  co2_g_km: number | null;
  body: string;
  city: string;
  contact_phone: string | null;
  details: string;
  photo_paths: string[];
  status: "draft" | "pending" | "active" | "archived";
  updated_at: string;
  imageUrl?: string;
  imageUrls?: string[];
};

export type InquiryRow = {
  id: string;
  listing_id: string;
  buyer_id: string;
  contact_email: string;
  message: string;
  created_at: string;
};

export async function loadListingInquiries(listingIds: string[]) {
  if (!marketplace || !listingIds.length) return [];
  const { data, error } = await marketplace.from("listing_inquiries")
    .select("id,listing_id,buyer_id,contact_email,message,created_at")
    .in("listing_id", listingIds).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return (data || []) as InquiryRow[];
}

async function withImages(rows: ListingRow[]) {
  if (!marketplace) return rows;
  return Promise.all(rows.map(async (row) => {
    const signed = await Promise.all(row.photo_paths.map(async (path) => {
      const { data } = await marketplace.storage.from("car-photos").createSignedUrl(path, 3600);
      return data?.signedUrl;
    }));
    const imageUrls = signed.filter((url): url is string => !!url);
    return { ...row, imageUrl: imageUrls[0], imageUrls };
  }));
}

export async function loadActiveListings() {
  if (!marketplace) return [];
  const { data, error } = await marketplace.from("car_listings")
    .select("id,seller_id,make,model,year,mileage_km,price_eur,fuel,gearbox,emission_class,co2_g_km,body,city,contact_phone,details,photo_paths,status,updated_at")
    .eq("status", "active").order("created_at", { ascending: false }).limit(60);
  if (error) throw error;
  return withImages((data || []) as ListingRow[]);
}

export async function loadMyListings(sellerId: string) {
  if (!marketplace) return [];
  const { data, error } = await marketplace.from("car_listings")
    .select("id,seller_id,make,model,year,mileage_km,price_eur,fuel,gearbox,emission_class,co2_g_km,body,city,contact_phone,details,photo_paths,status,updated_at")
    .eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return withImages((data || []) as ListingRow[]);
}

export async function loadPendingListings() {
  if (!marketplace) return [];
  const { data, error } = await marketplace.from("car_listings")
    .select("id,seller_id,make,model,year,mileage_km,price_eur,fuel,gearbox,emission_class,co2_g_km,body,city,contact_phone,details,photo_paths,status,updated_at")
    .eq("status", "pending").order("created_at", { ascending: true }).limit(100);
  if (error) throw error;
  return withImages((data || []) as ListingRow[]);
}
