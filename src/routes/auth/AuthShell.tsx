import Logo from "../../components/Logo";

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-cream-50 flex flex-col">
      <header className="px-4 pt-5">
        <Logo />
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] rounded-3xl border-2 border-ink/90 bg-white shadow-float p-6 sm:p-8 space-y-5">
          <div>
            <h1 className="font-display font-extrabold text-3xl leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-ink/60 mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
