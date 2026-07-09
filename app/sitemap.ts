import type { MetadataRoute } from "next";
import { desc } from "drizzle-orm";

import { getDb } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { BASE_URL } from "@/lib/seo";
import { posterArtistSlug } from "@/lib/utils";

/**
 * Public archive sitemap. A single file is plenty at the current scale
 * (well under the 50k-URL limit); if the archive ever grows past that,
 * split into sitemap-shows/posters/etc. index files. Only canonical
 * public records are included — no auth, admin, api, or personal routes.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${BASE_URL}${path}`,
    lastModified: lastModified ?? new Date(),
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  });

  const staticRoutes = [
    "/",
    "/explore",
    "/shows",
    "/posters",
    "/artists",
    "/poster-artists",
    "/venues",
    "/about",
  ].map((path) => url(path));

  const db = getDb();
  if (!db) return staticRoutes;

  const dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const [posters, artists, venues, showPosters, designers] = await Promise.all([
      db.select({ id: t.posters.id }).from(t.posters).limit(10000),
      db.select({ id: t.artists.id }).from(t.artists).limit(10000),
      db.select({ id: t.venues.id }).from(t.venues).limit(10000),
      // Only shows that carry a poster (the public show database's bar for
      // "documented enough to be worth indexing") keeps thin pages out.
      db
        .select({ id: t.posters.showId })
        .from(t.posters)
        .orderBy(desc(t.posters.year))
        .limit(10000),
      db.select({ designer: t.posters.designer }).from(t.posters).limit(10000),
    ]);
    for (const p of posters) dynamicRoutes.push(url(`/posters/${p.id}`));
    for (const a of artists) dynamicRoutes.push(url(`/artists/${a.id}`));
    for (const v of venues) dynamicRoutes.push(url(`/venues/${v.id}`));
    const showIds = new Set(
      showPosters.map((s) => s.id).filter((id): id is string => Boolean(id)),
    );
    for (const id of showIds) dynamicRoutes.push(url(`/shows/${id}`));
    const artistSlugs = new Set(
      designers
        .map((d) => d.designer)
        .filter((n): n is string => Boolean(n) && n.toLowerCase() !== "unknown")
        .map((n) => posterArtistSlug(n))
        .filter(Boolean),
    );
    for (const slug of artistSlugs)
      dynamicRoutes.push(url(`/poster-artists/${slug}`));
  } catch (error) {
    console.warn("[sitemap] dynamic route query failed:", error);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
