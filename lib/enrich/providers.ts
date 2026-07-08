/**
 * The provider registry for the Show Enrichment Engine.
 *
 * Structured data: setlist.fm, MusicBrainz, Ticketmaster.
 * Media:           YouTube.
 * Poster images:   Google Programmable Search (image mode).
 * Marketplace:     eBay Browse API (references only — listing imagery is
 *                  never copied into the canonical poster archive).
 *
 * Licensed-database rule: no scraping of Concert Archives, GoCollect, or
 * similar; those can appear only as user-pasted reference links.
 */

import { normalizeText, scoreText, type EventFingerprint } from "./fingerprint";
import type { EnrichmentProvider, NewCandidate, ProviderContext } from "./types";

const DAY = 24 * 60 * 60;

/* ------------------------------------------------------------------ */
/* setlist.fm — lineup + per-performer setlists from sets at the venue  */
/* ------------------------------------------------------------------ */

interface SfmSet {
  id: string;
  eventDate: string;
  url?: string;
  artist?: { name?: string };
  venue?: { name?: string; city?: { name?: string } };
  sets?: { set?: Array<{ song?: unknown[] }> };
}

const toSfmDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
};

/** Dates of a run, capped so multi-week events don't burn the API. */
function eventDates(fp: EventFingerprint, cap = 4): string[] {
  const dates = [fp.startDate];
  if (fp.endDate && fp.endDate > fp.startDate) {
    const start = new Date(`${fp.startDate}T00:00:00Z`);
    for (let i = 1; i < cap; i++) {
      const next = new Date(start.getTime() + i * 86400000)
        .toISOString()
        .slice(0, 10);
      if (next > fp.endDate) break;
      dates.push(next);
    }
  }
  return dates;
}

const setlistFmProvider: EnrichmentProvider = {
  name: "setlistfm",
  label: "setlist.fm",
  types: ["performer", "event_meta"],
  requiredEnv: ["SETLISTFM_API_KEY"],
  async run(fp, ctx) {
    const apiKey = process.env.SETLISTFM_API_KEY as string;
    const candidates: NewCandidate[] = [];
    for (const date of eventDates(fp)) {
      const params = new URLSearchParams({ date: toSfmDate(date), p: "1" });
      // Venue narrows best; fall back to city for festival grounds whose
      // venue names differ between sources.
      if (fp.venue) params.set("venueName", fp.venue);
      else if (fp.city) params.set("cityName", fp.city);
      const data = await ctx.cached(
        `sets:${params.toString()}`,
        30 * DAY,
        async () => {
          const res = await fetch(
            `https://api.setlist.fm/rest/1.0/search/setlists?${params}`,
            { headers: { "x-api-key": apiKey, Accept: "application/json" } },
          );
          if (res.status === 404) return { setlist: [] };
          if (!res.ok) throw new Error(`setlist.fm HTTP ${res.status}`);
          return (await res.json()) as { setlist?: SfmSet[] };
        },
      );
      for (const set of data.setlist ?? []) {
        const name = set.artist?.name;
        if (!name) continue;
        const context = `${name} ${set.venue?.name ?? ""} ${set.venue?.city?.name ?? ""} ${date}`;
        const { confidence, reasons } = scoreText(context, fp);
        candidates.push({
          kind: "performer",
          valueKey: normalizeText(name),
          value: {
            name,
            role: "festival_performer",
            setlistFmId: set.id,
            setlistFmUrl: set.url,
            songCount: (set.sets?.set ?? []).reduce(
              (n, s) => n + (s.song?.length ?? 0),
              0,
            ),
            date,
          },
          sourceUrl: set.url,
          confidence: Math.min(97, confidence + 25), // same venue+date is a strong signal
          reasons: ["Set played at this venue on this date", ...reasons],
        });
      }
    }
    return candidates;
  },
};

/* ------------------------------------------------------------------ */
/* MusicBrainz — open event + artist database (no key; UA required)     */
/* ------------------------------------------------------------------ */

interface MbEvent {
  id: string;
  name: string;
  score?: number;
  "life-span"?: { begin?: string; end?: string };
}

const MB_HEADERS = {
  Accept: "application/json",
  "User-Agent": "ConcertCollect/1.0 (https://concertcollect.com)",
};

const musicBrainzProvider: EnrichmentProvider = {
  name: "musicbrainz",
  label: "MusicBrainz",
  types: ["event_meta", "reference"],
  requiredEnv: [],
  async run(fp, ctx) {
    const query = fp.eventName
      ? `${fp.eventName} ${fp.year}`
      : `${fp.title} ${fp.venue ?? ""} ${fp.year}`;
    const data = await ctx.cached(`event:${normalizeText(query)}`, 30 * DAY, async () => {
      const res = await fetch(
        `https://musicbrainz.org/ws/2/event?query=${encodeURIComponent(query)}&fmt=json&limit=5`,
        { headers: MB_HEADERS },
      );
      if (!res.ok) throw new Error(`MusicBrainz HTTP ${res.status}`);
      return (await res.json()) as { events?: MbEvent[] };
    });
    return (data.events ?? []).map((event) => {
      const begin = event["life-span"]?.begin;
      const end = event["life-span"]?.end;
      const { confidence, reasons } = scoreText(
        `${event.name} ${begin ?? ""}`,
        fp,
      );
      const dateBonus = begin?.slice(0, 10) === fp.startDate ? 20 : 0;
      return {
        kind: "event_meta" as const,
        valueKey: `mb:${event.id}`,
        value: {
          name: event.name,
          startDate: begin,
          endDate: end,
          musicBrainzId: event.id,
        },
        sourceUrl: `https://musicbrainz.org/event/${event.id}`,
        confidence: Math.min(97, confidence + dateBonus),
        reasons: dateBonus ? ["Exact start date", ...reasons] : reasons,
      };
    });
  },
};

/* ------------------------------------------------------------------ */
/* Ticketmaster Discovery — event metadata (mostly recent/upcoming)     */
/* ------------------------------------------------------------------ */

interface TmEvent {
  id: string;
  name: string;
  url?: string;
  dates?: { start?: { localDate?: string } };
  _embedded?: {
    venues?: Array<{ name?: string; city?: { name?: string } }>;
    attractions?: Array<{ name?: string }>;
  };
}

const ticketmasterProvider: EnrichmentProvider = {
  name: "ticketmaster",
  label: "Ticketmaster",
  types: ["event_meta", "performer"],
  requiredEnv: ["TICKETMASTER_API_KEY"],
  async run(fp, ctx) {
    const apiKey = process.env.TICKETMASTER_API_KEY as string;
    const keyword = fp.eventName ?? fp.title;
    const params = new URLSearchParams({
      keyword,
      apikey: apiKey,
      size: "5",
    });
    if (fp.city) params.set("city", fp.city);
    const data = await ctx.cached(
      `events:${normalizeText(keyword)}:${fp.city ?? ""}`,
      7 * DAY,
      async () => {
        const res = await fetch(
          `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
        );
        if (!res.ok) throw new Error(`Ticketmaster HTTP ${res.status}`);
        return (await res.json()) as { _embedded?: { events?: TmEvent[] } };
      },
    );
    const candidates: NewCandidate[] = [];
    for (const event of data._embedded?.events ?? []) {
      const venue = event._embedded?.venues?.[0];
      const context = `${event.name} ${venue?.name ?? ""} ${venue?.city?.name ?? ""} ${event.dates?.start?.localDate ?? ""}`;
      const { confidence, reasons } = scoreText(context, fp);
      candidates.push({
        kind: "event_meta",
        valueKey: `tm:${event.id}`,
        value: {
          name: event.name,
          startDate: event.dates?.start?.localDate,
          venue: venue?.name,
          city: venue?.city?.name,
          ticketmasterId: event.id,
        },
        sourceUrl: event.url,
        confidence,
        reasons,
      });
      for (const act of event._embedded?.attractions ?? []) {
        if (!act.name) continue;
        candidates.push({
          kind: "performer",
          valueKey: normalizeText(act.name),
          value: { name: act.name, role: "unknown" },
          sourceUrl: event.url,
          confidence: Math.min(94, confidence),
          reasons: ["Billed on the matched Ticketmaster event", ...reasons],
        });
      }
    }
    return candidates;
  },
};

/* ------------------------------------------------------------------ */
/* YouTube Data API — official embeds only, never rehosted              */
/* ------------------------------------------------------------------ */

interface YtItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string } };
  };
}

const youTubeProvider: EnrichmentProvider = {
  name: "youtube",
  label: "YouTube",
  types: ["video"],
  requiredEnv: ["YOUTUBE_API_KEY"],
  async run(fp, ctx) {
    const apiKey = process.env.YOUTUBE_API_KEY as string;
    const headliner = fp.performers[0];
    const queries = [
      fp.eventName ? `${fp.eventName} ${fp.year}` : undefined,
      headliner && fp.venue
        ? `${headliner} ${fp.venue} ${fp.year}`
        : undefined,
      fp.eventName && headliner
        ? `${headliner} live ${fp.eventName}`
        : headliner
          ? `${headliner} live ${fp.year} full set`
          : undefined,
    ].filter((q): q is string => Boolean(q));

    const candidates = new Map<string, NewCandidate>();
    for (const query of queries.slice(0, 3)) {
      const data = await ctx.cached(`search:${normalizeText(query)}`, 7 * DAY, async () => {
        const params = new URLSearchParams({
          part: "snippet",
          type: "video",
          maxResults: "8",
          q: query,
          key: apiKey,
        });
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?${params}`,
        );
        if (!res.ok) throw new Error(`YouTube HTTP ${res.status}`);
        return (await res.json()) as { items?: YtItem[] };
      });
      for (const item of data.items ?? []) {
        const videoId = item.id?.videoId;
        const title = item.snippet?.title;
        if (!videoId || !title) continue;
        const { confidence, reasons } = scoreText(title, fp);
        const existing = candidates.get(videoId);
        if (existing && existing.confidence >= confidence) continue;
        candidates.set(videoId, {
          kind: "video",
          valueKey: videoId,
          value: {
            videoId,
            title,
            channel: item.snippet?.channelTitle,
            thumbnail: item.snippet?.thumbnails?.medium?.url,
            publishedAt: item.snippet?.publishedAt,
            query,
          },
          sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
          confidence,
          reasons,
        });
      }
    }
    return [...candidates.values()];
  },
};

/* ------------------------------------------------------------------ */
/* Web image search (Google Programmable Search) — poster candidates    */
/* ------------------------------------------------------------------ */

interface CseItem {
  title?: string;
  link?: string;
  displayLink?: string;
  image?: {
    contextLink?: string;
    width?: number;
    height?: number;
  };
}

const webImageProvider: EnrichmentProvider = {
  name: "images",
  label: "Image search",
  types: ["poster_image"],
  requiredEnv: ["GOOGLE_CSE_KEY", "GOOGLE_CSE_ID"],
  async run(fp, ctx) {
    const key = process.env.GOOGLE_CSE_KEY as string;
    const cx = process.env.GOOGLE_CSE_ID as string;
    const headliner = fp.performers[0];
    const queries = [
      fp.eventName ? `${fp.eventName} ${fp.year} poster` : undefined,
      headliner && fp.venue
        ? `${headliner} ${fp.venue} ${fp.year} poster`
        : undefined,
      !fp.eventName && headliner && fp.city
        ? `${headliner} gig poster ${fp.city} ${fp.year}`
        : undefined,
    ].filter((q): q is string => Boolean(q));

    const seen = new Map<string, { candidate: NewCandidate; sources: Set<string> }>();
    for (const query of queries.slice(0, 3)) {
      const data = await ctx.cached(`image:${normalizeText(query)}`, 30 * DAY, async () => {
        const params = new URLSearchParams({
          key,
          cx,
          q: query,
          searchType: "image",
          num: "8",
        });
        const res = await fetch(
          `https://www.googleapis.com/customsearch/v1?${params}`,
        );
        if (!res.ok) throw new Error(`Image search HTTP ${res.status}`);
        return (await res.json()) as { items?: CseItem[] };
      });
      for (const item of data.items ?? []) {
        if (!item.link) continue;
        const context = `${item.title ?? ""} ${item.image?.contextLink ?? ""}`;
        const { confidence, reasons } = scoreText(context, fp);
        const entry = seen.get(item.link);
        if (entry) {
          // Same image discovered via an independent query/source — a
          // stand-in for perceptual-hash agreement. Boost confidence.
          entry.sources.add(item.displayLink ?? query);
          entry.candidate.confidence = Math.min(
            97,
            entry.candidate.confidence + 8,
          );
          entry.candidate.reasons = [
            `Seen in ${entry.sources.size} independent sources`,
            ...entry.candidate.reasons.filter((r) => !r.startsWith("Seen in")),
          ];
          continue;
        }
        seen.set(item.link, {
          sources: new Set([item.displayLink ?? query]),
          candidate: {
            kind: "poster_image",
            // Never official from web search alone.
            candidateType: "possible_poster",
            valueKey: item.link,
            value: {
              imageUrl: item.link,
              sourceUrl: item.image?.contextLink,
              domain: item.displayLink,
              title: item.title,
              width: item.image?.width,
              height: item.image?.height,
              query,
            },
            sourceUrl: item.image?.contextLink ?? item.link,
            confidence,
            reasons,
          },
        });
      }
    }
    return [...seen.values()].map((entry) => entry.candidate);
  },
};

/* ------------------------------------------------------------------ */
/* eBay Browse API — marketplace references (never canonical posters)   */
/* ------------------------------------------------------------------ */

interface EbayItem {
  itemId?: string;
  title?: string;
  itemWebUrl?: string;
  image?: { imageUrl?: string };
  price?: { value?: string; currency?: string };
  buyingOptions?: string[];
}

async function ebayToken(ctx: ProviderContext): Promise<string> {
  const data = await ctx.cached("oauth-token", 90 * 60, async () => {
    const basic = Buffer.from(
      `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`,
    ).toString("base64");
    const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
    });
    if (!res.ok) throw new Error(`eBay auth HTTP ${res.status}`);
    return (await res.json()) as { access_token: string };
  });
  return data.access_token;
}

const ebayProvider: EnrichmentProvider = {
  name: "ebay",
  label: "eBay",
  types: ["marketplace"],
  requiredEnv: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"],
  async run(fp, ctx) {
    const token = await ebayToken(ctx);
    const headliner = fp.performers[0];
    const query = fp.eventName
      ? `${fp.eventName} ${fp.year} poster`
      : `${headliner ?? fp.title} ${fp.venue ?? ""} ${fp.year} concert poster`;
    const data = await ctx.cached(
      `listings:${normalizeText(query)}`,
      12 * 60 * 60, // active listings go stale fast — short cache
      async () => {
        const params = new URLSearchParams({ q: query, limit: "10" });
        const res = await fetch(
          `https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
            },
          },
        );
        if (!res.ok) throw new Error(`eBay HTTP ${res.status}`);
        return (await res.json()) as { itemSummaries?: EbayItem[] };
      },
    );
    return (data.itemSummaries ?? []).flatMap((item) => {
      if (!item.itemId || !item.title || !item.itemWebUrl) return [];
      const { confidence, reasons } = scoreText(item.title, fp);
      return [
        {
          kind: "marketplace" as const,
          valueKey: item.itemId,
          value: {
            title: item.title,
            url: item.itemWebUrl,
            image: item.image?.imageUrl,
            price: item.price?.value,
            currency: item.price?.currency,
            listingType: item.buyingOptions?.join(", "),
            query,
          },
          sourceUrl: item.itemWebUrl,
          confidence,
          reasons,
        },
      ];
    });
  },
};

/* ------------------------------------------------------------------ */

export const PROVIDERS: EnrichmentProvider[] = [
  setlistFmProvider,
  musicBrainzProvider,
  ticketmasterProvider,
  youTubeProvider,
  webImageProvider,
  ebayProvider,
];

export const providerByName = (name: string) =>
  PROVIDERS.find((p) => p.name === name);
