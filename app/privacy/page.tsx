import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — EnthusiastAI",
  description: "Privacy policy for EnthusiastAI — NZ Car Buying Copilot.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans">

      <header className="px-6 pt-5 pb-4 border-b border-zinc-800/60">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-lg font-black tracking-tight text-white uppercase">Enthusiast</span>
              <span className="text-lg font-black tracking-tight text-red-500 uppercase">AI</span>
            </div>
            <div className="h-4 w-px bg-zinc-700" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">NZ Car Copilot</span>
          </Link>
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 space-y-10">

        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Privacy Policy</h1>
          <p className="mt-2 text-zinc-500 text-sm">Last updated May 2025</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Data we collect</h2>
          <div className="h-px bg-zinc-800" />
          <p className="text-zinc-400 text-sm leading-relaxed">
            EnthusiastAI does not collect, store, or retain any personal data. We do not require an account,
            login, or any identifying information to use the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Listing data</h2>
          <div className="h-px bg-zinc-800" />
          <p className="text-zinc-400 text-sm leading-relaxed">
            Listing content you submit — whether a Trade Me URL, screenshots, or pasted text — is used solely
            to generate your analysis. It is not stored, logged, or cached after your request is complete.
            Each analysis is generated fresh on demand.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">AI processing</h2>
          <div className="h-px bg-zinc-800" />
          <p className="text-zinc-400 text-sm leading-relaxed">
            Listing content is sent to OpenAI&apos;s API to generate your analysis. This is subject to{" "}
            <a
              href="https://openai.com/policies/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 underline underline-offset-2 hover:text-white transition-colors"
            >
              OpenAI&apos;s privacy policy
            </a>
            . We do not send any personal information to OpenAI — only the listing content you provide.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Cookies &amp; tracking</h2>
          <div className="h-px bg-zinc-800" />
          <p className="text-zinc-400 text-sm leading-relaxed">
            EnthusiastAI does not use cookies, analytics, or any third-party tracking tools.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">Contact</h2>
          <div className="h-px bg-zinc-800" />
          <p className="text-zinc-400 text-sm leading-relaxed">
            Privacy questions can be sent to{" "}
            <a
              href="mailto:monty.wood1289@gmail.com"
              className="text-zinc-300 underline underline-offset-2 hover:text-white transition-colors"
            >
              monty.wood1289@gmail.com
            </a>
          </p>
        </section>

        <div className="pt-4">
          <Link
            href="/"
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            ← Back to app
          </Link>
        </div>

      </main>
    </div>
  );
}
