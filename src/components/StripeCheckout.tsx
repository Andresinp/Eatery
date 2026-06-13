import { useEffect, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import { stripePromise, createPaymentIntent, type CreatePIResult } from "../lib/stripe";

interface Props {
  listingId: string;
  quantity: number;
  currency: string;
  onSuccess: (result: { payment_intent_id: string; deposit: number; balance: number }) => void;
}

export default function StripeCheckout(props: Props) {
  const [pi, setPI] = useState<CreatePIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    createPaymentIntent(props.listingId, props.quantity)
      .then((r) => alive && setPI(r))
      .catch((e: unknown) =>
        alive && setError(e instanceof Error ? e.message : "Couldn't start payment"),
      );
    return () => {
      alive = false;
    };
  }, [props.listingId, props.quantity]);

  if (error) {
    return (
      <div className="rounded-2xl border border-amber/60 bg-amber/10 px-4 py-3 text-sm text-amber-ink">
        {error}
      </div>
    );
  }
  if (!pi || !stripePromise) {
    return (
      <div className="rounded-2xl border border-ink/15 bg-white p-4 text-sm text-ink/60 animate-pulse">
        Preparing secure payment…
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret: pi.client_secret,
    appearance: {
      theme: "flat",
      variables: {
        colorPrimary: "#161413",
        colorBackground: "#FFFDF7",
        colorText: "#161413",
        colorDanger: "#b91c1c",
        fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
        borderRadius: "12px",
        spacingUnit: "4px",
      },
      rules: {
        ".Input": {
          border: "1px solid rgba(22,20,19,0.2)",
          padding: "10px 12px",
        },
        ".Input:focus": {
          border: "1px solid #161413",
          boxShadow: "none",
        },
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm {...props} pi={pi} />
    </Elements>
  );
}

function PaymentForm({
  pi,
  currency,
  onSuccess,
}: Props & { pi: CreatePIResult }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);
    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (stripeErr) {
      setErr(stripeErr.message ?? "Payment failed");
      setSubmitting(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      onSuccess({
        payment_intent_id: paymentIntent.id,
        deposit: pi.deposit,
        balance: pi.balance,
      });
      return;
    }
    setErr(`Unexpected status: ${paymentIntent?.status ?? "unknown"}`);
    setSubmitting(false);
  };

  const symbol = currency === "EUR" ? "€" : currency + " ";

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {err && (
        <div className="text-sm text-red-900 bg-red-50 border border-red-300 rounded-xl px-3 py-2">
          {err}
        </div>
      )}
      <button
        disabled={!stripe || !elements || submitting}
        onClick={submit}
        className="w-full py-3.5 rounded-2xl border-2 border-ink bg-ink text-cream-50 font-semibold disabled:opacity-40"
      >
        {submitting ? "Processing…" : `Pay ${symbol}${pi.deposit.toFixed(2)} deposit`}
      </button>
    </div>
  );
}
