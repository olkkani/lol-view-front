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
}

export interface Match {
  id: number;
  /** ISO 8601 with timezone offset, e.g. "2026-08-17T04:00:00+09:00". */
  startTime: string;
  matchState: MatchState;
  /** No "league" field exists on the backend. matchLabel stands in for it (e.g. "Week 1 Day 2"). */
  matchLabel: string;
  /**
   * Exactly 0 or 2 elements in observed data — never 1. A 0-length array
   * means the match's teams have not been assigned yet (e.g. a bracket
   * slot still TBD). Always check `clubs.length === 2` before indexing.
   */
  clubs: Club[];
}
