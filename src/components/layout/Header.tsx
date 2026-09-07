import { useState } from 'react';
import { HamburgerMenu } from './HamburgerMenu';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-[color:var(--hairline,#dddddd)] px-4">
      <span className="text-lg font-bold">LoL View</span>
      <HamburgerMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </header>
  );
}
