"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sticky glass masthead, shared by every page.
export default function Masthead({ active }: { active?: "analyse" | "garage" }) {
  const pathname = usePathname();
  const linkBase = "font-mono text-[10px] uppercase tracking-[0.2em] transition-colors py-2";

  // Results run 6+ screens with nothing bringing you back up. Tapping a nav
  // link that targets the page you're already on scrolls to top instead of
  // doing nothing (a Link to the current route is otherwise a no-op). A
  // link to a different page still just navigates, same as before.
  function scrollToTopIfSamePage(href: string) {
    return (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname === href) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
  }

  return (
    <header className="sticky top-0 z-40 px-6 py-2 border-b border-line bg-carbon-950/80 backdrop-blur-md">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={scrollToTopIfSamePage("/")}
            className="font-display text-lg font-extrabold tracking-tight uppercase leading-none"
          >
            <span className="text-ink">Motor</span>
            <span className="text-ember-400">mind</span>
          </Link>
          <div className="hidden sm:block h-3.5 w-px bg-line-strong" />
          <span className="hidden sm:block font-mono text-[9px] uppercase tracking-[0.28em] text-ink-faint whitespace-nowrap">NZ Car Copilot</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            onClick={scrollToTopIfSamePage("/")}
            className={`${linkBase} ${active === "analyse" ? "text-ember-400" : "text-ink-faint hover:text-ink-muted"}`}
          >
            Analyse
          </Link>
          <Link
            href="/garage"
            onClick={scrollToTopIfSamePage("/garage")}
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
