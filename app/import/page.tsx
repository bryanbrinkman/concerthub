import { CalendarDays, CheckCircle2, Download, ExternalLink, ListMusic, MapPin } from "lucide-react";

import { authEnabled, currentUserId } from "@/auth";
import { fetchAttendedShows } from "@/lib/setlistfm";
import { formatShortDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { importAttendedAction } from "./actions";

export const metadata = { title: "Import from setlist.fm" };
// Import walks the whole attended history — allow up to a minute.
export const maxDuration = 60;

/**
 * Import a setlist.fm profile's attendance history. Signed-in users get a
 * real "Import all" that upserts shows into their archive (deduped on the
 * setlist.fm id, so re-imports are safe); signed-out visitors get a preview.
 */
export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{
    user?: string;
    p?: string;
    done?: string;
    total?: string;
    partial?: string;
    error?: string;
  }>;
}) {
  const { user, p, done, total, partial, error } = await searchParams;
  const username = user?.trim();
  const page = Math.max(1, Number(p) || 1);
  const signedIn = authEnabled && Boolean(await currentUserId());
  const result = username ? await fetchAttendedShows(username, page) : undefined;

  return (
    <div>
      <PageHeader
        title="Import from setlist.fm"
        subtitle="Pull in every show you've marked as attended on your setlist.fm profile."
      />

      {/* Username form — plain GET so results are linkable/refreshable */}
      <form action="/import" method="get" className="mb-6 flex max-w-lg gap-2">
        <input
          type="text"
          name="user"
          defaultValue={username ?? ""}
          placeholder="Your setlist.fm username"
          className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-secondary px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit">
          <Download />
          Fetch shows
        </Button>
      </form>

      {done ? (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <p>
            Imported <span className="font-medium">{done}</span>
            {total ? ` of ${total}` : ""} shows into your archive.
            {partial
              ? " That was the first chunk of a very large history — run the import again to continue where it left off."
              : ""}{" "}
            <a href="/shows" className="text-primary hover:underline">
              View your shows →
            </a>
          </p>
        </div>
      ) : null}
      {error ? (
        <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          {error === "signin"
            ? "You need to sign in before importing."
            : "The database isn't configured, so imports can't be saved yet."}
        </div>
      ) : null}

      {!username ? (
        <EmptyState
          icon={Download}
          title="Enter your setlist.fm username"
          description="It's the name in your profile URL: setlist.fm/user/<username>. We'll list every show you've marked as attended."
        />
      ) : !result || !result.ok ? (
        <EmptyState
          icon={Download}
          title="Couldn't fetch that profile"
          description={result && !result.ok ? result.error : "Unknown error."}
        />
      ) : result.shows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No attended shows found"
          description={`"${username}" exists but has no shows marked as attended on setlist.fm.`}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{result.total}</span>{" "}
              attended {result.total === 1 ? "show" : "shows"} on{" "}
              <span className="font-medium text-foreground">{username}</span>
              &apos;s profile
            </p>
            {signedIn ? (
              <form action={importAttendedAction}>
                <input type="hidden" name="username" value={username} />
                <Button type="submit">
                  <Download />
                  Import all {result.total} shows
                </Button>
              </form>
            ) : (
              <Button
                disabled
                title={
                  authEnabled
                    ? "Sign in to save these shows to your archive"
                    : "Configure auth + database to enable imports"
                }
              >
                <Download />
                Sign in to import
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {result.shows.map((show) => (
              <Card key={show.setlistFmId}>
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-medium">
                      {show.artistName}
                    </p>
                    {show.url ? (
                      <a
                        href={show.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="View on setlist.fm"
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {show.venueName}
                      {show.city ? ` · ${show.city}` : ""}
                      {show.region ? `, ${show.region}` : ""}
                    </span>
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    {formatShortDate(show.date)}
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {show.songCount > 0 ? (
                      <Badge variant="secondary">
                        <ListMusic />
                        {show.songCount} songs
                      </Badge>
                    ) : null}
                    {show.tourName ? (
                      <Badge variant="outline">{show.tourName}</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {result.total > result.itemsPerPage ? (
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" asChild={page > 1} disabled={page <= 1}>
                {page > 1 ? (
                  <a href={`/import?user=${encodeURIComponent(username)}&p=${page - 1}`}>
                    Previous
                  </a>
                ) : (
                  <span>Previous</span>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Page {page} of {Math.ceil(result.total / result.itemsPerPage)}
              </p>
              <Button
                variant="outline"
                size="sm"
                asChild={page * result.itemsPerPage < result.total}
                disabled={page * result.itemsPerPage >= result.total}
              >
                {page * result.itemsPerPage < result.total ? (
                  <a href={`/import?user=${encodeURIComponent(username)}&p=${page + 1}`}>
                    Next
                  </a>
                ) : (
                  <span>Next</span>
                )}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
