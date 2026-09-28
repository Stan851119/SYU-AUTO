import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://www.mmcauto.bg/", changeFrequency: "daily", priority: 1 }];
}
