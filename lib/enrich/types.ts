/**
 * Provider plugin interface for the Show Enrichment Engine.
 *
 * A provider takes an EventFingerprint, queries ONE external source
 * (through the shared cache), and returns normalized candidates with
 * confidence + provenance. Providers never write to canonical tables —
 * the engine stores candidates and the review UI / auto-accept rules
 * decide what merges.
 */

import type { EventFingerprint } from "./fingerprint";

export type CandidateKind =
  | "performer"
  | "event_meta"
  | "poster_image"
  | "video"
  | "marketplace"
  | "reference";

export type ImageCandidateType =
  | "official_poster"
  | "possible_poster"
  | "event_image"
  | "ticket"
  | "merch"
  | "unknown";

export interface NewCandidate {
  kind: CandidateKind;
  /** Only for poster_image candidates. */
  candidateType?: ImageCandidateType;
  /** Stable dedupe key within (show, kind): video id, image URL, name… */
  valueKey: string;
  value: Record<string, unknown>;
  sourceUrl?: string;
  /** 0–100. */
  confidence: number;
  reasons: string[];
}

export interface ProviderContext {
  /**
   * Cached fetch: returns the cached JSON for (provider, key) when fresh,
   * otherwise runs `fetcher`, stores the result with the given TTL, and
   * returns it. Failures inside `fetcher` should throw — the engine
   * records the error on the job.
   */
  cached<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T>;
}

export interface EnrichmentProvider {
  name: string;
  label: string;
  /** What this provider contributes (for the progress UI). */
  types: CandidateKind[];
  /** Env-var names required; empty = always available. */
  requiredEnv: string[];
  run(fp: EventFingerprint, ctx: ProviderContext): Promise<NewCandidate[]>;
}

export const missingEnv = (provider: EnrichmentProvider): string[] =>
  provider.requiredEnv.filter((name) => !process.env[name]);
