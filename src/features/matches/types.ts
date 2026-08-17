// src/features/matches/types.ts

export type MatchesRange = "yesterday" | "today" | "upcoming";

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface Match {
  id: string;
  league: string;
  teams: [Team, Team];
  /** e.g. "Bo3", "Bo5". UNCONFIRMED against backend — verify field exists. */
  seriesFormat?: string;
  /** ISO 8601, assumed KST. */
  kickoffAt: string;
  /** UNCONFIRMED field name — backend may use a status enum instead. */
  isLive: boolean;
  /** Present only for live/finished matches. */
  score?: [number, number];
  /**
   * UNCONFIRMED — whether "cancelled" is a real value the backend sends.
   * Do not treat this as authoritative until backend schema is verified.
   */
  status?: "scheduled" | "live" | "finished" | "cancelled";
}
