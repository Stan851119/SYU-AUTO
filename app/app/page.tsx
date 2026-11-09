import type { Metadata } from "next";
import { loadActiveListing } from "../lib/marketplace";
import MarketplaceHome from "./marketplace-home";

const siteUrl = "https://www.mmcauto.bg";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string | string[] }>;
}): Promise<Metadata> {
  const { listing } = await searchParams;
  if (typeof listing !== "string") return {};

  const car = await loadActiveListing(listing).catch(() => null);
  if (!car) return {};

  const title = `${car.make} ${car.model} — ${new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(car.price_eur)}`;
  const description = `${car.year} г. · ${new Intl.NumberFormat("bg-BG").format(car.mileage_km)} км · ${car.city}`;
  const url = new URL("/", siteUrl);
  url.searchParams.set("listing", car.id);
  const image = car.imageUrl
    ? new URL(`/listing-preview-image/${car.id}`, siteUrl).href
    : undefined;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      siteName: "MMC AUTO",
      locale: "bg_BG",
      url,
      title,
      description,
      images: image ? [{ url: image, alt: `${car.make} ${car.model}` }] : [],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default function HomePage() {
  return <MarketplaceHome />;
}
