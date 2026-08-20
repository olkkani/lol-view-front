import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  beforeEach(() => {
    // jsdom doesn't implement navigation; stub window.location so clicking
    // the Google button doesn't throw "Not implemented: navigation".
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('renders three provider buttons', () => {
    render(<LoginScreen />);

    expect(screen.getByTestId('login-google')).toBeInTheDocument();
    expect(screen.getByTestId('login-discord')).toBeInTheDocument();
    expect(screen.getByTestId('login-telegram')).toBeInTheDocument();
  });

  it('disables Discord and Telegram buttons with a coming-soon title', () => {
    render(<LoginScreen />);

    const discord = screen.getByTestId('login-discord');
    const telegram = screen.getByTestId('login-telegram');

    expect(discord).toBeDisabled();
    expect(telegram).toBeDisabled();
    expect(discord).toHaveAttribute('title', '준비 중');
    expect(telegram).toHaveAttribute('title', '준비 중');
  });

  it('navigates to the backend Google OAuth2 entry point on click', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.click(screen.getByTestId('login-google'));

    expect(window.location.href).toBe('/api/oauth2/authorization/google');
  });
});
