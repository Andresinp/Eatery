// Human-readable, locale-aware date/time formatting.
//
// This is the single source of truth for turning stored date/time values into
// strings shown to users. Raw ISO/database timestamps
// (e.g. "2026-06-26T20:30:00+00:00") must never reach the UI — always route a
// stored value through one of these helpers before rendering it.
//
// Listings can carry either a raw database timestamp coming from Supabase, or
// an already-formatted, human string produced by a local host draft
// (e.g. "Thu, 25 Jun, 20:30–23:00"). These helpers detect the raw ISO form and
// turn it into something friendly; anything already human is passed through
// untouched.

import type { Listing, MarketListing, TableListing } from "../types";

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
// Matches a plain date like "2026-04-12".
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIso(value: string): boolean {
  return ISO_RE.test(value);
}

function timePart(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
}

// "Thu, 25 Jun" — weekday + day + short month, no year (matches host drafts).
function datePart(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

/**
 * Format a table's meal time. `endTime` may be another ISO timestamp or a
 * plain "HH:MM" string. Falls back to the original string when it isn't a
 * raw timestamp (already-formatted local drafts), and to an empty string when
 * there is nothing to show.
 *
 * Example: "Thu, 25 Jun, 20:30–23:00"
 */
export function formatMealTime(value: string | undefined, lang: string, endTime?: string): string {
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
  return `${date}, ${time}`;
}

/**
 * Format an order snapshot's stored `when` string for display.
 *
 * Orders persist a single `when` string captured at booking time. Newer orders
 * store an already-formatted value, but older persisted orders may hold a raw
 * ISO timestamp (e.g. "2026-06-28T10:35:34.979365+00:00") or a raw
 * "<iso>–<iso>" pickup range. This turns any of those into a friendly string
 * and passes already-human values through untouched.
 */
export function formatWhen(value: string | undefined, lang: string): string {
  if (!value) return "";
  if (!isIso(value)) return value;
  // A stored pickup range looks like "<iso>–<iso>" (en-dash separator). ISO
  // timestamps themselves never contain an en-dash, so the split is safe.
  const dash = value.indexOf("–");
  if (dash > 0) {
    return formatPickupWindow(value.slice(0, dash), value.slice(dash + 1), lang);
  }
  return formatMealTime(value, lang);
}

/**
 * Format a market pickup window. Either bound may be ISO or already human.
 *
 * Example: "Thu, 25 Jun, 10:00–13:00"
 */
export function formatPickupWindow(
  start: string | undefined,
  end: string | undefined,
  lang: string,
): string {
  if (!start && !end) return "";
  if (start && isIso(start)) {
    const locale = localeFor(lang);
    const ds = new Date(start);
    if (!Number.isNaN(ds.getTime())) {
      const date = datePart(ds, locale);
      const t1 = timePart(ds, locale);
      const t2 = end && isIso(end) ? timePart(new Date(end), locale) : end;
      return t2 ? `${date}, ${t1}–${t2}` : `${date}, ${t1}`;
    }
  }
  return [start, end].filter(Boolean).join("–");
}

/**
 * Single entry point for "when is this listing happening?" used across the
 * host dashboard, list view, profile and anywhere a listing card is shown.
 * Returns "" when the listing has no usable date so callers can render nothing
 * (or their own "Date not set" fallback). Never returns a raw timestamp.
 */
export function formatListingWhen(listing: Listing, lang: string): string {
  if (listing.listing_type === "table") {
    const t = listing as TableListing;
    return formatMealTime(t.meal_time, lang, t.meal_end_time);
  }
  const m = listing as MarketListing;
  return formatPickupWindow(m.pickup_window_start, m.pickup_window_end, lang);
}

/**
 * Format a plain date (no time) for things like review timestamps.
 * Accepts ISO date-times, plain "YYYY-MM-DD" dates, or already-human strings.
 *
 * Example: "12 Apr 2026"
 */
export function formatReviewDate(value: string | undefined, lang: string): string {
  if (!value) return "";
  if (!isIso(value) && !DATE_RE.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(localeFor(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Relative day label for compact map/list previews:
 * "Today" / "Tomorrow" / "Thu 25" (this week) / "25 Jun" (later).
 * Returns null for non-ISO/unknown values so callers can hide the chip.
 */
export function formatRelativeDate(
  value: string | undefined,
  lang: string,
  tToday: string,
  tTomorrow: string,
): string | null {
  if (!value || !isIso(value)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateDay = new Date(date);
  dateDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (dateDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return tToday;
  if (diffDays === 1) return tTomorrow;

  const locale = localeFor(lang);
  if (diffDays >= 2 && diffDays <= 6) {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      day: "numeric",
    }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  }).format(date);
}
