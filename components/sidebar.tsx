"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  Compass,
  Download,
  Heart,
  Home,
  Image as ImageIcon,
  Library,
  LogIn,
  LogOut,
  MapPin,
  Menu,
  Search,
  Shirt,
  StickyNote,
  Ticket,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ArchiveCounts } from "@/lib/archive";
import { signInAction, signOutAction } from "@/app/auth-actions";

interface SidebarUser {
  name?: string | null;
  image?: string | null;
}

interface SidebarProps {
  counts: ArchiveCounts;
  user: SidebarUser | null;
  authEnabled: boolean;
  /** Google OAuth configured — show the one-click Google button too. */
  googleEnabled?: boolean;
  /** Names of unset auth env vars, shown while auth is unconfigured. */
  missingEnv?: string[];
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  count?: number;
}

/** Poster-first public nav; everything else lives under "More". */
const MAIN_NAV: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Posters", href: "/posters", icon: ImageIcon },
  { label: "Explore", href: "/explore", icon: Compass },
];

/** Collapsed-by-default secondary browse nav. */
const MORE_NAV: NavItem[] = [
  { label: "Shows", href: "/shows", icon: CalendarDays },
  { label: "Artists", href: "/artists", icon: Users },
  { label: "Venues", href: "/venues", icon: MapPin },
  { label: "Trading Post", href: "/prints", icon: ArrowLeftRight },
  { label: "Import", href: "/import", icon: Download },
];

function collectionNav(counts: ArchiveCounts): NavItem[] {
  return [
    { label: "My Shows", href: "/my-shows", icon: CalendarDays, count: counts.shows },
    { label: "My Posters", href: "/my-posters", icon: ImageIcon, count: counts.posters },
    { label: "Wantlist", href: "/my-posters?state=want", icon: Heart, count: counts.wishlist },
    { label: "Collections", href: "/collections", icon: Library, count: undefined },
    { label: "Tickets", href: "/tickets", icon: Ticket, count: counts.tickets },
    { label: "Merch", href: "/merch", icon: Shirt, count: counts.merch },
    { label: "Memories", href: "/memories", icon: StickyNote, count: undefined },
  ];
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm transition-colors",
        active
          ? "bg-white/[0.07] text-foreground"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {item.count !== undefined ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {item.count}
        </span>
      ) : null}
    </Link>
  );
}

function Brand() {
  return (
    <Link href="/" className="block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Concert Collect — every show, everything it left behind"
        className="w-16 lg:w-28"
      />
    </Link>
  );
}

function UserFooter({
  user,
  authEnabled,
  googleEnabled,
  missingEnv,
}: {
  user: SidebarUser | null;
  authEnabled: boolean;
  googleEnabled?: boolean;
  missingEnv?: string[];
}) {
  if (user) {
    const initial = (user.name ?? "?").charAt(0).toUpperCase();
    return (
      <div className="flex items-center gap-3">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-sm font-semibold text-white">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.name ?? "You"}</p>
          <p className="truncate text-xs text-muted-foreground">Your archive</p>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Sign out"
            title="Sign out"
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  if (authEnabled) {
    return (
      <div className="space-y-2">
        {googleEnabled ? (
          <form action={signInAction}>
            <button
              type="submit"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-white/[0.06] px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.12]"
            >
              <LogIn className="h-4 w-4" />
              Sign in with Google
            </button>
          </form>
        ) : null}
        <Link
          href="/login"
          className={
            googleEnabled
              ? "block px-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
              : "flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white/[0.06] px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.12]"
          }
        >
          {googleEnabled ? (
            "or use a username & password"
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Sign in / create account
            </>
          )}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-1">
      <p className="text-xs text-muted-foreground">
        Demo archive — configure auth to start yours.
      </p>
      {missingEnv && missingEnv.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-amber-400/90">
          Missing env vars: {missingEnv.join(", ")}
        </p>
      ) : null}
    </div>
  );
}

function SidebarBody({
  counts,
  user,
  authEnabled,
  googleEnabled,
  missingEnv,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();
  // "More" starts collapsed; opens itself when the current page lives
  // inside it so the active item is never hidden.
  const [moreOpen, setMoreOpen] = React.useState(false);
  React.useEffect(() => {
    if (MORE_NAV.some((item) => isActive(pathname, item.href))) {
      setMoreOpen(true);
    }
  }, [pathname]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Brand />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4 scrollbar-none">
        <div className="space-y-0.5">
          {MAIN_NAV.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
          <button
            type="button"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((v) => !v)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 shrink-0 transition-transform",
                moreOpen && "rotate-90",
              )}
            />
            <span className="flex-1 truncate text-left">More</span>
          </button>
          {moreOpen ? (
            <div className="ml-4 space-y-0.5 border-l border-border pl-2">
              {MORE_NAV.map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  onNavigate?.();
                  window.dispatchEvent(new CustomEvent("cc-open-search"));
                }}
                className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">Search</span>
                <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ⌘K
                </kbd>
              </button>
            </div>
          ) : null}
        </div>

        {/* Personal section — signed-in users only */}
        {user ? (
          <div>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              My Archive
            </p>
            <div className="space-y-0.5">
              {collectionNav(counts).map((item) => (
                <NavLink
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ) : null}
      </nav>

      <div className="space-y-3 border-t border-border px-4 py-4">
        <UserFooter
          user={user}
          authEnabled={authEnabled}
          googleEnabled={googleEnabled}
          missingEnv={missingEnv}
        />
        <Link
          href="/about"
          onClick={onNavigate}
          className="block px-1 text-[11px] text-muted-foreground/70 transition-colors hover:text-foreground"
        >
          About Concert Collect
        </Link>
      </div>
    </div>
  );
}

/**
 * App navigation.
 * - Desktop (lg+): fixed left rail.
 * - Mobile/tablet: sticky top bar with a slide-down menu.
 */
export function Sidebar(props: SidebarProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 border-r border-border bg-[#0e0e11] lg:block">
        <SidebarBody {...props} />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="block overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Concert Collect"
            className="h-9 w-auto"
          />
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile menu overlay */}
      {open ? (
        <div className="fixed inset-0 top-[57px] z-30 overflow-y-auto bg-background/95 backdrop-blur lg:hidden">
          <SidebarBody {...props} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </>
  );
}
