import type { Metadata } from "next";

import "./globals.css";
import { auth, authEnabled, missingAuthEnv } from "@/auth";
import { archiveCounts, getArchive } from "@/lib/archive";
import { Sidebar } from "@/components/sidebar";
import { Onboarding } from "@/components/onboarding";

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

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Sidebar
          counts={counts}
          authEnabled={authEnabled}
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
        {/* First-run welcome for signed-in users with an empty archive */}
        <Onboarding enabled={!archive.demo && archive.shows.length === 0} />
      </body>
    </html>
  );
}
