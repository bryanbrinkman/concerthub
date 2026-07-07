/**
 * Expresso Beans integration (server-side only).
 *
 * Expresso Beans (expressobeans.com) has no public API, so this module does a
 * light, cached, server-side read of an item's public detail page and pulls
 * out the poster image plus the canonical item URL. It is strictly
 * best-effort: any failure (item id unset, page unreachable, markup changed)
 * returns nothing and the UI falls back to generated gradient artwork.
 *
 * To activate it for a poster, set `expressoBeansId` in lib/data.ts to the
 * numeric id from the item page URL, e.g.
 * https://www.expressobeans.com/public/detail.php/331691 -> 331691.
 */

import type { Poster } from "./types";

const EB_BASE = "https://www.expressobeans.com";
/** EB pages are effectively static — refresh weekly. */
const REVALIDATE_SECONDS = 60 * 60 * 24 * 7;

export function expressoBeansItemUrl(id: number): string {
  return `${EB_BASE}/public/detail.php/${id}`;
}

function absolutize(src: string): string {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  return `${EB_BASE}${src.startsWith("/") ? "" : "/"}${src}`;
}

/** Pull the primary image URL out of an EB item page's HTML. */
function extractImageUrl(html: string): string | undefined {
  // Prefer the og:image meta tag (attribute order varies, so try both).
  const og =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ) ??
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    );
  if (og?.[1]) return absolutize(og[1]);

  // Fall back to the first hosted artwork image on the page.
  const img = html.match(
    /<img[^>]+src=["']([^"']*(?:dbimages|artimages|images\/art)[^"']*)["']/i,
  );
  if (img?.[1]) return absolutize(img[1]);

  return undefined;
}

export interface ExpressoBeansItem {
  url: string;
  imageUrl?: string;
}

/** Fetch + parse a single EB item page. Returns undefined on any failure. */
export async function getExpressoBeansItem(
  id: number,
): Promise<ExpressoBeansItem | undefined> {
  const url = expressoBeansItemUrl(id);
  try {
    const res = await fetch(url, {
      headers: {
        // Identify ourselves politely; EB serves these pages publicly.
        "User-Agent": "ConcertCollect/0.1 (personal live-music archive)",
        Accept: "text/html",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      console.warn(`[expressobeans] item ${id}: HTTP ${res.status}`);
      return undefined;
    }
    const html = await res.text();
    return { url, imageUrl: extractImageUrl(html) };
  } catch (error) {
    console.warn(`[expressobeans] item ${id} fetch failed:`, error);
    return undefined;
  }
}

/** A poster plus whatever Expresso Beans could tell us about it. */
export interface EnrichedPoster extends Poster {
  /** Direct link to the EB item page (homepage when no id is set). */
  ebUrl: string;
  /** Real artwork image, when EB (or the seed) provides one. */
  resolvedImageUrl?: string;
}

/**
 * Attach EB imagery + deep link to a poster. Seeded `imageUrl` wins over the
 * scraped one so hand-curated art can't be clobbered.
 */
export async function enrichPoster(poster: Poster): Promise<EnrichedPoster>;
export async function enrichPoster(
  poster: Poster | undefined,
): Promise<EnrichedPoster | undefined>;
export async function enrichPoster(
  poster: Poster | undefined,
): Promise<EnrichedPoster | undefined> {
  if (!poster) return undefined;

  let ebUrl = EB_BASE;
  let resolvedImageUrl = poster.imageUrl;

  if (poster.expressoBeansId) {
    ebUrl = expressoBeansItemUrl(poster.expressoBeansId);
    if (!resolvedImageUrl) {
      const item = await getExpressoBeansItem(poster.expressoBeansId);
      resolvedImageUrl = item?.imageUrl;
    }
  }

  return { ...poster, ebUrl, resolvedImageUrl };
}

export async function enrichPosters(posters: Poster[]): Promise<EnrichedPoster[]> {
  return Promise.all(posters.map((p) => enrichPoster(p)));
}
