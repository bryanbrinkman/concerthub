import { ImageResponse } from "next/og";

/**
 * Branded default social card (1200×630) for the homepage and any route
 * that doesn't set its own OG image. Detail pages override this with their
 * poster art via generateMetadata. Twitter falls back to og:image, so this
 * covers both.
 */
export const alt = "Concert Collect — every show, everything it left behind";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          color: "white",
          fontFamily: "sans-serif",
          background:
            "linear-gradient(135deg, #0e0e11 0%, #17121f 55%, #1c0f1b 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 32,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#fbbf24",
          }}
        >
          Concert Collect
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 74,
            fontWeight: 800,
            lineHeight: 1.05,
            maxWidth: 920,
          }}
        >
          Every show. Everything it left behind.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 30,
            color: "#a1a1aa",
            maxWidth: 820,
          }}
        >
          A community archive of concert posters, ticket stubs, setlists, and
          live-music memories.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 44,
            height: 12,
            width: 260,
            borderRadius: 9999,
            background: "linear-gradient(90deg, #f59e0b, #ea580c)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
