// The cancellation policy, server side. Mirrors mobile/src/lib/cancellation.ts (the app uses it
// only to explain the outcome before the person confirms; this one decides).
export type CancellationReason = 'by_guest' | 'by_host' | 'no_show_guest' | 'no_show_host';
export type CancelledStatus = 'cancelled_by_guest' | 'cancelled_by_host' | 'no_show_guest' | 'no_show_host';

export const GUEST_FREE_CANCEL_HOURS = 24;

export function decide(reason: CancellationReason, eventStartIso: string, now = Date.now()) {
  const hoursUntil = (new Date(eventStartIso).getTime() - now) / 3_600_000;
  switch (reason) {
    case 'by_guest':
      return { refund: hoursUntil >= GUEST_FREE_CANCEL_HOURS, strike: null, strikeOn: null, status: 'cancelled_by_guest' as const };
    case 'by_host':
      return { refund: true, strike: 'cancellation' as const, strikeOn: 'host' as const, status: 'cancelled_by_host' as const };
    case 'no_show_guest':
      return { refund: false, strike: 'no_show' as const, strikeOn: 'guest' as const, status: 'no_show_guest' as const };
    case 'no_show_host':
      return { refund: true, strike: 'no_show' as const, strikeOn: 'host' as const, status: 'no_show_host' as const };
  }
}
