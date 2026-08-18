import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamSection } from './TeamSection';
import type { Team } from '../types';

const teams: Team[] = [
  { id: 1, region: 'LPL', clubName: 'JD Gaming', logoUrl: '', isFollowing: false },
  { id: 2, region: 'LCK', clubName: 'T1', logoUrl: '', isFollowing: false },
  { id: 3, region: 'LCK', clubName: 'Dplus KIA', logoUrl: '', isFollowing: false },
];

describe('TeamSection', () => {
  it('renders the section title', () => {
    render(<TeamSection title="나의 팀" teams={teams} onToggle={vi.fn()} />);
    expect(screen.getByText('나의 팀')).toBeInTheDocument();
  });

  it('renders region labels in priority order (LCK before LPL)', () => {
    render(<TeamSection title="팔로우할 팀" teams={teams} onToggle={vi.fn()} />);
    const labels = screen.getAllByText(/^(LCK|LPL|LEC)$/).map((el) => el.textContent);
    expect(labels).toEqual(['LCK', 'LPL']);
  });

  it('renders teams within a region sorted by clubName', () => {
    render(<TeamSection title="팔로우할 팀" teams={teams} onToggle={vi.fn()} />);
    const names = screen.getAllByText(/^(T1|Dplus KIA|JD Gaming)$/).map((el) => el.textContent);
    expect(names).toEqual(['Dplus KIA', 'T1', 'JD Gaming']);
  });

  it('renders nothing region-related when teams is empty', () => {
    render(<TeamSection title="나의 팀" teams={[]} onToggle={vi.fn()} />);
    expect(screen.queryByText('LCK')).not.toBeInTheDocument();
  });
});
