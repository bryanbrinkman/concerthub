import Link from "next/link";
import { KeyRound, LogOut, ShieldCheck, Users } from "lucide-react";
import { desc, eq, sql } from "drizzle-orm";

import { currentUserId } from "@/auth";
import { getDb, type Db } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { isAdmin, adminEnabled } from "@/lib/admin";
import { formatShortDate } from "@/lib/utils";
import { adminLoginAction, adminLogoutAction } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Field, inputClass } from "@/components/form-controls";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  shows: number;
  posters: number;
  ephemera: number;
  photos: number;
  memories: number;
  firstActivity?: Date;
  lastActivity?: Date;
}

async function loadAdminData(db: Db) {
  const countBy = async (
    table:
      | typeof t.posters
      | typeof t.ephemeraItems
      | typeof t.showPhotos
      | typeof t.memories,
  ) => {
    const rows = await db
      .select({ userId: table.userId, n: sql<number>`count(*)` })
      .from(table)
      .groupBy(table.userId);
    return new Map(rows.map((r) => [r.userId, Number(r.n)]));
  };

  const [users, showAgg, posters, ephemera, photos, memories, recent] =
    await Promise.all([
      db
        .select({
          id: t.users.id,
          name: t.users.name,
          email: t.users.email,
          username: t.users.username,
        })
        .from(t.users),
      db
        .select({
          userId: t.userShows.userId,
          n: sql<number>`count(*)`,
          first: sql<string>`min(${t.userShows.createdAt})`,
          last: sql<string>`max(${t.userShows.createdAt})`,
        })
        .from(t.userShows)
        .groupBy(t.userShows.userId),
      countBy(t.posters),
      countBy(t.ephemeraItems),
      countBy(t.showPhotos),
      countBy(t.memories),
      db
        .select({
          userName: t.users.name,
          username: t.users.username,
          createdAt: t.userShows.createdAt,
          userId: t.userShows.userId,
          showName: t.shows.name,
          artistName: t.artists.name,
          date: t.shows.date,
        })
        .from(t.userShows)
        .innerJoin(t.users, eq(t.userShows.userId, t.users.id))
        .innerJoin(t.shows, eq(t.userShows.showId, t.shows.id))
        .innerJoin(t.artists, eq(t.shows.artistId, t.artists.id))
        .orderBy(desc(t.userShows.createdAt))
        .limit(25),
    ]);

  const showByUser = new Map(
    showAgg.map((r) => [
      r.userId,
      {
        n: Number(r.n),
        first: r.first ? new Date(r.first) : undefined,
        last: r.last ? new Date(r.last) : undefined,
      },
    ]),
  );

  const rows: UserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    shows: showByUser.get(user.id)?.n ?? 0,
    posters: posters.get(user.id) ?? 0,
    ephemera: ephemera.get(user.id) ?? 0,
    photos: photos.get(user.id) ?? 0,
    memories: memories.get(user.id) ?? 0,
    firstActivity: showByUser.get(user.id)?.first,
    lastActivity: showByUser.get(user.id)?.last,
  }));
  rows.sort(
    (a, b) =>
      (b.lastActivity?.getTime() ?? 0) - (a.lastActivity?.getTime() ?? 0),
  );

  return { rows, recent };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!adminEnabled()) {
    return (
      <EmptyState
        icon={KeyRound}
        title="Admin isn't configured"
        description="Set the ADMIN_PASSWORD environment variable in Vercel (and redeploy) to enable this page."
      />
    );
  }

  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm">
        <PageHeader
          title="Admin"
          subtitle="This area is for the site owner."
        />
        {error ? (
          <p className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-300">
            Wrong password — try again.
          </p>
        ) : null}
        <Card>
          <CardContent className="pt-5">
            <form action={adminLoginAction} className="space-y-4">
              <Field label="Admin password">
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className={inputClass}
                />
              </Field>
              <Button type="submit" className="w-full">
                <ShieldCheck />
                Enter
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const db = getDb();
  const viewerId = await currentUserId();
  let data: Awaited<ReturnType<typeof loadAdminData>> | null = null;
  if (db) {
    try {
      data = await loadAdminData(db);
    } catch (error) {
      console.warn("[admin] query failed:", error);
    }
  }

  if (!data) {
    return (
      <EmptyState
        icon={Users}
        title="Couldn't load activity"
        description="The database is unreachable or a migration is pending — check the Vercel logs."
      />
    );
  }

  // "Other than me": the signed-in owner's own row is set aside.
  const others = data.rows.filter((row) => row.id !== viewerId);
  const recentOthers = data.recent.filter((row) => row.userId !== viewerId);
  const totals = others.reduce(
    (acc, row) => ({
      shows: acc.shows + row.shows,
      posters: acc.posters + row.posters,
      artifacts: acc.artifacts + row.ephemera + row.photos + row.memories,
    }),
    { shows: 0, posters: 0, artifacts: 0 },
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin"
        subtitle={
          viewerId
            ? "Signups and contributions from everyone except your own account."
            : "Signups and contributions. (You're not signed in, so no account is excluded — sign in to hide your own activity.)"
        }
        actions={
          <form action={adminLogoutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut />
              Exit admin
            </Button>
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Accounts (others)", value: others.length },
          { label: "Shows tracked", value: totals.shows },
          { label: "Posters cataloged", value: totals.posters },
          { label: "Other artifacts", value: totals.artifacts },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold">Who's signed up</h2>
        {others.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No other accounts yet — just you so far.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">User</th>
                  <th className="px-3 py-2 text-right font-medium">Shows</th>
                  <th className="px-3 py-2 text-right font-medium">Posters</th>
                  <th className="px-3 py-2 text-right font-medium">Photos</th>
                  <th className="px-3 py-2 text-right font-medium">Ephemera</th>
                  <th className="px-3 py-2 text-right font-medium">Memories</th>
                  <th className="px-3 py-2 font-medium">First / last activity</th>
                </tr>
              </thead>
              <tbody>
                {others.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/u/${row.id}`} className="font-medium hover:text-primary">
                        {row.name ?? row.username ?? "Unnamed"}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {row.username ? `@${row.username}` : (row.email ?? "")}
                      </p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.shows}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.posters}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.photos}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.ephemera}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.memories}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {row.firstActivity
                        ? `${formatShortDate(row.firstActivity.toISOString().slice(0, 10))} → ${row.lastActivity ? formatShortDate(row.lastActivity.toISOString().slice(0, 10)) : ""}`
                        : "No activity yet"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          “First activity” is each account's earliest tracked show (the user
          table doesn't store signup timestamps). Accounts with zero counts
          signed up but haven't added anything yet.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Recently added shows</h2>
        {recentOthers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
            No activity from other accounts yet.
          </p>
        ) : (
          <ol className="space-y-1">
            {recentOthers.map((row, index) => (
              <li
                key={`${row.userId}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">
                    <span className="font-medium">
                      {row.userName ?? row.username ?? "Someone"}
                    </span>{" "}
                    added{" "}
                    <span className="font-medium">
                      {row.showName ?? row.artistName}
                    </span>
                    <span className="text-muted-foreground">
                      {" "}
                      · show date {formatShortDate(row.date)}
                    </span>
                  </p>
                </div>
                <p className="shrink-0 text-xs text-muted-foreground">
                  {formatShortDate(row.createdAt.toISOString().slice(0, 10))}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
