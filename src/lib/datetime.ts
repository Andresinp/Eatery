// Human-readable, locale-aware date/time formatting.
//
// Listings can carry either a raw database timestamp
// (e.g. "2026-06-28T10:35:34.979365+00:00") coming from Supabase, or an
// already-formatted, human string produced by a local host draft
// (e.g. "Sat, 28 Jun, 20:30–23:00"). These helpers detect the raw ISO form
// and turn it into something friendly; anything already human is passed
// through untouched.

const LOCALE_MAP: Record<string, string> = {
  en: "en-GB",
  es: "es-ES",
  tr: "tr-TR",
  it: "it-IT",
};

export function localeFor(lang: string | undefined): string {
  return (lang && LOCALE_MAP[lang]) || "en-GB";
}

// Matches an ISO-8601 date-time like "2026-06-28T10:35:34.979365+00:00".
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function isIso(value: string): boolean {
  return ISO_RE.test(value);
}

function timePart(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function datePart(date: Date, locale: string, withYear = true): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(date);
}

/**
 * Format a table's meal time. `endTime` may be another ISO timestamp or a
 * plain "HH:MM" string. Falls back to the original string when it isn't a
 * raw timestamp (already-formatted local drafts).
 *
 * Example: "28 June 2026 · 20:30–23:00"
 */
export function formatMealTime(value: string, lang: string, endTime?: string): string {
  if (!value) return "";
  if (!isIso(value)) return value;
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return value;

  const locale = localeFor(lang);
  const date = datePart(start, locale);
  let time = timePart(start, locale);

  if (endTime) {
    const end = isIso(endTime) ? timePart(new Date(endTime), locale) : endTime;
    if (end) time = `${time}–${end}`;
  }
  return `${date} · ${time}`;
}

/**
 * Format a market pickup window. Either bound may be ISO or already human.
 *
 * Example: "28 Jun · 10:00–13:00"
 */
export function formatPickupWindow(start: string, end: string, lang: string): string {
  if (!start && !end) return "";
  if (isIso(start)) {
    const locale = localeFor(lang);
    const ds = new Date(start);
    if (!Number.isNaN(ds.getTime())) {
      const date = datePart(ds, locale, false);
      const t1 = timePart(ds, locale);
      const t2 = isIso(end) ? timePart(new Date(end), locale) : end;
      return t2 ? `${date} · ${t1}–${t2}` : `${date} · ${t1}`;
    }
  }
  return [start, end].filter(Boolean).join("–");
}
