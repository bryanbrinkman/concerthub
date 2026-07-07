# Concert Collect

**Your shows. Your story.** A "Discogs for live music memories" — every concert
page combines the show info, the setlist, the poster and its print details,
your ticket stubs, wristbands, merch, photos, and your own written memory of
the night. Think Letterboxd × Discogs × setlist.fm × a personal archive.

Built with Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui-style
components, and lucide-react icons. Dark, archival, collector-focused UI with
a purple accent.

## Running it

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The seeded show page is
[`/shows/rilo-kiley-capitol-2025`](http://localhost:3000/shows/rilo-kiley-capitol-2025)
— Rilo Kiley at The Capitol Theatre, Port Chester NY, Aug 31 2025, with real
concert photos, the show poster, and a YouTube link. Ephemera and memory are
intentionally empty so their upload/add empty states show.

No auth, no database — everything renders from local seed data (plus the
live setlist.fm lookup described below).

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Dashboard — stats, recently archived shows, latest memory |
| `/shows` | All shows grid |
| `/shows/[id]` | Show detail — hero, tabs, ephemera rail |
| `/artists` | Artists you've seen |
| `/venues` | Venues with capacity + show counts |
| `/collections` | Curated groupings (binders, wishlists, tour runs) |
| `/posters` | Poster flat file with edition metadata |
| `/tickets` | Ticket stub shoebox |
| `/merch` | Apparel + other merch |
| `/memories` | All written memories |

## Structure

```
app/                  # App Router pages (one folder per section)
components/
  ui/                 # shadcn/ui-style primitives (button, card, badge, tabs)
  sidebar.tsx         # Desktop rail / mobile top-nav
  show-hero.tsx       # Poster + title + meta + CTAs (+ setlist at xl)
  setlist-card.tsx    # setlist.fm-style numbered setlist w/ encore
  ephemera-grid.tsx   # "My Ephemera" — stubs, laminates, wristbands, merch
  poster-details-card.tsx  # Print metadata (designer, edition, technique)
  photo-grid.tsx      # "Photos from the night" placeholders
  memory-card.tsx     # "Your memory" note card
  tour-carousel.tsx   # "More from this tour" scroller
  media-links-card.tsx # "Listen / Watch" links
  gradient-art.tsx    # Generated gradient placeholder art (no real assets)
lib/
  types.ts            # Artist, Venue, Show, Setlist, Song, Poster, Edition,
                      # EphemeraItem, UserMemory, MediaLink, Tour, Collection
  data.ts             # All mock seed data + the read helpers the UI uses
  utils.ts            # cn() + date formatting
```

### Responsive behavior

- **Desktop (xl+)**: three columns — sidebar, main content, ephemera rail;
  the setlist also appears inside the hero.
- **Tablet (lg)**: sidebar rail stays; the right rail stacks below the main
  content; setlist lives in its tab.
- **Mobile**: sidebar collapses into a sticky top bar with a slide-down menu.

### Artwork & imagery

Seeded imagery (poster, concert photos) is the user's own, hosted on
Cloudinary and referenced by `imageUrl` in `lib/data.ts`. Every image is
layered over a muted duotone gradient (`components/gradient-art.tsx`) — if a
URL ever fails, the gradient shows instead of a broken image, and anything
without an `imageUrl` renders as a generated gradient placeholder.

## Live integrations

Both integrations are server-side only, cached, and fail soft — any error
falls back to seed data / gradient art, so pages never break.

### setlist.fm (`lib/setlistfm.ts`)

Show pages resolve their setlist live from the
[setlist.fm REST API](https://api.setlist.fm/docs/1.0/index.html), searching
by artist name + show date and normalizing into the `Setlist` type. The
"via setlist.fm" / "View on setlist.fm" links deep-link to the real setlist
page. Setup:

1. Copy `.env.example` to `.env.local` and set `SETLISTFM_API_KEY`.
2. On Vercel: Project → Settings → Environment Variables → add the same key
   for Production + Preview, then redeploy.

No key (or no match) = the seeded setlists in `lib/data.ts` render instead.
Responses are cached for 24h via `next: { revalidate }`.

**Profile import** (`/import`): enter a setlist.fm username and the app pulls
their attended-shows history live from the API (`user/{id}/attended`), with
pagination. Today it's a preview; the "Import all" button activates once
accounts + storage exist (see `TODO(persistence)` in `lib/setlistfm.ts` and
`app/import/page.tsx` — imports dedupe on setlist.fm's setlist id).

### Expresso Beans imagery (`lib/expressobeans.ts`)

Expresso Beans has no public API, so this is a light server-side read of an
item's public detail page that extracts the poster image (og:image) and the
canonical item URL. To activate for a poster, set `expressoBeansId` in
`lib/data.ts` to the number from the item page URL
(`expressobeans.com/public/detail.php/<id>`). Real artwork then renders in
the show hero, the Poster/Print Details card, and the Posters page; the
"View on Expresso Beans" buttons deep-link to the item. Pages are cached for
a week. A hand-set `imageUrl` on a poster always wins over scraped imagery.

TODO(api): EB market data (avg/last sale, have/want counts); a ⌘K command
palette for the sidebar Search stub.

## Roadmap notes

- Auth + per-user archives (everything is currently a single mock user)
- Real uploads for ephemera/photos
- Artist and venue detail pages
- Making the action buttons (Add memory, Add to collection, Upload
  ephemera, I was there) actually persist data
