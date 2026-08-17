import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';

describe('Header', () => {
  it('renders the LoL View wordmark', () => {
    render(<Header />);
    expect(screen.getByText('LoL View')).toBeInTheDocument();
  });

  it('opens the hamburger menu on click', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: /메뉴/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
