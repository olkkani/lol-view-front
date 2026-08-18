/**
 * Mock-derived shape — no /teams or /clubs backend endpoint exists yet
 * (verified via curl against localhost:9031 during design, 2026-08-18).
 * `region` and `clubName` here are assumptions grounded in real team
 * short codes seen in GET /matches, not fabricated data. Update this
 * type when the real endpoint contract is confirmed — see
 * docs/designs/team-follow.md Open Questions.
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
