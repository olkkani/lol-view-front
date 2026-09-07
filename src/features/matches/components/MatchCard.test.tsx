// src/features/matches/components/MatchCard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchCard } from './MatchCard';
import { makeMatch } from '../test/fixtures';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('MatchCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders team names', () => {
    render(<MatchCard match={makeMatch({})} range="today" />);
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('GEN')).toBeInTheDocument();
  });

  it('does not render its own LIVE badge — that lives only on the section title', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'IN_PROGRESS',
          clubs: [
            { name: 'T1', logoUrl: '', score: 1 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
        range="today"
      />
    );
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('highlights the card border when ongoing', () => {
    const { container } = render(
      <MatchCard
        match={makeMatch({
          matchState: 'IN_PROGRESS',
          clubs: [
            { name: 'T1', logoUrl: '', score: 1 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
        range="today"
      />
    );
    expect(container.firstElementChild?.className).toContain('border-[color:var(--brand-rausch');
  });

  it('does not highlight the card border for a finished match', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'COMPLETED',
          clubs: [
            { name: 'T1', logoUrl: '', score: 2 },
            { name: 'GEN', logoUrl: '', score: 1 },
          ],
        })}
        range="today"
      />
    );
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('renders both scores with equal color when ongoing (no winner yet)', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'IN_PROGRESS',
          clubs: [
            { name: 'T1', logoUrl: '', score: 1 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
        range="today"
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
          matchState: 'COMPLETED',
          clubs: [
            { name: 'T1', logoUrl: '', score: 2 },
            { name: 'GEN', logoUrl: '', score: 1 },
          ],
        })}
        range="today"
      />
    );
    const winnerScore = screen.getByTestId('score-team-0');
    const loserScore = screen.getByTestId('score-team-1');
    expect(winnerScore.className).not.toContain('text-[color:var(--muted-soft');
    expect(loserScore.className).toContain('text-[color:var(--muted-soft');
  });

  it('shows kickoff time instead of a score for a scheduled match', () => {
    render(<MatchCard match={makeMatch({ matchState: 'UNSTARTED' })} range="today" />);
    expect(screen.queryByTestId('score-team-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff-time')).toBeInTheDocument();
  });

  // Regression guard for the kickoff time being rendered in the viewer's
  // local timezone instead of KST. `startTime` carries a "+09:00" offset,
  // so parsing is already correct (2026-09-07T02:00:00+09:00 ==
  // 2026-09-06T17:00:00Z) — the bug was formatting without `timeZone`,
  // which drifts both the time and the calendar date for anyone not in
  // Asia/Seoul. vitest.config.ts pins TZ=UTC, so without an explicit
  // `timeZone: 'Asia/Seoul'` these would render "PM 05:00" / "9월 6일 (일)".
  it('renders kickoff date/time in KST regardless of the viewer local timezone', () => {
    render(
      <MatchCard
        match={makeMatch({ matchState: 'UNSTARTED', startTime: '2026-09-07T02:00:00+09:00' })}
        range="upcoming"
      />
    );
    expect(screen.getByTestId('kickoff-time')).toHaveTextContent('AM 02:00');
    expect(screen.getByTestId('kickoff-date')).toHaveTextContent('9월 7일');
  });

  it('shows a fallback state when clubs is empty (teams not yet assigned)', () => {
    render(
      <MatchCard
        match={makeMatch({ matchState: 'UNSTARTED', clubs: [] })}
        range="today"
      />
    );
    expect(screen.getByText('대진 미정')).toBeInTheDocument();
    expect(screen.queryByTestId('score-team-0')).not.toBeInTheDocument();
  });

  it('falls back to team initial when logoUrl is empty', () => {
    render(<MatchCard match={makeMatch({})} range="today" />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('applies a dark backdrop behind the logo when logoBackdrop is "DARK"', () => {
    const { container } = render(
      <MatchCard
        match={makeMatch({
          clubs: [
            { name: 'T1', logoUrl: 'https://example.com/t1.png', score: 0, logoBackdrop: 'DARK' },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
        range="today"
      />
    );
    const logoImg = container.querySelector('img[src="https://example.com/t1.png"]');
    const backdrop = logoImg?.parentElement;
    expect(backdrop?.className).toContain('bg-[color:var(--ink,#222222)]');
    expect(backdrop?.className).toContain('dark:bg-transparent');
  });

  it('does not apply a backdrop when logoBackdrop is "ANY"', () => {
    const { container } = render(
      <MatchCard
        match={makeMatch({
          clubs: [
            { name: 'T1', logoUrl: 'https://example.com/t1.png', score: 0, logoBackdrop: 'ANY' },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
        range="today"
      />
    );
    const logoImg = container.querySelector('img[src="https://example.com/t1.png"]');
    const backdrop = logoImg?.parentElement;
    expect(backdrop?.className).not.toContain('bg-[color:var(--ink');
  });

  it('does not apply a backdrop when logoBackdrop is unset', () => {
    const { container } = render(
      <MatchCard
        match={makeMatch({
          clubs: [
            { name: 'T1', logoUrl: 'https://example.com/t1.png', score: 0 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
        range="today"
      />
    );
    const logoImg = container.querySelector('img[src="https://example.com/t1.png"]');
    const backdrop = logoImg?.parentElement;
    expect(backdrop?.className).not.toContain('bg-[color:var(--ink');
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
        range="today"
      />
    );
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff-time')).toBeInTheDocument();
  });

  it('is rendered as a button with an accessible role', () => {
    render(<MatchCard match={makeMatch({})} range="today" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls navigate with matchId on click', async () => {
    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    await user.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith({
      search: { range: 'today', matchId: 42 },
      replace: true,
    });
  });

  it('calls navigate with matchId on Enter key', async () => {
    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith({
      search: { range: 'today', matchId: 42 },
      replace: true,
    });
  });

  it('calls navigate with matchId on Space key', async () => {
    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    screen.getByRole('button').focus();
    await user.keyboard(' ');
    expect(mockNavigate).toHaveBeenCalledWith({
      search: { range: 'today', matchId: 42 },
      replace: true,
    });
  });
});
