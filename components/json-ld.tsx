/**
 * Renders one or more Schema.org JSON-LD objects as a script tag in the
 * server-rendered HTML, so crawlers read structured data without running
 * any JavaScript.
 */
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          // Server-rendered; content is our own structured data.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
