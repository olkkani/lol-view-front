/**
 * Backed by GET /clubs (list + follow state), POST /clubs/{clubId} (follow),
 * DELETE /clubs/{clubId} (unfollow) — confirmed 2026-09-06.
 * Field names below are still the mock-era assumption, NOT verified against
 * a real GET /clubs response (all localhost:9031 routes return 401 without
 * a session, so this couldn't be probed directly). If the real response
 * uses different field names, fix the mapping in api/fetchClubs.ts —
 * this type and every component should stay unchanged.
 */
export interface Team {
  id: number;
  /** League/region code, e.g. "LCK", "LPL", "LEC". Assumed one region per team. */
  region: string;
  /** Full team name, e.g. "T1", "Dplus KIA" — /matches only exposes short codes like "DK". */
  clubName: string;
  logoUrl: string;
  isFollowing: boolean;
}
