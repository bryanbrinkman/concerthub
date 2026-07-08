/**
 * EventFingerprint: the normalized identity of a show/event, used to
 * score every external candidate. Pure functions — no I/O.
 */

export interface EventFingerprint {
  /** Normalized event name (festivals/multi-act bills), if any. */
  eventName?: string;
  venue?: string;
  city?: string;
  /** ISO dates. */
  startDate: string;
  endDate?: string;
  year: string;
  /** Normalized performer names, headliners first. */
  performers: string[];
  /** Best display title ("governors ball 2014" / "rilo kiley"). */
  title: string;
}

/** Lowercase, strip accents/punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ScoreResult {
  /** 0–100. */
  confidence: number;
  reasons: string[];
}

/**
 * Score a blob of candidate text (a video title, image caption, listing
 * title…) against the fingerprint. Additive positive signals, penalties
 * for conflicting years; clamped to [5, 99] — external data never
 * reaches 100 on text alone.
 */
export function scoreText(text: string, fp: EventFingerprint): ScoreResult {
  const hay = ` ${normalizeText(text)} `;
  const has = (needle?: string) =>
    Boolean(needle && needle.length > 1 && hay.includes(` ${needle} `));

  let score = 20;
  const reasons: string[] = [];

  if (has(fp.eventName)) {
    score += 30;
    reasons.push("Exact event name");
  }
  const matchedPerformers = fp.performers.filter((p) => has(p));
  if (matchedPerformers.length > 0) {
    score += Math.min(30, 20 + (matchedPerformers.length - 1) * 5);
    reasons.push(
      matchedPerformers.length === 1
        ? "Exact performer"
        : `${matchedPerformers.length} performers matched`,
    );
  }
  if (has(fp.venue)) {
    score += 15;
    reasons.push("Venue match");
  }
  if (has(fp.city)) {
    score += 8;
    reasons.push("City match");
  }

  const yearsInText = [...new Set(hay.match(/\b(19|20)\d{2}\b/g) ?? [])];
  if (yearsInText.includes(fp.year)) {
    score += 15;
    reasons.push("Exact year");
  } else if (yearsInText.length > 0) {
    score -= 20;
    reasons.push(`Conflicting year (${yearsInText.join(", ")})`);
  }
  if (hay.includes(" poster ")) {
    score += 4;
  }

  return { confidence: Math.max(5, Math.min(99, score)), reasons };
}
