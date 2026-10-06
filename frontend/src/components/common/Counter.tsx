import { Minus, Plus } from "lucide-react";

interface CounterProps {
  label: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

/** Airbnb's "– 2 +" stepper row used in the guest picker, filters and host form. */
export function Counter({ label, description, value, min = 0, max = 16, onChange }: CounterProps) {
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line";
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <div className="font-semibold text-ink">{label}</div>
        {description && <div className="text-sm text-muted">{description}</div>}
      </div>
      <div className="flex items-center gap-4">
        <button type="button" aria-label={`Decrease ${label}`} className={btn} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
        <span className="w-5 text-center tabular-nums">{value}</span>
        <button type="button" aria-label={`Increase ${label}`} className={btn} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
