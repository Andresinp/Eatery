// Local allergen / dietary keyword scan.
// A best-effort offline pass that runs when the Claude-backed
// "ai-allergens" Edge Function isn't reachable (see lib/ai.ts).
//
// Goals (spec §5):
//  - ingredient synonyms
//  - common recipes / compound dishes that hide several allergens
//  - cuisine-based assumptions
//  - multilingual keywords (English, Spanish, Turkish — Arabic later)
//
// Everything the scan flags is only a *suggestion*; the host always
// gets the final say in the UI.

// Compound dishes / sauces that imply more than one allergen at once.
// These are checked first so e.g. "soy sauce" flags both Soy and Gluten,
// not just Soy.
const COMPOUNDS: Record<string, string[]> = {
  "soy sauce": ["Soy", "Gluten"],
  "salsa de soja": ["Soy", "Gluten"],
  "soya sauce": ["Soy", "Gluten"],
  "soja sosu": ["Soy", "Gluten"],
  teriyaki: ["Soy", "Gluten"],
  "fish sauce": ["Fish"],
  "salsa de pescado": ["Fish"],
  "nuoc mam": ["Fish"],
  "oyster sauce": ["Molluscs", "Soy", "Gluten"],
  worcestershire: ["Fish", "Gluten"],
  "sesame oil": ["Sesame"],
  "aceite de sésamo": ["Sesame"],
  "susam yağı": ["Sesame"],
  tahini: ["Sesame"],
  tahin: ["Sesame"],
  hummus: ["Sesame"],
  humus: ["Sesame"],
  halva: ["Sesame"],
  helva: ["Sesame"],
  baklava: ["Nuts", "Gluten"],
  pesto: ["Nuts", "Dairy"],
  béchamel: ["Dairy", "Gluten"],
  bechamel: ["Dairy", "Gluten"],
  besamel: ["Dairy", "Gluten"],
  carbonara: ["Eggs", "Dairy", "Gluten"],
  lasagna: ["Gluten", "Dairy"],
  lasaña: ["Gluten", "Dairy"],
  lasagne: ["Gluten", "Dairy"],
  tempura: ["Gluten"],
  katsu: ["Gluten", "Eggs"],
  tonkatsu: ["Gluten", "Eggs"],
  tzatziki: ["Dairy"],
  cacık: ["Dairy"],
  ranch: ["Dairy", "Eggs"],
  aioli: ["Eggs"],
  alioli: ["Eggs"],
  mayonnaise: ["Eggs"],
  mayonesa: ["Eggs"],
  mayonez: ["Eggs"],
  marzipan: ["Nuts"],
  mazapán: ["Nuts"],
  nutella: ["Nuts", "Dairy"],
  satay: ["Peanuts"],
  "pad thai": ["Peanuts", "Eggs", "Fish"],
  romesco: ["Nuts"],
  frangipane: ["Nuts", "Eggs", "Dairy"],
  croquetas: ["Dairy", "Gluten"],
  croquettes: ["Dairy", "Gluten"],
  börek: ["Gluten", "Dairy"],
  borek: ["Gluten", "Dairy"],
  manti: ["Gluten", "Eggs"],
  mantı: ["Gluten", "Eggs"],
  gözleme: ["Gluten"],
  gozleme: ["Gluten"],
  ramen: ["Gluten", "Soy"],
  udon: ["Gluten"],
  ravioli: ["Gluten", "Eggs"],
  gnocchi: ["Gluten"],
  paella: ["Shellfish", "Molluscs", "Fish"],
};

// Single-ingredient keyword lists per allergen category.
// Multilingual: English / Spanish (es) / Turkish (tr).
const RULES: Record<string, string[]> = {
  Gluten: [
    "wheat", "trigo", "buğday", "flour", "harina", "un",
    "bread", "pan", "ekmek", "pasta", "macarrones", "makarna",
    "noodle", "noodles", "fideos", "erişte", "couscous", "cuscús", "kuskus",
    "bulgur", "bulgur", "barley", "cebada", "arpa", "rye", "centeno", "çavdar",
    "panko", "cracker", "galleta", "cake", "pastel", "tarta", "pasta",
    "dough", "masa", "hamur", "sourdough", "semolina", "sémola",
    "pita", "pide", "lavash", "lavaş", "yufka", "seitan", "seitán",
    "breadcrumb", "breadcrumbs", "pan rallado", "galette", "pancake",
    "crêpe", "crepe", "waffle", "tortilla de trigo", "pretzel",
  ],
  Dairy: [
    "milk", "leche", "süt", "butter", "mantequilla", "tereyağı",
    "cream", "crema", "nata", "krema", "kaymak",
    "cheese", "queso", "peynir", "yogurt", "yoghurt", "yogur", "yoğurt",
    "ricotta", "parmesan", "parmesano", "parmezan", "mozzarella",
    "feta", "ghee", "mascarpone", "gruyère", "gouda", "cheddar",
    "labneh", "kefir", "kéfir", "süzme",
  ],
  Eggs: [
    "egg", "eggs", "huevo", "huevos", "yumurta",
    "meringue", "merengue", "beze", "custard", "natilla", "albumen",
    "omelette", "tortilla", "frittata", "quiche",
  ],
  Nuts: [
    "almond", "almonds", "almendra", "almendras", "badem",
    "walnut", "walnuts", "nuez", "nueces", "ceviz",
    "pecan", "pecans", "cashew", "cashews", "anacardo", "anacardos", "kaju",
    "pistachio", "pistachios", "pistacho", "pistachos", "fıstık", "antep fıstığı",
    "hazelnut", "hazelnuts", "avellana", "avellanas", "fındık",
    "macadamia", "pine nut", "pine nuts", "piñones", "çam fıstığı",
    "praline", "praliné", "nougat", "turrón", "gianduja",
  ],
  Peanuts: ["peanut", "peanuts", "cacahuete", "cacahuetes", "maní", "yer fıstığı"],
  Shellfish: [
    "shrimp", "prawn", "prawns", "gamba", "gambas", "camarón", "camarones", "karides",
    "crab", "cangrejo", "yengeç", "lobster", "langosta", "ıstakoz",
    "langoustine", "cigala", "scallop", "scallops", "vieira", "vieiras", "tarak",
    "crawfish", "crayfish", "cigalas",
  ],
  Fish: [
    "fish", "pescado", "balık", "salmon", "salmón", "som balığı",
    "tuna", "atún", "ton balığı", "cod", "bacalao", "morina",
    "anchovy", "anchovies", "anchoa", "anchoas", "boquerón", "hamsi", "ançuez",
    "sardine", "sardines", "sardina", "sardinas", "sardalya",
    "mackerel", "caballa", "uskumru", "trout", "trucha", "alabalık",
    "haddock", "halibut", "sea bass", "lubina", "levrek", "dorada", "çipura",
  ],
  Soy: [
    "soy", "soya", "soja", "soja", "tofu", "edamame",
    "miso", "tempeh", "tamari", "soy lecithin", "lecitina de soja",
  ],
  Sesame: ["sesame", "sésamo", "susam", "tahini", "tahin", "halva", "helva"],
  Mustard: ["mustard", "mostaza", "hardal"],
  Celery: ["celery", "apio", "kereviz", "celeriac"],
  Sulphites: ["wine", "vino", "şarap", "vinegar", "vinagre", "sirke", "sulphite", "sulfite", "sulfito"],
  Molluscs: [
    "mussel", "mussels", "mejillón", "mejillones", "midye",
    "clam", "clams", "almeja", "almejas",
    "oyster", "oysters", "ostra", "ostras", "istiridye",
    "squid", "calamar", "calamares", "kalamar", "octopus", "pulpo", "ahtapot",
    "cuttlefish", "sepia", "snail", "caracol", "escargot",
  ],
};

const DIETARY_BLOCKERS: Record<string, string[]> = {
  Vegan: ["Dairy", "Eggs", "Fish", "Shellfish", "Molluscs"],
  Vegetarian: ["Fish", "Shellfish", "Molluscs"],
  "Gluten-Free": ["Gluten"],
  "Nut-Free": ["Nuts", "Peanuts"],
  "Dairy-Free": ["Dairy"],
};

// Cuisine / dish words that strongly imply an allergen even when the
// raw ingredient isn't spelled out. Conservative on purpose.
const CUISINE_HINTS: Record<string, string[]> = {
  sushi: ["Fish", "Soy"],
  sashimi: ["Fish"],
  ceviche: ["Fish"],
  poke: ["Fish", "Soy"],
  paella: ["Shellfish", "Fish"],
  risotto: ["Dairy"],
  fondue: ["Dairy"],
  gratin: ["Dairy"],
  gratén: ["Dairy"],
  pizza: ["Gluten", "Dairy"],
  pizzas: ["Gluten", "Dairy"],
  pierogi: ["Gluten"],
  dumpling: ["Gluten"],
  dumplings: ["Gluten"],
  empanada: ["Gluten"],
  empanadas: ["Gluten"],
};

const MEAT_HINTS = [
  "chicken", "pollo", "tavuk", "beef", "ternera", "vaca", "dana", "sığır",
  "pork", "cerdo", "domuz", "lamb", "cordero", "kuzu", "veal", "duck", "pato", "ördek",
  "turkey", "pavo", "hindi", "ham", "jamón", "jambon", "bacon", "beicon",
  "sausage", "salchicha", "sucuk", "sosis", "chorizo", "prosciutto", "tagine",
  "meat", "carne", "et", "köfte", "kebab", "kebap", "döner", "doner", "shawarma",
];

export interface AllergenResult {
  allergens: string[];
  suggestedDietary: string[];
}

// Whole-word / phrase match that is unicode + accent aware so it works
// across English, Spanish and Turkish without false "substring" hits.
function buildMatcher(keyword: string): RegExp {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // \p{L} = any letter, \p{N} = any number. A keyword is a "hit" when it
  // isn't glued to another letter/number on either side.
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(s)?($|[^\\p{L}\\p{N}])`, "iu");
}

const matcherCache = new Map<string, RegExp>();
function matches(text: string, keyword: string): boolean {
  let re = matcherCache.get(keyword);
  if (!re) {
    re = buildMatcher(keyword);
    matcherCache.set(keyword, re);
  }
  return re.test(text);
}

export function detectAllergens(text: string): AllergenResult {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  // 1) Compound dishes / sauces (multi-allergen).
  for (const [phrase, allergens] of Object.entries(COMPOUNDS)) {
    if (matches(lower, phrase)) allergens.forEach((a) => found.add(a));
  }

  // 2) Single-ingredient keywords.
  for (const [allergen, keywords] of Object.entries(RULES)) {
    if (keywords.some((k) => matches(lower, k))) found.add(allergen);
  }

  // 3) Cuisine / dish based assumptions.
  for (const [dish, allergens] of Object.entries(CUISINE_HINTS)) {
    if (matches(lower, dish)) allergens.forEach((a) => found.add(a));
  }

  const allergens = Array.from(found);
  const hasMeat = MEAT_HINTS.some((m) => matches(lower, m));
  const suggestedDietary: string[] = [];

  for (const [tag, blockers] of Object.entries(DIETARY_BLOCKERS)) {
    if ((tag === "Vegan" || tag === "Vegetarian") && hasMeat) continue;
    if (blockers.every((b) => !allergens.includes(b))) {
      suggestedDietary.push(tag);
    }
  }

  return { allergens, suggestedDietary };
}
