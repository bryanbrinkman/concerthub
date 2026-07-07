import type { Metadata } from "next";

import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: {
    default: "Concert Collect",
    template: "%s · Concert Collect",
  },
  description:
    "Your shows. Your story. A personal archive for live music memories — setlists, posters, ticket stubs, and everything you kept.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Sidebar />
        <main className="min-h-screen lg:pl-56">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-5 lg:px-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
