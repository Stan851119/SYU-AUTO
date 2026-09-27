import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://syu-auto.vercel.app/", changeFrequency: "daily", priority: 1 }];
}
