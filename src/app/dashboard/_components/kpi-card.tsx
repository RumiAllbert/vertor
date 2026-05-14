export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | null;
}) {
  return (
    <div className="bg-background px-6 py-7">
      <div className="text-[10.5px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="display mt-3 text-[40px] leading-none md:text-[48px]">
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
