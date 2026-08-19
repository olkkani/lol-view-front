import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchSection } from './MatchSection';
import { makeMatch } from '../test/fixtures';

describe('MatchSection', () => {
  it('renders nothing when matches is empty', () => {
    const { container } = render(
      <MatchSection status="ongoing" matches={[]} range="today" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the section title and match cards when matches is non-empty', () => {
    const match = makeMatch({ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2' });
    render(<MatchSection status="finished" matches={[match]} range="today" />);
    expect(screen.getByText('종료')).toBeInTheDocument();
    expect(screen.getByText('LCK Week 1 Day 2')).toBeInTheDocument();
  });

  it('is unaware of other sections — the same group header can legitimately appear again in a sibling MatchSection', () => {
    const finishedMatch = makeMatch({ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2', matchState: 'FINISHED' });
    const upcomingMatch = makeMatch({ id: 2, leagueName: 'LCK', matchLabel: 'Week 1 Day 2', matchState: 'SCHEDULED' });

    render(
      <>
        <MatchSection status="finished" matches={[finishedMatch]} range="today" />
        <MatchSection status="upcoming" matches={[upcomingMatch]} range="today" />
      </>
    );

    expect(screen.getAllByText('LCK Week 1 Day 2')).toHaveLength(2);
  });
});
