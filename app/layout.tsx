import type { Metadata } from "next";

import "./globals.css";
import { auth, authEnabled, googleEnabled, missingAuthEnv } from "@/auth";
import {
  archiveCounts,
  findArtist,
  findVenue,
  getArchive,
} from "@/lib/archive";
import { formatShortDate } from "@/lib/utils";
import { Sidebar } from "@/components/sidebar";
import { Onboarding } from "@/components/onboarding";
import { WelcomeSplash } from "@/components/welcome-splash";
import { SearchPalette, type SearchItem } from "@/components/search-palette";

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
    card: "summary",
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
  const session = authEnabled ? await auth() : null;

  // ⌘K search index: the viewer's archive + app pages.
  const searchItems: SearchItem[] = [
    ...archive.shows.map((show) => ({
      label: `${findArtist(archive, show.artistId)?.name ?? "Unknown"} — ${
        findVenue(archive, show.venueId)?.name ?? ""
      }`,
      sublabel: formatShortDate(show.date),
      href: `/shows/${show.id}`,
      group: "Shows",
    })),
    ...archive.artists.map((artist) => ({
      label: artist.name,
      href: `/artists/${artist.id}`,
      group: "Artists",
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
    { label: "Explore the archive", href: "/explore", group: "Pages" },
    { label: "Poster rack", href: "/posters", group: "Pages" },
    { label: "Trading Post", href: "/prints", group: "Pages" },
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
      </body>
    </html>
  );
}
