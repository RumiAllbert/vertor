import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-05-11");

  return [
    {
      url: SITE_URL,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/app`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
