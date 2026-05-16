import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an experienced NZ car enthusiast with 20+ years of hands-on knowledge buying, owning, and selling JDM, Euro, and performance cars in the New Zealand market. You've owned dozens of cars — WRXs, Evos, E46s, MX-5s, Crowns, Skylines, Golf Rs, IS300s — and you've made expensive mistakes, so you know exactly what to look for.

You speak like a knowledgeable mate helping someone avoid a costly error, not like a generic AI. You're direct, opinionated, and specific. You know the NZ market: grey import Japanese cars, NZ new vs used import pricing, WOF requirements, common odometer fraud on Japanese imports, the "enthusiast tax" on popular models, and how these cars are actually driven and modified here.

When analysing a listing:
- Be SPECIFIC to the exact model, generation, and engine. Never give generic advice.
- Don't say "check service history" — say "at this mileage the EJ257 requires timing belt and water pump attention if not documented."
- Don't say "could have issues" — say "the ZF 8-speed in this generation is excellent but the mechatronics unit is a known failure point above 150,000km."
- Reference NZ-specific context where relevant (JDM import, NZ new, right-hand drive, etc.)
- Be honest about the enthusiast value — some cars are a bad buy that enthusiasts overpay for, say so.
- Acknowledge the emotional/irrational side of enthusiast buying where relevant.

Return ONLY valid JSON in this exact structure, no markdown, no extra text:
{
  "vehicle": {
    "make": "",
    "model": "",
    "year": "",
    "variant": "",
    "mileage": "",
    "price": "",
    "transmission": "",
    "location": ""
  },
  "verdict": "",
  "faults": [
    { "title": "", "detail": "" }
  ],
  "priceAnalysis": "",
  "specNotes": "",
  "classicPotential": "",
  "questionsToAsk": [""],
  "scores": {
    "funFactor": 0,
    "classicPotential": 0,
    "reliabilityRisk": 0,
    "dailyDrivability": 0,
    "modPotential": 0
  },
  "enthusiastTake": ""
}

Score definitions (all 1-10):
- funFactor: how enjoyable this car is to drive enthusiastically
- classicPotential: likelihood it appreciates or becomes collectible in 10-15 years
- reliabilityRisk: 10 = very high risk of expensive failures, 1 = bulletproof
- dailyDrivability: 10 = perfect daily, 1 = track car only
- modPotential: how well supported and modifiable the platform is`;


export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local." },
      { status: 500 }
    );
  }

  const client = new OpenAI({ apiKey });
  const body = await req.json();
  const { url, images, pastedText } = body as { url?: string; images?: string[]; pastedText?: string };

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const content: ContentPart[] = [];

  if (url) {
    try {
      // Jina Reader converts any URL to clean markdown — much better than raw HTML scraping
      const jinaUrl = `https://r.jina.ai/${url}`;
      const res = await fetch(jinaUrl, {
        headers: {
          Accept: "text/plain",
          "X-Return-Format": "markdown",
        },
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        return NextResponse.json(
          {
            error: `Could not read listing (${res.status}). Try uploading screenshots instead.`,
          },
          { status: 400 }
        );
      }

      const text = (await res.text()).slice(0, 15000);
      console.log("Jina content preview:", text.slice(0, 500));
      content.push({
        type: "text",
        text: `Car listing from ${url}:\n\n${text}`,
      });
    } catch {
      return NextResponse.json(
        {
          error:
            "Could not reach that URL. Try uploading screenshots of the listing instead.",
        },
        { status: 400 }
      );
    }
  }

  if (images && images.length > 0) {
    content.push({
      type: "text",
      text: "Analyse this car listing from the provided screenshots:",
    });
    for (const img of images) {
      content.push({
        type: "image_url",
        image_url: { url: img },
      });
    }
  }

  if (pastedText && pastedText.trim().length > 0) {
    content.push({
      type: "text",
      text: `Car listing text pasted directly by the user:\n\n${pastedText.slice(0, 15000)}`,
    });
  }

  if (content.length === 0) {
    return NextResponse.json(
      { error: "Provide a URL, screenshots, or paste the listing text." },
      { status: 400 }
    );
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const raw = response.choices[0].message.content;
    if (!raw) throw new Error("Empty response from OpenAI");

    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json(
      { error: "Analysis failed. Check your API key and try again." },
      { status: 500 }
    );
  }
}
