import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* All artwork is generated with CSS gradients for now, so no remote image
     domains are configured. Add them here once real poster/photo assets or
     external APIs (setlist.fm, Expresso Beans) are wired up. */
  async redirects() {
    return [
      // Trading Post moved from /prints to /trading — keep old links working.
      { source: "/prints", destination: "/trading", permanent: true },
    ];
  },
};

export default nextConfig;
