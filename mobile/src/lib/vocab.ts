// The tag vocabularies. Values are stored in the database in English exactly as the web app
// stores them ("Gluten-Free"), so both apps read each other's listings; the UI shows them through
// i18n as `tag.<slug>` (tagKey below).

export const DIETARY = ['Vegan', 'Vegetarian', 'Halal', 'Kosher', 'Gluten-Free', 'Nut-Free', 'Dairy-Free', 'Keto'] as const;
export const ALLERGENS = [
  'Gluten', 'Dairy', 'Eggs', 'Nuts', 'Peanuts', 'Shellfish', 'Fish', 'Soy', 'Sesame', 'Mustard', 'Celery', 'Sulphites', 'Molluscs',
] as const;
export const CUISINES = [
  'Moroccan', 'Italian', 'Japanese', 'Spanish', 'Lebanese', 'Mexican', 'Indian', 'Turkish', 'French', 'Greek', 'Chinese', 'Fusion',
] as const;
export const PRODUCT_TYPES = ['Baked Goods', 'Bread', 'Cake', 'Frozen Meals', 'Jam & Preserves', 'Pasta', 'Desserts', 'Soups'] as const;
// The quick "what's in it?" on the basics step: the main things guests ask about. 'Meat' is not an
// allergen and is never stored; it only keeps the dish from being tagged vegetarian or vegan.
export const QUICK_CONTAINS = ['Meat', 'Fish', 'Dairy', 'Eggs', 'Gluten', 'Nuts'] as const;
export const QUICK_SUITABLE = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto'] as const;
export const DRINKS = ['Water', 'Tea', 'Coffee', 'Juice', 'Soda / Coca-Cola', 'Beer', 'Wine', 'Cocktail'] as const;
export const DINING_SETTINGS = ['indoor_table', 'garden', 'terrace', 'rooftop', 'open_kitchen'] as const;

// "Soda / Coca-Cola" → "soda_coca_cola"; "Gluten-Free" → "gluten_free".
export function tagSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// The i18n key for a stored tag. A host's custom tag has no key; callers show it as typed:
//   const key = tagKey(v); i18n.exists(key) ? t(key) : v
export function tagKey(value: string): string {
  return `tag.${tagSlug(value)}`;
}
