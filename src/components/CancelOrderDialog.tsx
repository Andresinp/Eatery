import { useState } from "react";
import {
  type CancellationReason,
  decideCancellation,
  describeCancellation,
} from "../lib/cancellation";
import { cancelOrder as remoteCancel } from "../lib/stripe";
import { isStripeConfigured } from "../lib/stripe";
import { useOrders, type OrderStatus } from "../store/orders";

interface Props {
  orderId: string;
  reason: CancellationReason;
  eventStartIso: string;
  depositAmount: number;
  currency?: string;
  onClose: () => void;
  onDone: () => void;
}

const TITLE: Record<CancellationReason, string> = {
  by_guest: "Cancel your booking?",
  by_host: "Cancel this order?",
  no_show_guest: "Mark this guest as no-show?",
  no_show_host: "Report the host didn't show up?",
};

export default function CancelOrderDialog({
  orderId,
  reason,
  eventStartIso,
  depositAmount,
  currency = "€",
  onClose,
  onDone,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const updateOrder = useOrders((s) => s.updateOrder);

  const summary = describeCancellation(reason, eventStartIso, depositAmount, currency);
  const outcome = decideCancellation(reason, eventStartIso);

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (isStripeConfigured) {
        await remoteCancel(orderId, reason);
      }
      // Mirror the change locally so the UI reflects it immediately.
      updateOrder(orderId, { status: outcome.newStatus as OrderStatus });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't cancel");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 grid place-items-end sm:place-items-center p-3">
      <div className="w-full max-w-[480px] rounded-3xl border-2 border-ink bg-cream-50 shadow-sheet p-5 sm:p-6 space-y-4 animate-slide-up">
        <h2 className="font-display font-extrabold text-2xl">{TITLE[reason]}</h2>
        <p className="text-sm text-ink/80">{summary}</p>

        {error && (
          <div className="text-sm text-red-900 bg-red-50 border border-red-300 rounded-xl px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-ink font-semibold"
          >
            Keep it
          </button>
          <button
            disabled={submitting}
            onClick={confirm}
            className="flex-1 py-3 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40"
          >
            {submitting ? "Cancelling…" : "Confirm cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}
