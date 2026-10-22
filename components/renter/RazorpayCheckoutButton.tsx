"use client";

import { useEffect, useState } from "react";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
};

type RazorpayPaymentResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayPaymentFailure = {
  error?: {
    description?: string;
  };
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayPaymentFailure) => void) => void;
};
type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Could not load Razorpay Checkout."));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export function RazorpayCheckoutButton({
  bookingId,
  disabled = false,
  onPaid,
}: {
  bookingId: string;
  disabled?: boolean;
  onPaid?: () => void;
}) {
  const [isReady, setIsReady] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    let current = true;
    loadRazorpayScript()
      .then(() => {
        if (current) setIsReady(true);
      })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : "Could not load Razorpay Checkout.");
      });
    return () => {
      current = false;
    };
  }, []);

  const startCheckout = async () => {
    if (isPaying || paid) return;
    setIsPaying(true);
    setError("");

    try {
      if (!window.Razorpay) await loadRazorpayScript();
      const orderResponse = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const orderResult = await orderResponse.json() as {
        error?: string;
        keyId?: string;
        order?: RazorpayOrder;
      };
      if (!orderResponse.ok || !orderResult.keyId || !orderResult.order) {
        throw new Error(orderResult.error || "Could not start checkout.");
      }

      if (!window.Razorpay) throw new Error("Razorpay Checkout did not load.");
      const checkout = new window.Razorpay({
        key: orderResult.keyId,
        amount: orderResult.order.amount,
        currency: orderResult.order.currency,
        name: "SpaceYaar",
        description: "Accepted storage booking",
        order_id: orderResult.order.id,
        theme: { color: "#138a72" },
        modal: {
          ondismiss: () => setIsPaying(false),
        },
        handler: (paymentResponse) => {
          void fetch("/api/payments/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(paymentResponse),
          })
            .then(async (response) => {
              const result = await response.json() as { error?: string; verified?: boolean };
              if (!response.ok || !result.verified) throw new Error(result.error || "Payment verification failed.");
              setPaid(true);
              onPaid?.();
            })
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : "Payment verification failed.");
            })
            .finally(() => setIsPaying(false));
        },
      });
      checkout.on("payment.failed", (response) => {
        setError(response.error?.description || "Payment failed. Please try again.");
        setIsPaying(false);
      });
      checkout.open();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      setIsPaying(false);
    }
  };

  return (
    <div>
      <button className="renter-pay-button" type="button" onClick={() => void startCheckout()} disabled={disabled || isPaying || paid || !isReady}>
        {paid ? "Paid" : isPaying ? "Opening checkout…" : isReady ? "Pay securely" : "Loading checkout…"}
      </button>
      {error && <p role="alert">{error}</p>}
      {paid && <p role="status">Payment verified. Thank you!</p>}
    </div>
  );
}
