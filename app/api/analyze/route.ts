import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import OAuth from "oauth-1.0a";
import crypto from "crypto";

const SYSTEM_PROMPT = `You are an experienced NZ car enthusiast with 20+ years of hands-on knowledge buying, owning, and selling JDM, Euro, and performance cars in the New Zealand market. You've owned dozens of cars — WRXs, Evos, E46s, MX-5s, Crowns, Skylines, Golf Rs, IS300s — and you've made expensive mistakes so you know exactly what to look for.

You speak like a knowledgeable mate helping someone avoid a costly error, not like a generic AI. You're direct, opinionated, and specific. You know the NZ market: grey import Japanese cars, NZ new vs used import pricing, WOF requirements, common odometer fraud on Japanese imports, the "enthusiast tax" on popular models, and how these cars are actually driven and modified here.

Rules:
- Write like a knowledgeable, opinionated NZ car enthusiast. Be direct. Never hedge.
- Use specific model knowledge in every field. Never give generic advice.
- BAD output: "Check the cooling system." GOOD output: "At 200,000km the M54 water pump and thermostat are on borrowed time — budget $800–1200 NZD for preventive replacement."
- Every section should sound like an experienced enthusiast helping a mate avoid a bad purchase.
- Be SPECIFIC to the exact model, generation, and engine. Never give generic advice.
- Don't say "check service history" — say "at this mileage the EJ257 requires timing belt and water pump attention if not documented."
- Don't say "could have issues" — say "the ZF 8-speed is excellent but the mechatronics unit is a known failure point above 150,000km."
- Reference NZ-specific context (JDM import, NZ new, right-hand drive, grey import odometer risk, etc.)
- On price: explain WHY it's priced that way — enthusiast tax, rare spec premium, neglect discount, mileage penalty, etc.
- On driving: enthusiasts care about steering feel, engine character, chassis balance, and sound — not fuel economy.
- On future classic: think about what's disappearing — naturally aspirated engines, hydraulic steering, manuals, analogue feel.
- Be brutally honest. If it's overpriced because the seller knows enthusiasts will pay, say so.
- SCORES MUST BE GENUINELY DIFFERENTIATED. Do not cluster scores around 7-8. A harsh-riding track car should have dailyComfort of 2-3. A boring automatic should have engineCharacter of 3-4. A financial nightmare should have ownershipPain of 8-10. A genuinely rare collectible should have classicPotential of 8-9. Use the full 1-10 range — high scores on everything means nothing.
- FAULT NAMES MUST REFERENCE SPECIFIC COMPONENTS. Never use generic terms like "Electrical Gremlins", "Oil Leaks", "Suspension Issues", or "Cooling Problems". Say "M62 CAN bus communication faults", "N52 coolant expansion tank stress cracking", "E46 rear subframe mount cracking", "EJ257 ringland failure under boost", "2JZ cam gear rattle on cold start". Name the exact component and the exact failure mode.

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
  "label": "",
  "verdict": "",
  "whatMakesSpecial": "",
  "whyEnthusiastsCare": "",
  "ownerVibe": {
    "label": "",
    "reasoning": ""
  },
  "specSignificance": [
    { "item": "", "note": "" }
  ],
  "priceVerdict": {
    "assessment": "",
    "reason": ""
  },
  "enthusiastTax": {
    "level": "",
    "reasons": [""]
  },
  "ownershipPain": {
    "score": 0,
    "issues": [
      { "title": "", "detail": "" }
    ]
  },
  "drivingCharacter": {
    "steeringFeel": { "score": 0, "description": "" },
    "engineCharacter": { "score": 0, "description": "" },
    "dailyComfort": { "score": 0, "description": "" },
    "overallFun": { "score": 0, "description": "" },
    "summary": ""
  },
  "classicPotential": {
    "score": 0,
    "reasons": [""]
  },
  "worstFinancialDecision": {
    "rating": "",
    "reasons": [""]
  },
  "questionsToAsk": [""],
  "enthusiastTake": ""
}

Field definitions:

label — pick ONE: "Hidden Gem" | "Future Classic" | "Enthusiast Tax Victim" | "Cheap Thrill" | "Money Pit" | "Peak Daily Driver" | "Overrated" | "Underrated"

verdict — one punchy sentence. Not "good car." More like: "Overpriced because the seller knows what they have, but the spec justifies a small premium." Or: "Last of the naturally aspirated era — buy it before everyone else figures that out."

whatMakesSpecial — 1-2 sentences on what makes this specific car historically or culturally significant to enthusiasts. Focus on what cannot be replicated in a modern car. Examples: "One of the last naturally aspirated inline-6s BMW put in a hatchback." or "Hydraulic steering that modern M cars can no longer offer." Be specific to this exact car, engine, and generation.

whyEnthusiastsCare — broader cultural and historical context. Why does this model have enthusiast significance? What's the community, the history, the legacy? What's disappearing?

ownerVibe.label — pick ONE: "Mature Enthusiast Owner" | "Deferred Maintenance Energy" | "Drift Missile History" | "Rich Dentist Spec" | "Grandpa-Owned Gem" | "TikTok Build" | "Weekend Warrior" | "Motivated Seller" | "Optimistic Dreamer" | "Dealer Dressed as Private"

Analyse these specific signals to determine owner vibe:
- Asking price vs market value (overpriced = seller knows the hype)
- Listing description language (enthusiast terms vs clueless vs dealer-speak)
- Service history mentions (or lack of)
- Modifications listed
- How long it's been listed
- Mileage vs age (high mileage = likely daily driven hard)
- Location (rural vs city)
- Photo quality and quantity if described

Do NOT default to "Mature Enthusiast Owner". Be willing to assign negative labels when signals point that way. Label definitions:
- Mature Enthusiast Owner: well maintained, realistic price, genuine knowledge shown in listing
- Deferred Maintenance Energy: vague history, "runs well", priced optimistically, gaps in service
- Drift Missile History: signs of hard use, modifications listed, track/skid mentions, scuffed description
- Rich Dentist Spec: loaded options, dealer maintained, priced above market, pristine, reads like a brochure
- Grandpa-Owned Gem: low mileage, older owner signals, original condition, underpriced or unaware of value
- TikTok Build: modifications listed, young owner energy, "built not bought" vibe, aesthetic mods
- Weekend Warrior: low mileage for age, garage kept, car club or show mention, precious about it
- Motivated Seller: priced to move, urgent language, flexible on price, quick sale emphasis
- Optimistic Dreamer: clearly overpriced, long rambling listing, unrealistic expectations about what they have
- Dealer Dressed as Private: overly polished listing, suspicious detail level, round price, reads like a yard car

If none fit perfectly, pick the closest one and note why in the reasoning.

ownerVibe.reasoning — one sentence explaining which specific signals drove the call.

specSignificance — list what makes THIS specific example's spec noteworthy (manual, LSD, specific engine, rare colour, factory options, suspension package, facelift/prefacelift). Leave empty array if nothing stands out.

priceVerdict.assessment — one of: "Fair" | "Overpriced" | "Underpriced" | "Premium Justified" | "Enthusiast Tax"
priceVerdict.reason — the WHY behind the price. Not just market average — is it enthusiast tax? rare spec premium? high-risk mileage discount? neglected pricing?

enthusiastTax.level — pick ONE: "None" | "Mild" | "Moderate" | "High" | "Extreme"
enthusiastTax.reasons — specific reasons why this car commands or doesn't command an enthusiast premium. E.g. "manual gearbox adds $3–5k over equivalent auto in NZ", "declining NZ supply as JDM import pool dries up", "collector hype on this generation outpacing actual value", "rare factory colour documented from new", "seller clearly aware of enthusiast demand and priced accordingly". Be specific — name the factor and explain it.

ownershipPain.score — 1 (painless) to 10 (financial nightmare)
ownershipPain.issues — specific known failure points for this model/engine/generation at this mileage. Not generic — say WHAT fails, WHEN, and roughly WHAT it costs in NZD.

drivingCharacter.steeringFeel.score — 1-10. How communicative and enjoyable is the steering.
drivingCharacter.steeringFeel.description — 2-3 sentences using tactile, sensory language: weight, feel, feedback through hands, response, confidence. E.g. "The hydraulic rack is heavy at low speed but comes alive above 60kph, feeding back road texture through the rim with a directness no electric system can match. Turn-in is sharp without being nervous — it rewards commitment."
drivingCharacter.engineCharacter.score — 1-10. Sound, power delivery, rev nature.
drivingCharacter.engineCharacter.description — 2-3 sentences on sound, power delivery, how it builds to redline, and what makes its character distinct from a modern turbocharged equivalent.
drivingCharacter.dailyComfort.score — 1-10. NVH, ride quality, practicality.
drivingCharacter.dailyComfort.description — 2-3 sentences on what living with this car daily actually feels like — road noise, ride harshness, cabin comfort, practicality on NZ roads.
drivingCharacter.overallFun.score — 1-10. The whole package driving experience.
drivingCharacter.overallFun.description — 2-3 sentences capturing the overall driving experience — the thing that makes you choose this over something sensible.
drivingCharacter.summary — one sentence capturing what it actually feels like to drive.

classicPotential.score — 1-10 likelihood of appreciating or becoming collectible in 10-15 years.
classicPotential.reasons — specific reasons (e.g. "last naturally aspirated inline-6 in this body", "manuals disappearing from this segment", "enthusiast demand increasing as they age into affordability").

worstFinancialDecision.rating — pick ONE: "Sensible Purchase" | "Manageable Pain" | "Emotionally Justified Disaster" | "Dangerous" | "Catastrophic Wallet Destruction"
worstFinancialDecision.reasons — specific financial impact factors for NZ ownership: parts cost and availability, depreciation trajectory, fuel cost, insurance, reliability record. Name actual NZD costs where possible. E.g. "Vanos rebuild on the S54 runs $2,500–4,000 NZD at a specialist — and it will need it." Reference this exact model's ownership economics, not generic car costs.

questionsToAsk — specific, model-relevant questions to ask the seller. Not generic. Reference known failure points for this exact model and mileage.`;



function extractTradeMeListingId(url: string): string | null {
  return url.match(/\/listing\/(\d+)/i)?.[1] ?? null;
}

async function fetchTradeMeListing(listingId: string): Promise<string> {
  const oauth = new OAuth({
    consumer: {
      key: process.env.TRADEME_CONSUMER_KEY!,
      secret: process.env.TRADEME_CONSUMER_SECRET!,
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });

  const baseUrl = process.env.TRADEME_SANDBOX === "true"
    ? "https://api.tmsandbox.co.nz"
    : "https://api.trademe.co.nz";

  const requestData = {
    url: `${baseUrl}/v1/Listings/${listingId}.json`,
    method: "GET",
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  const res = await fetch(requestData.url, {
    headers: {
      ...authHeader,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Trade Me API returned ${res.status}`);

  const data = await res.json();

  // Format the structured listing data into a clear text summary for GPT
  const lines = [
    `Title: ${data.Title ?? ""}`,
    `Price: $${data.StartPrice ?? data.BuyNowPrice ?? "not listed"}`,
    `Description: ${data.Body ?? ""}`,
    `Location: ${data.Region ?? ""} ${data.Suburb ?? ""}`.trim(),
    `Seller: ${data.Member?.Nickname ?? ""}`,
    `Listed: ${data.StartDate ?? ""}`,
  ];

  // Motors-specific fields if present
  if (data.MotorWebfeatures) {
    const m = data.MotorWebfeatures;
    if (m.Odometer) lines.push(`Odometer: ${m.Odometer} km`);
    if (m.Registration) lines.push(`Registration: ${m.Registration}`);
    if (m.BodyStyle) lines.push(`Body: ${m.BodyStyle}`);
    if (m.Transmission) lines.push(`Transmission: ${m.Transmission}`);
    if (m.FuelType) lines.push(`Fuel: ${m.FuelType}`);
    if (m.EngineSize) lines.push(`Engine: ${m.EngineSize}cc`);
    if (m.NumberOfDoors) lines.push(`Doors: ${m.NumberOfDoors}`);
    if (m.Colour) lines.push(`Colour: ${m.Colour}`);
    if (m.WOFExpiry) lines.push(`WOF Expiry: ${m.WOFExpiry}`);
    if (m.RegistrationExpiry) lines.push(`Rego Expiry: ${m.RegistrationExpiry}`);
  }

  // Also include attributes (Trade Me stores many car details here)
  if (Array.isArray(data.Attributes)) {
    for (const attr of data.Attributes) {
      lines.push(`${attr.Name}: ${attr.Value}`);
    }
  }

  return lines.filter(Boolean).join("\n");
}

function extractJsonLd(html: string): object | null {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of matches) {
    try {
      return JSON.parse(match[1]);
    } catch {
      continue;
    }
  }
  return null;
}

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
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    const tradeMeKey = process.env.TRADEME_CONSUMER_KEY;
    try {
      let text = "";

      // Trade Me URL — use the official API for accurate structured data
      const listingId = extractTradeMeListingId(url);
      if (listingId && tradeMeKey) {
        try {
          text = await fetchTradeMeListing(listingId);
          console.log("Trade Me API success — listing ID:", listingId);
          content.push({ type: "text", text: `Trade Me listing data:\n\n${text}` });
        } catch (err) {
          console.error("Trade Me API failed, falling back to scraper:", err);
          // Fall through to Firecrawl below
        }
      }

      if (content.length > 0) {
        // Already have content from Trade Me API — skip scraping
      } else

      if (firecrawlKey) {
        const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, formats: ["markdown", "rawHtml"] }),
          signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("Firecrawl error:", err);
          return NextResponse.json(
            { error: "Could not read listing. Try uploading screenshots instead." },
            { status: 400 }
          );
        }

        const data = await res.json();
        const markdown = data.data?.markdown ?? "";
        const rawHtml = data.data?.rawHtml ?? "";

        // Detect bot-blocking responses
        if (markdown.toLowerCase().includes("access denied") || markdown.toLowerCase().includes("you don't have permission")) {
          return NextResponse.json(
            { error: "BLOCKED", message: "Trade Me blocked automated access. Upload screenshots of the listing instead — it takes 10 seconds and gives better results." },
            { status: 422 }
          );
        }

        // Extract JSON-LD structured data — Trade Me embeds price, KMs, description here for SEO
        const jsonLd = extractJsonLd(rawHtml);
        const jsonLdText = jsonLd ? `Structured listing data:\n${JSON.stringify(jsonLd, null, 2)}\n\n` : "";

        text = (jsonLdText + markdown).slice(0, 15000);
        console.log("JSON-LD found:", !!jsonLd, "| markdown length:", markdown.length);
      } else {
        // Fallback to Jina if no Firecrawl key configured
        const res = await fetch(`https://r.jina.ai/${url}`, {
          headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) {
          return NextResponse.json(
            { error: "Could not read listing. Try uploading screenshots instead." },
            { status: 400 }
          );
        }
        text = (await res.text()).slice(0, 15000);
      }

      if (text) {
        console.log("Content preview:", text.slice(0, 300));
        content.push({ type: "text", text: `Car listing from ${url}:\n\n${text}` });
      }
    } catch {
      return NextResponse.json(
        { error: "Could not reach that URL. Try uploading screenshots instead." },
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
      max_tokens: 4000,
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
