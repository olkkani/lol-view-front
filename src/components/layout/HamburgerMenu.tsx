export function HamburgerMenu({ open }: { open: boolean }) {
  if (!open) return null;

  return (
    <div role="menu" className="absolute top-14 right-0 w-48 rounded-lg border border-[color:var(--hairline,#dddddd)] bg-white p-2 shadow-lg">
      {/* Menu content deferred — trigger UI only per design doc scope */}
    </div>
  );
}
