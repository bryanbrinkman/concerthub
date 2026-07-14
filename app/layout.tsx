import type { Metadata } from "next";
import type { Session } from "next-auth";

import "./globals.css";
import { auth, authEnabled, googleEnabled, missingAuthEnv } from "@/auth";
import {
  archiveCounts,
  findArtist,
  findVenue,
  getArchive,
  showTitleFor,
} from "@/lib/archive";
import { formatShortDate, posterArtistSlug } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";
import { Onboarding } from "@/components/onboarding";
import { WelcomeSplash } from "@/components/welcome-splash";
import { SearchPalette, type SearchItem } from "@/components/search-palette";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://concertcollect.com"),
  title: {
    default: "Concert Collect",
    template: "%s · Concert Collect",
  },
  description:
    "Your shows. Your story. A personal archive for live music memories — setlists, posters, ticket stubs, and everything you kept.",
  openGraph: {
    title: "Concert Collect",
    description:
      "Your shows. Your story. A personal archive for live music memories.",
    url: "https://concertcollect.com",
    siteName: "Concert Collect",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Concert Collect",
    description:
      "Your shows. Your story. A personal archive for live music memories.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const archive = await getArchive();
  const counts = archiveCounts(archive);
  // auth() renders on every route via this layout — a throw here (malformed
  // JWT, adapter hiccup) would take the whole site down, not just one page.
  // Degrade to signed-out UI instead, mirroring getArchive's demo fallback.
  let session: Session | null = null;
  if (authEnabled) {
    try {
      session = await auth();
    } catch (error) {
      console.warn("[layout] auth() failed — rendering signed-out:", error);
    }
  }

  // ⌘K search index: the viewer's archive + app pages.
  const searchItems: SearchItem[] = [
    ...archive.shows.map((show) => ({
      label: `${showTitleFor(archive, show)} — ${
        findVenue(archive, show.venueId)?.name ?? ""
      }`,
      sublabel: formatShortDate(show.date),
      // Whole bill is searchable: "OutKast Governors Ball" resolves the
      // festival even though the title doesn't contain OutKast.
      keywords: (show.performers ?? [])
        .map((p) => findArtist(archive, p.artistId)?.name ?? "")
        .join(" "),
      href: `/shows/${show.id}`,
      group: "Shows",
    })),
    ...archive.artists.map((artist) => ({
      label: artist.name,
      href: `/artists/${artist.id}`,
      group: "Performers",
    })),
    ...archive.venues.map((venue) => ({
      label: venue.name,
      sublabel: venue.city,
      href: `/venues/${venue.id}`,
      group: "Venues",
    })),
    ...archive.posters.map((poster) => {
      const show = poster.showId
        ? archive.shows.find((s) => s.id === poster.showId)
        : undefined;
      const artistName = show
        ? archive.artists.find((a) => a.id === show.artistId)?.name
        : undefined;
      return {
        label: `${poster.title} — ${poster.designer}`,
        sublabel: `${artistName ? `${artistName} · ` : ""}${poster.year} poster`,
        href: `/posters/${poster.id}`,
        group: "Posters",
      };
    }),
    // Distinct poster artists (designers) — deduped by slug.
    ...Array.from(
      new Map(
        archive.posters
          .filter((p) => p.designer && p.designer !== "Unknown")
          .map((p) => [posterArtistSlug(p.designer), p.designer] as const),
      ).entries(),
    ).map(([slug, name]) => ({
      label: name,
      sublabel: "Poster artist",
      href: `/poster-artists/${slug}`,
      group: "Poster Artists",
    })),
    { label: "Explore the archive", href: "/explore", group: "Pages" },
    { label: "Poster Artists", href: "/poster-artists", group: "Pages" },
    { label: "Poster Database", href: "/posters", group: "Pages" },
    { label: "My poster rack", href: "/my-posters", group: "Pages" },
    { label: "My Gallery wall", href: "/my-gallery", group: "Pages" },
    { label: "Trading Post", href: "/trading", group: "Pages" },
    { label: "Import from setlist.fm", href: "/import", group: "Pages" },
    { label: "Tickets", href: "/tickets", group: "Pages" },
    { label: "Merch", href: "/merch", group: "Pages" },
    { label: "Memories", href: "/memories", group: "Pages" },
    { label: "Add a show", href: "/add/show", group: "Pages" },
  ];

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Sidebar
          counts={counts}
          authEnabled={authEnabled}
          googleEnabled={googleEnabled}
          missingEnv={authEnabled ? [] : missingAuthEnv()}
          user={
            session?.user
              ? { name: session.user.name, image: session.user.image }
              : null
          }
        />
        <main className="min-h-screen lg:pl-56">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-5 lg:px-6">
            {children}
          </div>
        </main>
        {/* First-visit splash (signed out) + first-run onboarding (signed in, empty archive) */}
        <WelcomeSplash
          enabled={archive.demo}
          authEnabled={authEnabled}
          googleEnabled={googleEnabled}
        />
        <Onboarding enabled={!archive.demo && archive.shows.length === 0} />
        {/* ⌘K search over the viewer's archive */}
        <SearchPalette items={searchItems} />
        <Analytics />
      </body>
    </html>
  );
}
