/**
 * SEO helpers: canonical metadata + Schema.org JSON-LD builders derived
 * from canonical record data. Keeps titles/descriptions record-specific
 * (never a generic string across thousands of pages) and centralizes the
 * structured-data shapes so every public route stays consistent.
 */

import type { Metadata } from "next";

import { formatShortDate } from "@/lib/utils";

export const SITE = "Concert Collect";
export const BASE_URL = "https://concertcollect.com";

export const canonical = (path: string): string =>
  `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/** "Port Chester, NY, USA" from parts, skipping blanks/dupes. */
export function locationLine(
  city?: string,
  region?: string,
  country?: string,
): string {
  return [city, region, country && country !== region ? country : undefined]
    .filter(Boolean)
    .join(", ");
}

interface RouteMetaInput {
  title: string;
  description: string;
  path: string;
  /** Absolute or app-relative image URL for OG/Twitter cards. */
  image?: string;
  /** Discourage indexing (personal/thin pages). */
  noindex?: boolean;
}

/** Canonical, OG, and Twitter metadata for a public route. */
export function routeMetadata({
  title,
  description,
  path,
  image,
  noindex,
}: RouteMetaInput): Metadata {
  const url = canonical(path);
  const images = image ? [{ url: image }] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE,
      type: "website",
      images,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD builders (plain objects — rendered by <JsonLd>)             */
/* ------------------------------------------------------------------ */

export interface ShowJsonLdInput {
  title: string;
  path: string;
  date: string;
  endDate?: string;
  isFestival?: boolean;
  performers: string[];
  venueName?: string;
  city?: string;
  region?: string;
  country?: string;
  image?: string;
}

export function showJsonLd(input: ShowJsonLdInput): Record<string, unknown> {
  const location = input.venueName
    ? {
        "@type": "Place",
        name: input.venueName,
        address: locationLine(input.city, input.region, input.country) || undefined,
      }
    : undefined;
  return prune({
    "@context": "https://schema.org",
    "@type": input.isFestival ? "Festival" : "MusicEvent",
    name: input.title,
    url: canonical(input.path),
    startDate: input.date,
    endDate: input.endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location,
    image: input.image,
    performer: input.performers.map((name) => ({
      "@type": "MusicGroup",
      name,
    })),
  });
}

export interface PosterJsonLdInput {
  title: string;
  path: string;
  designer?: string;
  year?: number;
  image?: string;
  widthIn?: number;
  heightIn?: number;
  technique?: string;
}

export function posterJsonLd(input: PosterJsonLdInput): Record<string, unknown> {
  return prune({
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: input.title,
    url: canonical(input.path),
    image: input.image,
    creator: input.designer && input.designer !== "Unknown"
      ? { "@type": "Person", name: input.designer }
      : undefined,
    dateCreated: input.year ? String(input.year) : undefined,
    artMedium: input.technique,
    artform: "Concert poster",
    width: input.widthIn
      ? { "@type": "QuantitativeValue", value: input.widthIn, unitText: "inches" }
      : undefined,
    height: input.heightIn
      ? { "@type": "QuantitativeValue", value: input.heightIn, unitText: "inches" }
      : undefined,
  });
}

/** Site identity for the homepage — powers Google's sitelinks search box. */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/shows?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE,
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      "A community archive of live music history — concerts, posters, ticket stubs, and setlists.",
  };
}

export function personJsonLd(
  name: string,
  path: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: canonical(path),
  };
}

export function musicGroupJsonLd(
  name: string,
  path: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name,
    url: canonical(path),
  };
}

export function venueJsonLd(input: {
  name: string;
  path: string;
  city?: string;
  region?: string;
  country?: string;
}): Record<string, unknown> {
  return prune({
    "@context": "https://schema.org",
    "@type": "Place",
    name: input.name,
    url: canonical(input.path),
    address: locationLine(input.city, input.region, input.country) || undefined,
  });
}

/** BreadcrumbList for a public detail route. */
export function breadcrumbJsonLd(
  crumbs: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: canonical(crumb.path),
    })),
  };
}

export function itemListJsonLd(
  name: string,
  items: Array<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: canonical(item.path),
    })),
  };
}

/** A human date range for descriptions ("June 6–8, 2014" / single day). */
export function metaDatePhrase(date: string, endDate?: string): string {
  return endDate && endDate > date
    ? `${formatShortDate(date)} – ${formatShortDate(endDate)}`
    : formatShortDate(date);
}

/** Drop undefined/empty values so JSON-LD stays clean. */
function prune<T extends Record<string, unknown>>(obj: T): T {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (
      value === undefined ||
      value === null ||
      (Array.isArray(value) && value.length === 0)
    ) {
      delete obj[key];
    }
  }
  return obj;
}
