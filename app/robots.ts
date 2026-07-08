import type { MetadataRoute } from "next";

const BASE = "https://concertcollect.com";

/**
 * Crawlers may index the public archive; personal, auth, and write
 * routes are kept out. The public archive IS the SEO strategy, so the
 * detail routes (shows, posters, artists, venues) are deliberately open.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/my-shows",
          "/my-posters",
          "/my-gallery",
          "/collections",
          "/tickets",
          "/merch",
          "/memories",
          "/add/",
          "/edit/",
          "/import",
          "/login",
          "/prints", // Trading Post — personal interest actions
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
