import { i18n } from '@/i18n';

// "March 2025" in the reader's language, for "Member since …".
export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat(i18n.language, { month: 'long', year: 'numeric' }).format(new Date(iso));
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export const MIN_PASSWORD = 8;
export const MAX_BIO = 300;
export const MAX_REPORT_DETAILS = 2000;

// Report reasons, stored as these codes; shown with report.reason.<code>.
export const REPORT_REASONS = ['unsafe_food', 'misleading_listing', 'harassment', 'scam', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
