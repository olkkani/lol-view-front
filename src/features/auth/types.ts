/**
 * Minimal shape — GET /me's full response contract isn't confirmed yet
 * (see design doc Open Questions, ~/.gstack/projects/olkkani-lol-view-front/20260821-design-social-login.md).
 * Only `id` is needed to prove "a session exists"; extend when the real
 * contract is confirmed.
 */
export interface Me {
  id: number;
}
