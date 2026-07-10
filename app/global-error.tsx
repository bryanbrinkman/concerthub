"use client";

/**
 * Last-resort boundary: catches errors thrown by the root layout itself
 * (where a normal error.tsx can't reach). Replaces the bare white
 * "Application error" screen with a branded, recoverable page. Must render
 * its own <html>/<body> because it stands in for the whole document.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0e11",
          color: "#e7e7ea",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#a1a1aa", lineHeight: 1.6, margin: "0 0 1.5rem" }}>
            The page hit an unexpected error. Try again, or head back to the
            archive.
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => reset()}
              style={{
                cursor: "pointer",
                borderRadius: 10,
                border: "1px solid #2a2a30",
                background: "#7c3aed",
                color: "white",
                padding: "0.6rem 1.1rem",
                fontSize: "0.9rem",
                fontWeight: 600,
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                borderRadius: 10,
                border: "1px solid #2a2a30",
                background: "rgba(255,255,255,0.06)",
                color: "#e7e7ea",
                padding: "0.6rem 1.1rem",
                fontSize: "0.9rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
          {error.digest ? (
            <p style={{ color: "#71717a", fontSize: "0.75rem", marginTop: "1.5rem" }}>
              Reference: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
