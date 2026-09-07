// src/features/matches/types.ts

export type MatchesRange = "yesterday" | "today" | "upcoming";

/**
 * Confirmed live against GET /matches?range=today|yesterday|upcoming
 * (2026-09-07). Backend previously sent "SCHEDULED" | "FINISHED" | "ONGOING"
 * (see git history / TODOS.md) but has since migrated to
 * "UNSTARTED" | "IN_PROGRESS" | "COMPLETED" — the old values are no longer
 * observed in any range. Modeled as an open union (not a closed one)
 * because matchState is a backend string enum — an unrecognized future
 * value (e.g. a cancellation status) must not fail to type-check or crash
 * rendering; it should fall through to a safe default instead.
 */
export type MatchState = "UNSTARTED" | "IN_PROGRESS" | "COMPLETED" | (string & {});

export interface Club {
  name: string;
  logoUrl: string;
  /** Always present as a number, even for UNSTARTED matches (score: 0). */
  score: number;
  /** Confirmed live: "DARK" | "ANY". When "DARK", the logo is light-colored and needs a dark backdrop for contrast in light mode. */
  logoBackdrop?: 'DARK' | 'ANY' | (string & {});
}

export interface Match {
  id: number;
  /**
   * ISO 8601 with timezone offset, e.g. "2026-08-17T04:00:00+09:00" — so
   * `new Date(startTime)` always resolves the correct instant, no parsing
   * fix needed. When *displaying* it, always pin `timeZone: 'Asia/Seoul'`
   * (see `utils/formatKickoff.ts`) — LCK kickoff times are KST regardless
   * of the viewer's local timezone; formatting without an explicit zone
   * silently drifts the shown time (and sometimes date) for anyone not in
   * Asia/Seoul.
   */
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
