// Supabase Edge Function: ai-allergens
//
// Calls Anthropic's Claude API to identify allergens & suggested dietary
// tags from a food description. Mirrors the prompt in spec §6A/§6B.
//
// Deploy:
//   supabase functions deploy ai-allergens
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Auth: requires a Supabase user session (verify_jwt = true by default).

// @ts-expect-error — Deno globals available at runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = (globalThis as { Deno?: { env: { get: (k: string) => string | undefined } } })
  .Deno?.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-haiku-4-5-20251001";

const ALLERGEN_CATEGORIES = [
  "Gluten", "Dairy", "Eggs", "Nuts", "Peanuts", "Shellfish", "Fish",
  "Soy", "Sesame", "Mustard", "Celery", "Lupin", "Molluscs", "Sulphites",
];

const DIETARY_CATEGORIES = [
  "Vegan", "Vegetarian", "Halal", "Kosher",
  "Gluten-Free", "Nut-Free", "Dairy-Free",
];

const SYSTEM_PROMPT = `You are a food-safety classifier for a peer-to-peer home-cooking marketplace.
Given a dish title and description, identify:
  1. Allergens present (only from this fixed list: ${ALLERGEN_CATEGORIES.join(", ")})
  2. Dietary tags that almost certainly apply (only from: ${DIETARY_CATEGORIES.join(", ")})

Be thorough about hidden and implied allergens — reason about the whole recipe, not just words you can see:
  - Ingredient synonyms and brand names (e.g. "Coca-Cola" → none, "Nutella" → Nuts + Dairy).
  - Compound sauces and prepared items that hide several allergens:
    "soy sauce" → Soy + Gluten; "béchamel" → Dairy + Gluten; "pesto" → Nuts + Dairy;
    "tempura" → Gluten; "fish sauce" → Fish; "sesame oil"/"tahini" → Sesame;
    "teriyaki" → Soy + Gluten; "mayonnaise"/"aioli" → Eggs.
  - Cuisine-based assumptions when an ingredient is strongly implied by a classic dish
    (e.g. paella usually contains shellfish; risotto usually contains dairy).
  - The description may be written in any language — English, Spanish, Turkish, Arabic, etc.
    Recognise allergen keywords across languages (e.g. "leche"/"süt" → Dairy, "trigo"/"buğday" → Gluten,
    "huevo"/"yumurta" → Eggs, "pescado"/"balık" → Fish).

Still avoid clear false positives: only flag an allergen when the dish realistically contains it.
Only suggest a dietary tag if you're confident it applies based on the description.

Return ONLY JSON with this exact shape — no prose, no markdown fences:
{"allergens": ["Gluten"], "dietary": ["Vegetarian"]}
Return empty arrays if nothing matches.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }
  if (!ANTHROPIC_API_KEY) {
    return json({ error: "ANTHROPIC_API_KEY not set on the function" }, 500);
  }

  let body: { title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const text = `${body.title ?? ""}\n\n${body.description ?? ""}`.trim();
  if (text.length < 3) return json({ allergens: [], dietary: [] });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    return json({ error: "anthropic failed", detail: err }, 502);
  }

  const data = await r.json() as { content?: Array<{ text?: string }> };
  const raw = data.content?.[0]?.text ?? "";
  let parsed: { allergens: string[]; dietary: string[] } = { allergens: [], dietary: [] };
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    // fall through with empty
  }

  return json({
    allergens: (parsed.allergens ?? []).filter((a) => ALLERGEN_CATEGORIES.includes(a)),
    dietary: (parsed.dietary ?? []).filter((d) => DIETARY_CATEGORIES.includes(d)),
  });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
