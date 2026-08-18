// src/features/matches/types.ts

export type MatchesRange = "yesterday" | "today" | "upcoming";

/**
 * Confirmed live against GET /matches?range=today|yesterday|upcoming
 * (2026-08-17). Only "SCHEDULED" | "FINISHED" | "ONGOING" have been
 * observed. Modeled as an open union (not a closed one) because
 * matchState is a backend string enum — an unrecognized future value
 * (e.g. a cancellation status) must not fail to type-check or crash
 * rendering; it should fall through to a safe default instead.
 */
export type MatchState = "SCHEDULED" | "FINISHED" | "ONGOING" | (string & {});

export interface Club {
  name: string;
  logoUrl: string;
  /** Always present as a number, even for SCHEDULED matches (score: 0). */
  score: number;
  /** Confirmed live: "DARK" | "ANY". When "DARK", the logo is light-colored and needs a dark backdrop for contrast in light mode. */
  logoBackdrop?: 'DARK' | 'ANY' | (string & {});
}

export interface Match {
  id: number;
  /** ISO 8601 with timezone offset, e.g. "2026-08-17T04:00:00+09:00". */
  startTime: string;
  matchState: MatchState;
  leagueName: string;
  matchLabel: string;
  /**
   * Exactly 0 or 2 elements in observed data — never 1. A 0-length array
   * means the match's teams have not been assigned yet (e.g. a bracket
   * slot still TBD). Always check `clubs.length === 2` before indexing.
   */
  clubs: Club[];
}

/**
 * Frontend contract for a future GET /head-to-head?teamA={id}&teamB={id}&limit=5
 * endpoint. NOT YET VERIFIED against a real backend response — the endpoint
 * does not exist yet, and Club has no `id` field to construct the query with.
 * `results` is most-recent-first, capped at 5 entries.
 */
export interface HeadToHead {
  results: ('W' | 'L')[];
}
