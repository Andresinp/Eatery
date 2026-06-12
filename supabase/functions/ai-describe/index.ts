// Supabase Edge Function: ai-describe
//
// Generates a 2-3 sentence appealing description for a listing, given
// title and a few keywords. Spec §6C.
//
// Deploy:
//   supabase functions deploy ai-describe

// @ts-expect-error — Deno globals available at runtime
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const ANTHROPIC_API_KEY = (globalThis as { Deno?: { env: { get: (k: string) => string | undefined } } })
  .Deno?.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-haiku-4-5-20251001";

const SYSTEM_PROMPT = `You write warm, concise listing descriptions for a peer-to-peer home-cooking marketplace.
Your job: take a host's notes about a dish or homemade product and return a 2–3 sentence appealing description that:
  - Sounds like a real person who cooks at home, not a restaurant
  - Mentions the key ingredients or technique
  - Hints at the experience or feeling, briefly
  - Avoids hype words like "amazing", "ultimate", "best"
  - Is between 30 and 70 words total

Return ONLY the description text. No preamble, no quotes, no markdown.`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  if (!ANTHROPIC_API_KEY) return json({ error: "ANTHROPIC_API_KEY not set" }, 500);

  let body: {
    title?: string;
    listing_type?: "table" | "market";
    ingredients?: string;
    cuisine?: string;
    occasion?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const userPrompt = [
    `Title: ${body.title ?? "(no title yet)"}`,
    `Type: ${body.listing_type === "market" ? "homemade product for sale" : "shared meal at home"}`,
    body.cuisine && `Cuisine / style: ${body.cuisine}`,
    body.ingredients && `Key ingredients or notes: ${body.ingredients}`,
    body.occasion && `Occasion / vibe: ${body.occasion}`,
  ]
    .filter(Boolean)
    .join("\n");

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    return json({ error: "anthropic failed", detail: err }, 502);
  }

  const data = await r.json() as { content?: Array<{ text?: string }> };
  const description = (data.content?.[0]?.text ?? "").trim();
  return json({ description });
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
