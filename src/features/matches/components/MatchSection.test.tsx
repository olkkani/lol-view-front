import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MatchSection } from './MatchSection';

describe('MatchSection', () => {
  it('renders nothing when matches is empty', () => {
    const { container } = render(
      <MatchSection status="ongoing" matches={[]} range="today" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
