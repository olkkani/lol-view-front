import { useState } from 'react';
import { HamburgerMenu } from './HamburgerMenu';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-[color:var(--hairline,#dddddd)] px-4">
      <span className="text-lg font-bold">LoL View</span>
      <button
        type="button"
        aria-label="메뉴"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex size-11 flex-col items-center justify-center gap-1"
      >
        <span className="h-0.5 w-4.5 rounded-full bg-[color:var(--ink,#222222)]" />
        <span className="h-0.5 w-4.5 rounded-full bg-[color:var(--ink,#222222)]" />
        <span className="h-0.5 w-4.5 rounded-full bg-[color:var(--ink,#222222)]" />
      </button>
      <HamburgerMenu open={menuOpen} />
    </header>
  );
}
