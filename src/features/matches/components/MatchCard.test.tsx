// src/features/matches/components/MatchCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchCard } from './MatchCard';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 1,
    matchLabel: 'Week 1 Day 2',
    startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    matchState: 'SCHEDULED',
    clubs: [
      { name: 'T1', logoUrl: '', score: 0 },
      { name: 'GEN', logoUrl: '', score: 0 },
    ],
    ...overrides,
  };
}

describe('MatchCard', () => {
  it('renders team names and matchLabel', () => {
    render(<MatchCard match={makeMatch({})} />);
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('GEN')).toBeInTheDocument();
    expect(screen.getByText('Week 1 Day 2')).toBeInTheDocument();
  });

  it('shows a LIVE badge when matchState is ONGOING', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'ONGOING',
          clubs: [
            { name: 'T1', logoUrl: '', score: 1 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
      />
    );
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('does not show a LIVE badge for a finished match', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'FINISHED',
          clubs: [
            { name: 'T1', logoUrl: '', score: 2 },
            { name: 'GEN', logoUrl: '', score: 1 },
          ],
        })}
      />
    );
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('renders both scores with equal color when ongoing (no winner yet)', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'ONGOING',
          clubs: [
            { name: 'T1', logoUrl: '', score: 1 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
      />
    );
    const winnerScore = screen.getByTestId('score-team-0');
    const loserScore = screen.getByTestId('score-team-1');
    expect(winnerScore.className).not.toContain('text-[color:var(--muted-soft');
    expect(loserScore.className).not.toContain('text-[color:var(--muted-soft');
  });

  it('dims the losing score for a finished match', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'FINISHED',
          clubs: [
            { name: 'T1', logoUrl: '', score: 2 },
            { name: 'GEN', logoUrl: '', score: 1 },
          ],
        })}
      />
    );
    const winnerScore = screen.getByTestId('score-team-0');
    const loserScore = screen.getByTestId('score-team-1');
    expect(winnerScore.className).not.toContain('text-[color:var(--muted-soft');
    expect(loserScore.className).toContain('text-[color:var(--muted-soft');
  });

  it('shows kickoff time instead of a score for a scheduled match', () => {
    render(<MatchCard match={makeMatch({ matchState: 'SCHEDULED' })} />);
    expect(screen.queryByTestId('score-team-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff-time')).toBeInTheDocument();
  });

  it('shows a fallback state when clubs is empty (teams not yet assigned)', () => {
    render(
      <MatchCard
        match={makeMatch({ matchState: 'SCHEDULED', clubs: [] })}
      />
    );
    expect(screen.getByText('대진 미정')).toBeInTheDocument();
    expect(screen.queryByTestId('score-team-0')).not.toBeInTheDocument();
  });

  it('falls back to team initial when logoUrl is empty', () => {
    render(<MatchCard match={makeMatch({})} />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('treats an unrecognized matchState as not-live and not-finished (falls back to scheduled rendering)', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'CANCELLED',
          clubs: [
            { name: 'T1', logoUrl: '', score: 0 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
      />
    );
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff-time')).toBeInTheDocument();
  });
});
