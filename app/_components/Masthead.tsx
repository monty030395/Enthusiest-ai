import Link from "next/link";

// Sticky glass masthead, shared by every page. No hooks — safe to render
// from server components (privacy page) and client components alike.
export default function Masthead({ active }: { active?: "analyse" | "garage" }) {
  const linkBase = "font-mono text-[10px] uppercase tracking-[0.2em] transition-colors py-2";
  return (
    <header className="sticky top-0 z-40 px-6 py-2 border-b border-line bg-carbon-950/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight uppercase leading-none">
            <span className="text-ink">Motor</span>
            <span className="text-ember-400">mind</span>
          </Link>
          <div className="hidden sm:block h-3.5 w-px bg-line-strong" />
          <span className="hidden sm:block font-mono text-[9px] uppercase tracking-[0.28em] text-ink-faint whitespace-nowrap">NZ Car Copilot</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className={`${linkBase} ${active === "analyse" ? "text-ember-400" : "text-ink-faint hover:text-ink-muted"}`}
          >
            Analyse
          </Link>
          <Link
            href="/garage"
            className={`${linkBase} ${active === "garage" ? "text-ember-400" : "text-ink-faint hover:text-ink-muted"}`}
          >
            Garage
          </Link>
          <div className="h-1.5 w-1.5 rounded-full bg-ember-400 animate-pulse" />
        </nav>
      </div>
    </header>
  );
}
