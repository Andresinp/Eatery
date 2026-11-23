// Shared cancellation policy — pure functions, no imports.
// Mirrors spec §7 table. Used by both client (UX prediction) and the
// cancel-order Edge Function (server-side enforcement).

export type CancellationReason =
  | "by_guest"
  | "by_host"
  | "no_show_guest"
  | "no_show_host";

export interface CancellationOutcome {
  refundDeposit: boolean;
  guestNoShowStrike: boolean;
  hostCancellationStrike: boolean;
  hostNoShowStrike: boolean;
  newStatus:
    | "cancelled_by_guest"
    | "cancelled_by_host"
    | "no_show_guest"
    | "no_show_host";
}

export const GUEST_FREE_CANCEL_HOURS = 24;

/**
 * Decide what happens when an order is cancelled.
 *
 * @param reason          who/what triggered the cancellation
 * @param eventStartIso   the scheduled meal_time (table) or pickup_window_start (market)
 * @param nowIso          the current time (testable)
 */
export function decideCancellation(
  reason: CancellationReason,
  eventStartIso: string,
  nowIso: string = new Date().toISOString(),
): CancellationOutcome {
  const hoursUntil =
    (new Date(eventStartIso).getTime() - new Date(nowIso).getTime()) /
    (1000 * 60 * 60);

  switch (reason) {
    case "by_guest": {
      const isLate = hoursUntil < GUEST_FREE_CANCEL_HOURS;
      return {
        refundDeposit: !isLate,
        guestNoShowStrike: false,
        hostCancellationStrike: false,
        hostNoShowStrike: false,
        newStatus: "cancelled_by_guest",
      };
    }
    case "by_host":
      return {
        refundDeposit: true,
        guestNoShowStrike: false,
        hostCancellationStrike: true,
        hostNoShowStrike: false,
        newStatus: "cancelled_by_host",
      };
    case "no_show_guest":
      return {
        refundDeposit: false,
        guestNoShowStrike: true,
        hostCancellationStrike: false,
        hostNoShowStrike: false,
        newStatus: "no_show_guest",
      };
    case "no_show_host":
      return {
        refundDeposit: true,
        guestNoShowStrike: false,
        hostCancellationStrike: false,
        hostNoShowStrike: true,
        newStatus: "no_show_host",
      };
  }
}

/**
 * Human-readable preview shown to the user before they confirm.
 */
