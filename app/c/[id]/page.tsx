import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Library } from "lucide-react";

import { getPublicCollection } from "@/lib/public";
import { itemListJsonLd, routeMetadata } from "@/lib/seo";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const collection = await getPublicCollection(id);
  if (!collection) return { title: "Collection" };
  const count = collection.posters.length;
  return routeMetadata({
    title: `${collection.name} — ${collection.ownerName}'s collection | Concert Collect`,
    description:
      collection.description ||
      `${collection.ownerName}'s "${collection.name}" collection on Concert Collect — ${count} concert poster${count === 1 ? "" : "s"}.`,
    path: `/c/${id}`,
    image: collection.posters.find((p) => p.imageUrl)?.imageUrl,
  });
}

/** Public, shareable, read-only view of a collector's collection. */
export default async function PublicCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const collection = await getPublicCollection(id);
  if (!collection) notFound();

  const { name, description, ownerId, ownerName, posters } = collection;

  return (
    <div className="space-y-6">
      <JsonLd
        data={itemListJsonLd(
          name,
          posters.map((p) => ({ name: p.title, path: `/posters/${p.id}` })),
        )}
      />

      <div>
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Library className="h-3.5 w-3.5" />
          Collection
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {description ? `${description} · ` : ""}
          {posters.length} {posters.length === 1 ? "poster" : "posters"} ·
          curated by{" "}
          <Link href={`/u/${ownerId}`} className="text-primary hover:underline">
            {ownerName}
          </Link>
        </p>
      </div>

      {posters.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This collection is empty so far.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {posters.map((poster) => (
            <Link key={poster.id} href={`/posters/${poster.id}`} className="group block">
              {poster.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={poster.imageUrl}
                  alt={`${poster.title} — poster art by ${poster.designer}`}
                  loading="lazy"
                  className="aspect-[3/4] w-full rounded-lg border border-white/10 bg-black/40 object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-border bg-secondary p-2 text-center font-mono text-[10px] uppercase text-muted-foreground">
                  {poster.title}
                </div>
              )}
              <div className="mt-1.5 space-y-0.5 px-0.5">
                <p className="truncate text-sm font-medium">{poster.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {poster.designer !== "Unknown" ? `${poster.designer} · ` : ""}
                  {poster.year}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="border-t border-border pt-5 text-xs text-muted-foreground">
        Concert Collect — your shows, your story.{" "}
        <Link href="/" className="text-primary hover:underline">
          Start your own archive
        </Link>
      </p>
    </div>
  );
}
