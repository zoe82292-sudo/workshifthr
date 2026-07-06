import { Link } from "react-router-dom";
import { BrandLogo } from "./BrandLogo";
import { LegalFooter } from "./LegalFooter";

export function CheckoutCancelPage() {
  return (
    <div className="checkout-page">
      <div className="checkout-card panel">
        <BrandLogo size="nav" layout="lockup" />
        <span className="hero-badge">Checkout canceled</span>
        <h1>No charge was made</h1>
        <p className="checkout-copy">
          You can return to pricing anytime to complete your purchase, or email{" "}
          <a href="mailto:hello@shiftworkshr.com">hello@shiftworkshr.com</a> if you have
          questions.
        </p>
        <div className="checkout-actions">
          <Link className="button button-primary" to="/#pricing">
            View pricing
          </Link>
          <Link className="button button-secondary" to="/">
            Back to home
          </Link>
        </div>
        <LegalFooter />
      </div>
    </div>
  );
}
