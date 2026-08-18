import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamRow } from './TeamRow';
import type { Team } from '../types';

const followedTeam: Team = {
  id: 1,
  region: 'LCK',
  clubName: 'T1',
  logoUrl: 'http://example.com/t1.png',
  isFollowing: true,
};

const followableTeam: Team = {
  id: 2,
  region: 'LCK',
  clubName: 'Dplus KIA',
  logoUrl: 'http://example.com/dk.png',
  isFollowing: false,
};

describe('TeamRow', () => {
  it('renders the team name', () => {
    render(<TeamRow team={followedTeam} onToggle={vi.fn()} />);
    expect(screen.getByText('T1')).toBeInTheDocument();
  });

  it('shows a checkmark button labeled for unfollowing when already following', () => {
    render(<TeamRow team={followedTeam} onToggle={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /팔로잉 중.*팔로우 취소/ })
    ).toBeInTheDocument();
  });

  it('shows a plus button labeled "팔로우" when not following', () => {
    render(<TeamRow team={followableTeam} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: '팔로우' })).toBeInTheDocument();
  });

  it('calls onToggle with the team id when the button is clicked', () => {
    const onToggle = vi.fn();
    render(<TeamRow team={followableTeam} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: '팔로우' }));

    expect(onToggle).toHaveBeenCalledWith(2);
  });
});
