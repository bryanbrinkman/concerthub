import Link from "next/link";
import { ArrowRight, CalendarDays, Frame, LogIn } from "lucide-react";

import { getArchive } from "@/lib/archive";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata = { title: "Add to your archive" };

const OPTIONS = [
  {
    href: "/add/show",
    icon: CalendarDays,
    title: "Add a show",
    description:
      "Log a concert you attended — the band, the date, the venue. We'll cross-check setlist.fm to fill in the details.",
  },
  {
    href: "/add/poster",
    icon: Frame,
    title: "Add a poster",
    description:
      "Catalog a print for your rack — upload the art, then the designer, edition, and your copy number.",
  },
];

/** Entry point for building the archive: choose a show or a poster. */
export default async function AddPage() {
  const archive = await getArchive();

  if (archive.demo) {
    return (
      <EmptyState
        icon={LogIn}
        title="Sign in to build your archive"
        description="Shows and posters are saved to your own archive. Create a free account — it takes a moment."
        actionLabel="Create an account"
        actionHref="/login?mode=signup"
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Build your archive"
        subtitle="What are you adding today?"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-white/[0.03]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <option.icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold tracking-tight">
                {option.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
            <span className="flex items-center gap-1 text-sm font-medium text-primary">
              Start
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
