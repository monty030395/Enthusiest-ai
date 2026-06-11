import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Motormind",
  description: "Privacy policy for Motormind — NZ Car Buying Copilot.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-carbon-950 text-ink font-sans">

      <header className="sticky top-0 z-40 px-6 pt-4 pb-3.5 border-b border-line bg-carbon-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-display text-lg font-extrabold tracking-tight uppercase leading-none">
              <span className="text-ink">Motor</span>
              <span className="text-ember-400">mind</span>
            </span>
            <div className="h-3.5 w-px bg-line-strong" />
            <span className="font-mono text-[9px] uppercase tracking-[0.28em] text-ink-faint">NZ Car Copilot</span>
          </Link>
          <div className="h-1.5 w-1.5 rounded-full bg-ember-400 animate-pulse" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 space-y-10">

        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">Privacy Policy</h1>
          <p className="mt-2 font-mono text-ink-faint text-xs">Last updated May 2025</p>
        </div>

        <section className="space-y-3">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Data we collect</h2>
          <div className="h-px bg-line" />
          <p className="text-ink-muted text-sm leading-relaxed">
            Motormind does not collect, store, or retain any personal data. We do not require an account,
            login, or any identifying information to use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Listing data</h2>
          <div className="h-px bg-line" />
          <p className="text-ink-muted text-sm leading-relaxed">
            Listing content you submit — whether screenshots or pasted text — is used solely
            to generate your analysis. It is not stored, logged, or cached after your request is complete.
            Each analysis is generated fresh on demand.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">AI processing</h2>
          <div className="h-px bg-line" />
          <p className="text-ink-muted text-sm leading-relaxed">
            Listing content is sent to OpenAI&apos;s API to generate your analysis. This is subject to{" "}
            <a
              href="https://openai.com/policies/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-2 decoration-ember-500/50 hover:decoration-ember-400 transition-colors"
            >
              OpenAI&apos;s privacy policy
            </a>
            . We do not send any personal information to OpenAI — only the listing content you provide.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Cookies &amp; tracking</h2>
          <div className="h-px bg-line" />
          <p className="text-ink-muted text-sm leading-relaxed">
            Motormind does not use cookies, analytics, or any third-party tracking tools.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Contact</h2>
          <div className="h-px bg-line" />
          <p className="text-ink-muted text-sm leading-relaxed">
            Privacy questions can be sent to{" "}
            <a
              href="mailto:monty.wood1289@gmail.com"
              className="text-ink underline underline-offset-2 decoration-ember-500/50 hover:decoration-ember-400 transition-colors"
            >
              monty.wood1289@gmail.com
            </a>
          </p>
        </section>

        <div className="pt-4">
          <Link
            href="/"
            className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-ink-faint hover:text-ink-muted transition-colors"
          >
            ← Back to app
          </Link>
        </div>

      </main>
    </div>
  );
}
