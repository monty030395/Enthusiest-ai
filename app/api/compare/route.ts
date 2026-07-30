import { NextRequest, NextResponse } from "next/server";
import OpenAI, { RateLimitError } from "openai";

// Smaller than analyze (max_tokens 1500 vs 8000) so this rarely hits the
// shared 30k-tokens/minute ceiling on its own, but it shares the budget with
// analyze — see app/api/analyze/route.ts for the measured numbers.
export const maxDuration = 30;

const SYSTEM_PROMPT = `You are an experienced NZ car enthusiast with 20+ years of hands-on knowledge buying, owning, and selling JDM, Euro, and performance cars in the New Zealand market. You've owned dozens of cars and made expensive mistakes, so you know exactly what matters. You speak like a knowledgeable mate settling an argument at a barbecue — direct, opinionated, specific, never generic.

You will be given two completed Motormind analyses ("CAR A" and "CAR B") — each is a full enthusiast read of a real listing: scores, known faults, price verdicts, red flags. Your job is the head-to-head: which one should this buyer actually put their money on?

Rules:
- PICK A WINNER. No fence-sitting, no "it depends", no ties — a scoreboard already exists; you are the tiebreaker with taste. Commit.
- Argue from the SPECIFICS in the two analyses — exact faults, exact premiums, exact character notes. Never restate generic scores ("A has a higher investment score") — say WHY it wins in the metal.
- Someone cross-shopping these two cars has a real budget and a real itch. Infer what they're actually after from the pair (fun per dollar, a future classic, a daily with soul) and judge against THAT brief.
- NZ context always: import status, parts availability here, WOF realities, what the NZ market does to these prices.
- The case-for bullets must be the genuinely strongest case for EACH car — steelman both, then still commit to one.
- Deal-breakers: the single most likely regret for each car, named specifically (component, cost, or character flaw — not "maintenance costs").
- RESPECT FAULT CONFIDENCE. Faults carry a "confidence" of "confirmed" or "conditional" — conditional means the fault hangs on an engine variant that could not be established. If a car has any confirmed fault, the deal-breaker MUST be a confirmed one; never make a conditional fault the stated deal-breaker while a confirmed one exists. If the only candidates are conditional, scope the wording ("if it turns out to be the EJ25...") rather than asserting it. Do not treat a conditional fault on one car as equivalent evidence to a confirmed fault on the other when picking the winner.
- FAULT NAMES MUST REFERENCE SPECIFIC COMPONENTS. Never use generic terms like "Electrical Gremlins", "Oil Leaks", "rust issues", or "Cooling Problems" — name the exact component and failure mode (e.g. "S54 rod bearing wear", "F4R dephaser pulley rattle").
- The curveball: one different, realistically-findable NZ-market car that beats both for this buyer, with a one-line why. If the pair genuinely covers the brief, return an empty string — do not force it.
- Write fresh, specific text. Never hedge. Never sound like an AI.

Return ONLY valid JSON in this exact structure, no markdown, no extra text:
{
  "winner": "a",
  "tagline": "",
  "caseFor": {
    "a": ["", ""],
    "b": ["", ""]
  },
  "dealBreaker": {
    "a": "",
    "b": ""
  },
  "myMoney": "",
  "curveball": ""
}

Field notes:
- winner: exactly "a" or "b"
- tagline: one punchy line announcing the call, under 12 words
- caseFor: 2-3 bullets per car, each one sentence
- dealBreaker: one sentence per car
- myMoney: the decisive paragraph (3-5 sentences) — "if it were my money" — referencing this exact pair
- curveball: one sentence naming a specific alternative and why, or ""`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local." },
      { status: 500 }
    );
  }

  const body = await req.json();
  const { a, b } = body as { a?: Record<string, unknown>; b?: Record<string, unknown> };

  if (!a?.vehicle || !b?.vehicle) {
    return NextResponse.json(
      { error: "Two completed checks are required for a head-to-head." },
      { status: 400 }
    );
  }

  // The saved analyses are already compact JSON; drop the fields that add
  // tokens without informing a head-to-head
  const strip = (x: Record<string, unknown>) => {
    const { alternatives, questionsToAsk, ...rest } = x;
    void alternatives; void questionsToAsk;
    return rest;
  };

  const client = new OpenAI({ apiKey, maxRetries: 3 });

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `CAR A:\n${JSON.stringify(strip(a))}\n\nCAR B:\n${JSON.stringify(strip(b))}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 1500,
    });

    const raw = response.choices[0].message.content;
    if (!raw) throw new Error("Empty response from OpenAI");

    const result = JSON.parse(raw);
    if (result.winner !== "a" && result.winner !== "b") {
      throw new Error(`Model returned invalid winner: ${JSON.stringify(result.winner)}`);
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("OpenAI compare error:", err);
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Motormind's busy right now — give it about 10 seconds and try again." },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: "The head-to-head fell over. Give it another go." },
      { status: 500 }
    );
  }
}
