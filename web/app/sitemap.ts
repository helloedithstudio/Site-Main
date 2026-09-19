import type { MetadataRoute } from "next";
import { seo } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${seo.baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${seo.baseUrl}/handbook`, changeFrequency: "monthly", priority: 0.6 },
  ];
}
