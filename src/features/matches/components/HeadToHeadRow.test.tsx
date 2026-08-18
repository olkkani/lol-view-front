import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeadToHeadRow } from './HeadToHeadRow';

describe('HeadToHeadRow', () => {
  it('renders exactly 5 dots', () => {
    render(<HeadToHeadRow />);
    expect(screen.getAllByTestId('h2h-dot')).toHaveLength(5);
  });

  it('renders all dots in the neutral (gray) state, since there is no real result data yet', () => {
    render(<HeadToHeadRow />);
    const dots = screen.getAllByTestId('h2h-dot');
    for (const dot of dots) {
      expect(dot.className).toContain('bg-[color:var(--muted-soft');
    }
  });
});
