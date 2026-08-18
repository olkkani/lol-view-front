import type { Team } from '../types';

/**
 * Session-only mock data. Short codes and logo URLs are taken from the
 * real GET /matches response observed during the design session
 * (localhost:9031) — region and full clubName are assumed since /matches
 * doesn't carry them. Replace this file when GET /teams exists.
 */
export const MOCK_TEAMS: Team[] = [
  { id: 1, region: 'LCK', clubName: 'T1', logoUrl: 'http://static.lolesports.com/teams/1726801573959_539px-T1_2019_full_allmode.png', isFollowing: true },
  { id: 2, region: 'LCK', clubName: 'Dplus KIA', logoUrl: 'http://static.lolesports.com/teams/1673260049703_DPlusKIALOGO11.png', isFollowing: true },
  { id: 3, region: 'LCK', clubName: 'Hanwha Life Esports', logoUrl: 'http://static.lolesports.com/teams/1631819564399_hle-2021-worlds.png', isFollowing: false },
  { id: 4, region: 'LCK', clubName: 'KT Rolster', logoUrl: 'http://static.lolesports.com/teams/kt_darkbackground.png', isFollowing: false },
  { id: 5, region: 'LCK', clubName: 'Kwangdong Freecs', logoUrl: 'http://static.lolesports.com/teams/1734691810721_BFXfullcolorfordarkbg.png', isFollowing: false },
  { id: 6, region: 'LCK', clubName: 'Nongshim RedForce', logoUrl: 'http://static.lolesports.com/teams/NSFullonDark.png', isFollowing: false },
  { id: 7, region: 'LPL', clubName: 'Bilibili Gaming', logoUrl: 'http://static.lolesports.com/teams/bilibili-gaming.png', isFollowing: true },
  { id: 8, region: 'LPL', clubName: 'JD Gaming', logoUrl: 'http://static.lolesports.com/teams/jd-gaming.png', isFollowing: false },
  { id: 9, region: 'LEC', clubName: 'G2 Esports', logoUrl: 'http://static.lolesports.com/teams/g2-esports.png', isFollowing: false },
  { id: 10, region: 'LEC', clubName: 'Fnatic', logoUrl: 'http://static.lolesports.com/teams/fnatic.png', isFollowing: false },
];
