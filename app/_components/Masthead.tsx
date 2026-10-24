"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { setRoastMode, useRoastMode } from "../_lib/roastMode";
import { GuardedSwitch } from "./ui";

// Sticky glass masthead, shared by every page.
export default function Masthead({ active }: { active?: "analyse" | "garage" }) {
  const pathname = usePathname();
  const linkBase = "font-mono text-[10px] uppercase tracking-[0.2em] transition-colors py-2";
  const [menuOpen, setMenuOpen] = useState(false);
  const roastMode = useRoastMode();

  useEffect(() => {
    if (!menuOpen) return;
    function closeOnEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

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
    <header className="sticky top-0 z-40 px-6 py-2 border-b border-line bg-carbon-950">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={scrollToTopIfSamePage("/")}
            className="font-display text-lg font-bold tracking-[0.06em] uppercase leading-none text-glow-400 [text-shadow:0_0_8px_rgba(169,216,255,0.45)]"
          >
            Motormind
          </Link>
          <div className="hidden sm:block h-3.5 w-px bg-line-strong" />
          <span className="hidden sm:block font-mono text-[9px] uppercase tracking-[0.28em] text-ink-faint whitespace-nowrap">NZ Car Copilot</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            onClick={scrollToTopIfSamePage("/")}
            className={`${linkBase} ${active === "analyse" ? "text-glow-400" : "text-ink-faint hover:text-ink-muted"}`}
          >
            Analyse
          </Link>
          <Link
            href="/garage"
            onClick={scrollToTopIfSamePage("/garage")}
            className={`${linkBase} ${active === "garage" ? "text-glow-400" : "text-ink-faint hover:text-ink-muted"}`}
          >
            Garage
          </Link>
          {/* Extras live behind the menu, not on the analyser — Roast Mode
              is likely to become a paid add-on */}
          <div className="relative">
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="relative w-8 h-8 -mr-1.5 flex flex-col items-center justify-center gap-[3px] text-ink-faint hover:text-ink-muted transition-colors"
            >
              <span className="block w-4 h-px bg-current" />
              <span className="block w-4 h-px bg-current" />
              <span className="block w-4 h-px bg-current" />
              {roastMode && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-needle shadow-[0_0_6px_var(--color-needle)]" />}
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close menu"
                  tabIndex={-1}
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-xl border border-line-strong bg-carbon-900 p-4 space-y-3 shadow-2xl">
                  <GuardedSwitch checked={roastMode} onChange={setRoastMode} label="Roast Mode" />
                  <p className="text-xs text-ink-faint leading-relaxed">
                    Same verdict, savage delivery. Stays on for every check until you turn it off.
                  </p>
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
