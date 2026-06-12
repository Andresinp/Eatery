import { supabase } from "./supabase";
import { detectAllergens as localDetect } from "./allergens";

export interface AIAllergenResult {
  allergens: string[];
  dietary: string[];
  source: "claude" | "local";
}

export async function detectAllergensAI(args: {
  title: string;
  description: string;
}): Promise<AIAllergenResult> {
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke<{
        allergens: string[];
        dietary: string[];
      }>("ai-allergens", { body: args });
      if (!error && data) {
        return { allergens: data.allergens, dietary: data.dietary, source: "claude" };
      }
    } catch {
      // fall through to local
    }
  }
  const r = localDetect(`${args.title} ${args.description}`);
  return {
    allergens: r.allergens,
    dietary: r.suggestedDietary,
    source: "local",
  };
}

export async function generateDescriptionAI(args: {
  title: string;
  listing_type: "table" | "market";
  ingredients?: string;
  cuisine?: string;
  occasion?: string;
}): Promise<{ description: string; source: "claude" | "fallback" }> {
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke<{ description: string }>(
        "ai-describe",
        { body: args },
      );
      if (!error && data?.description) {
        return { description: data.description, source: "claude" };
      }
    } catch {
      // fall through
    }
  }
  // Local fallback — a graceful stub.
  const cuisine = args.cuisine ? `${args.cuisine} ` : "";
  const ingredients = args.ingredients ? `, made with ${args.ingredients.trim()}` : "";
  const intro =
    args.listing_type === "market"
      ? `Homemade ${cuisine}${args.title.toLowerCase()}${ingredients}.`
      : `A ${cuisine}${args.title.toLowerCase()} dinner at my place${ingredients}.`;
  return {
    description: `${intro} Made the way I'd cook it for friends — come hungry. Set up Supabase + the ai-describe Edge Function to get the AI-written version.`,
    source: "fallback",
  };
}
