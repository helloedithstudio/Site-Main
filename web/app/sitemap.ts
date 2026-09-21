import type { MetadataRoute } from "next";
import { seo } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${seo.baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${seo.baseUrl}/legion`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${seo.baseUrl}/docs`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
