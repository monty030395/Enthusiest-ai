import Link from "next/link";
import type { Metadata } from "next";
import Masthead from "../_components/Masthead";

export const metadata: Metadata = {
  title: "Privacy Policy — Motormind",
  description: "Privacy policy for Motormind — NZ Car Buying Copilot.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-carbon-950 text-ink font-sans">

      <Masthead />

      <main className="max-w-3xl mx-auto px-5 py-12 space-y-10">

        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink tracking-tight">Privacy Policy</h1>
          <p className="mt-2 font-mono text-ink-faint text-xs">Last updated July 2026</p>
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
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Your Garage</h2>
          <div className="h-px bg-line" />
          <p className="text-ink-muted text-sm leading-relaxed">
            Completed checks are saved to your device&apos;s local browser storage (your Garage) so you can
            revisit and compare them. They never leave your device — nothing is uploaded, synced, or visible
            to us. You can remove individual checks or clear the lot at any time from the Garage page, and
            clearing your browser data removes them too.
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
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-ember-400">Shared links</h2>
          <div className="h-px bg-line" />
          <p className="text-ink-muted text-sm leading-relaxed">
            This is the one case where a check leaves your device. When you tap Share on a check or a tally,
            that single result is uploaded so it can be viewed at a motormind.nz link — no account, no name,
            nothing about you attached, just the analysis itself. The rest of your Garage stays local.
          </p>
          <p className="text-ink-muted text-sm leading-relaxed">
            Treat a shared link as public: anyone who has it can open it, and search engines could index it if
            it gets posted somewhere public. The stored file itself is private — it can only be read by
            Motormind to build that page, never fetched directly. Shared links are deleted automatically 90
            days after they are created. If you want one removed sooner, email the address below with the link.
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
