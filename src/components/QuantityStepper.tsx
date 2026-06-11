export default function QuantityStepper({
  value,
  min = 1,
  max,
  unit,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  unit: string;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-ink/90 bg-cream-50">
      <div>
        <div className="text-xs text-ink/60 uppercase tracking-wider">Quantity</div>
        <div className="font-display font-bold text-lg leading-tight">
          {value} {value === 1 ? unit : `${unit}s`}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label="Decrease"
          className="w-10 h-10 rounded-full border-2 border-ink grid place-items-center disabled:opacity-30"
        >
          −
        </button>
        <span className="w-8 text-center font-display font-bold text-lg">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label="Increase"
          className="w-10 h-10 rounded-full border-2 border-ink grid place-items-center disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}
