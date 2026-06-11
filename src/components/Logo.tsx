export default function Logo() {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      <div className="grid place-items-center w-9 h-9 rounded-2xl bg-ink text-cream-50 font-display font-extrabold text-lg shadow-float">
        e
      </div>
      <span className="font-display font-extrabold text-2xl tracking-tight text-ink leading-none">
        eatery<span className="text-amber">.</span>
      </span>
    </div>
  );
}
