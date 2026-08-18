import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamFollowScreen } from './TeamFollowScreen';

describe('TeamFollowScreen', () => {
  it('renders the screen title', () => {
    render(<TeamFollowScreen onBack={vi.fn()} />);
    expect(screen.getByText('팀 팔로우')).toBeInTheDocument();
  });

  it('renders both section titles', () => {
    render(<TeamFollowScreen onBack={vi.fn()} />);
    expect(screen.getByText('나의 팀')).toBeInTheDocument();
    expect(screen.getByText('팔로우할 팀')).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(<TeamFollowScreen onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onBack).toHaveBeenCalled();
  });

  it('moves a team from followable to my-teams when its follow button is clicked', () => {
    render(<TeamFollowScreen onBack={vi.fn()} />);

    // Dplus KIA (id 2) starts followed per mock data; pick a followable one instead.
    const followButtons = screen.getAllByRole('button', { name: '팔로우' });
    expect(followButtons.length).toBeGreaterThan(0);

    fireEvent.click(followButtons[0]);

    // After clicking, there should be one fewer "팔로우" button than before.
    const remaining = screen.getAllByRole('button', { name: '팔로우' });
    expect(remaining.length).toBe(followButtons.length - 1);
  });
});
