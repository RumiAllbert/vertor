export function KpiCard({
  label,
  value,
  hint,
  accent = "var(--ink)",
}: {
  label: string;
  value: string;
  hint?: string | null;
  accent?: string;
}) {
  return (
    <div
      className="relative overflow-hidden bg-background/88 px-6 py-7 backdrop-blur-[2px]"
      style={{ "--kpi-accent": accent } as React.CSSProperties}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 bg-[var(--kpi-accent)] opacity-75"
      />
      <span
        aria-hidden
        className="absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[var(--kpi-accent)] opacity-[0.09] blur-xl"
      />
      <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="display mt-3 text-[40px] leading-none text-foreground drop-shadow-[0_10px_24px_color-mix(in_oklch,var(--kpi-accent)_16%,transparent)] md:text-[48px]">
        {value}
      </div>
      {hint && (
        <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] italic text-muted-foreground">
          <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-ink/70" />
          {hint}
        </div>
      )}
    </div>
  );
}
