import { useState } from "react";
import { startCheckout } from "../api";

type CheckoutButtonProps = {
  planId: "cycle" | "annual" | "monthly";
  label: string;
  variant?: "primary" | "secondary";
  fallbackHref?: string;
  checkoutEnabled: boolean;
  className?: string;
};

export function CheckoutButton({
  planId,
  label,
  variant = "secondary",
  fallbackHref,
  checkoutEnabled,
  className = "",
}: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setError(null);
    setLoading(true);

    try {
      const { url } = await startCheckout(planId);
      window.location.assign(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start checkout.");
      setLoading(false);
    }
  }

  const classes = `button ${variant === "primary" ? "button-primary" : "button-secondary"} landing-price-button ${className}`.trim();

  if (!checkoutEnabled && fallbackHref) {
    return (
      <div className="checkout-button-wrap">
        <a className={classes} href={fallbackHref}>
          {label}
        </a>
      </div>
    );
  }

  return (
    <div className="checkout-button-wrap">
      <button
        className={classes}
        type="button"
        disabled={loading || !checkoutEnabled}
        onClick={() => void handleCheckout()}
      >
        {loading ? "Redirecting..." : label}
      </button>
      {error ? <p className="checkout-error">{error}</p> : null}
    </div>
  );
}
