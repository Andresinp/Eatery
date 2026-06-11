// Mock AI allergen detector — local keyword pass.
// Will be replaced with a Claude API call (see spec §6A).

const RULES: Record<string, string[]> = {
  Gluten: [
    "wheat", "flour", "bread", "pasta", "noodle", "noodles", "couscous",
    "bulgur", "barley", "rye", "soy sauce", "panko", "cracker", "cake",
    "lasagna", "dough", "sourdough", "ramen", "udon",
  ],
  Dairy: [
    "milk", "butter", "cream", "cheese", "yogurt", "ricotta", "parmesan",
    "mozzarella", "feta", "ghee", "béchamel", "bechamel",
  ],
  Eggs: ["egg", "eggs", "mayonnaise", "mayo", "meringue", "custard"],
  Nuts: [
    "almond", "almonds", "walnut", "walnuts", "pecan", "pecans", "cashew",
    "cashews", "pistachio", "pistachios", "hazelnut", "hazelnuts",
    "macadamia",
  ],
  Peanuts: ["peanut", "peanuts"],
  Shellfish: [
    "shrimp", "prawn", "prawns", "crab", "lobster", "langoustine",
    "scallop", "scallops",
  ],
  Fish: [
    "fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "sardine",
    "sardines", "mackerel",
  ],
  Soy: ["soy", "soya", "tofu", "edamame", "miso", "tempeh"],
  Sesame: ["sesame", "tahini", "halva"],
  Mustard: ["mustard"],
  Celery: ["celery", "celeriac"],
  Sulphites: ["wine", "vinegar"],
  Molluscs: ["mussel", "mussels", "clam", "clams", "oyster", "oysters", "squid", "octopus"],
};

const DIETARY_BLOCKERS: Record<string, string[]> = {
  Vegan: ["Dairy", "Eggs", "Fish", "Shellfish", "Molluscs"],
  Vegetarian: ["Fish", "Shellfish", "Molluscs"],
  "Gluten-Free": ["Gluten"],
  "Nut-Free": ["Nuts", "Peanuts"],
  "Dairy-Free": ["Dairy"],
};

const MEAT_HINTS = [
  "chicken", "beef", "pork", "lamb", "veal", "duck", "turkey", "ham",
  "bacon", "sausage", "chorizo", "prosciutto", "tagine",
];

export interface AllergenResult {
  allergens: string[];
  suggestedDietary: string[];
}

export function detectAllergens(text: string): AllergenResult {
  const lower = ` ${text.toLowerCase()} `;
  const allergens: string[] = [];
  for (const [allergen, keywords] of Object.entries(RULES)) {
    if (keywords.some((k) => lower.includes(` ${k} `) || lower.includes(`${k},`) || lower.includes(`${k}.`) || lower.includes(`${k}s `))) {
      allergens.push(allergen);
    }
  }

  const hasMeat = MEAT_HINTS.some((m) => lower.includes(m));
  const suggestedDietary: string[] = [];

  for (const [tag, blockers] of Object.entries(DIETARY_BLOCKERS)) {
    if (tag === "Vegan" && hasMeat) continue;
    if (tag === "Vegetarian" && hasMeat) continue;
    if (blockers.every((b) => !allergens.includes(b))) {
      suggestedDietary.push(tag);
    }
  }

  return { allergens, suggestedDietary };
}
