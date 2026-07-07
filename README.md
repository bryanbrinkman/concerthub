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

The seeded showcase page is
[`/shows/tame-impala-msg-2022`](http://localhost:3000/shows/tame-impala-msg-2022)
— Tame Impala, The Slow Rush Tour, Madison Square Garden, Sep 14 2022.
For the full set of empty states (no poster, no ephemera, no memory, no media),
see [`/shows/lcd-brooklyn-2021`](http://localhost:3000/shows/lcd-brooklyn-2021).

No auth, no database — everything renders from local seed data.

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

### Placeholder artwork

No copyrighted poster/photo assets are included. Every visual is a generated
gradient card (`components/gradient-art.tsx`). When real uploads or
API-sourced images exist, swap `GradientArt`/`PosterArt` for `next/image`
without touching the surrounding layout.

## Where future API integrations go

All external data flows through `lib/data.ts` — the helper functions
(`getSetlistForShow`, `getPostersForShow`, …) are the seam. Pages and
components only call those helpers, so wiring real sources means replacing
seed arrays with fetches, not rewriting UI. Look for `TODO(api)` comments:

- **setlist.fm** (`lib/data.ts`, `components/setlist-card.tsx`):
  fetch setlists from the [setlist.fm REST API](https://api.setlist.fm/docs/1.0/index.html)
  by artist MusicBrainz id + show date, normalize into the `Setlist` type,
  and deep-link the "via setlist.fm" / "View on setlist.fm" buttons to the
  real setlist page. Add `setlistFmMbid` to `Artist` when you do.
- **Expresso Beans** (`lib/data.ts`, `components/poster-details-card.tsx`,
  `app/posters/page.tsx`): resolve posters to Expresso Beans item pages for
  market data (average/last sale, have/want counts) and link
  "View on Expresso Beans" to the exact item.
- **Search** (`components/sidebar.tsx`): the ⌘K entry is a stub awaiting a
  command palette.

## Roadmap notes

- Auth + per-user archives (everything is currently a single mock user)
- Real uploads for ephemera/photos
- Artist and venue detail pages
- Making the action buttons (Add memory, Add to collection, Upload
  ephemera, I was there) actually persist data
