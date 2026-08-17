// src/features/matches/components/MatchCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchCard } from './MatchCard';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 'm1',
    league: 'LCK',
    teams: [
      { id: 't1', name: 'T1' },
      { id: 't2', name: 'GEN' },
    ],
    kickoffAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    isLive: false,
    seriesFormat: 'Bo5',
    ...overrides,
  };
}

describe('MatchCard', () => {
  it('renders team names, league, and series format', () => {
    render(<MatchCard match={makeMatch({})} />);
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('GEN')).toBeInTheDocument();
    expect(screen.getByText('LCK')).toBeInTheDocument();
    expect(screen.getByText('Bo5')).toBeInTheDocument();
  });

  it('shows a LIVE badge when the match is live', () => {
    render(<MatchCard match={makeMatch({ isLive: true, score: [1, 0] })} />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('does not show a LIVE badge for a finished match', () => {
    render(<MatchCard match={makeMatch({ isLive: false, score: [2, 1] })} />);
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('renders both scores with equal color when live (no winner yet)', () => {
    render(<MatchCard match={makeMatch({ isLive: true, score: [1, 0] })} />);
    const winnerScore = screen.getByTestId('score-team-0');
    const loserScore = screen.getByTestId('score-team-1');
    expect(winnerScore.className).not.toContain('text-muted-soft');
    expect(loserScore.className).not.toContain('text-muted-soft');
  });

  it('dims the losing score for a finished match', () => {
    render(<MatchCard match={makeMatch({ isLive: false, score: [2, 1] })} />);
    const winnerScore = screen.getByTestId('score-team-0');
    const loserScore = screen.getByTestId('score-team-1');
    expect(winnerScore.className).not.toContain('text-muted-soft');
    expect(loserScore.className).toContain('text-muted-soft');
  });

  it('shows kickoff time instead of a score for an upcoming match', () => {
    render(<MatchCard match={makeMatch({ isLive: false, score: undefined })} />);
    expect(screen.queryByTestId('score-team-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff-time')).toBeInTheDocument();
  });

  it('shows a cancelled badge when there is no score and kickoff is in the past', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    render(
      <MatchCard
        match={makeMatch({ isLive: false, score: undefined, kickoffAt: past, status: 'cancelled' })}
      />
    );
    expect(screen.getByText(/취소|연기/)).toBeInTheDocument();
  });

  it('falls back to team initial when logoUrl is missing', () => {
    render(<MatchCard match={makeMatch({})} />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });
});
