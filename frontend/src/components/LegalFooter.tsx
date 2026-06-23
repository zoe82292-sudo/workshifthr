import { Link } from "react-router-dom";

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <Link to="/terms">Terms of Service</Link>
      <span aria-hidden="true"> · </span>
      <Link to="/privacy">Privacy Policy</Link>
    </footer>
  );
}
