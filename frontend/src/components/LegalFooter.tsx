import { Link } from "react-router-dom";

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <Link to="/terms">Terms of Service</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/privacy">Privacy Policy</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/security">Security</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/security-summary">Security summary</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/dpa">DPA</Link>
    </footer>
  );
}
