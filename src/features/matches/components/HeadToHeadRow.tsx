export function HeadToHeadRow() {
  return (
    <div className="flex items-center gap-2 pt-2">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          data-testid="h2h-dot"
          className="size-3 rounded-full bg-[color:var(--muted-soft,#929292)]"
        />
      ))}
    </div>
  );
}
