import type { MetadataRoute } from "next";

const publicPaths = [
  "/",
  "/projects/pass-system",
  "/projects/onyx-cleaning",
  "/legal/privacy",
  "/legal/brief-consent",
  "/legal/cookies",
  "/legal/client-terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPaths.map(path => ({ url: new URL(path, "https://ianep.ru").toString() }));
}
