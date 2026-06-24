import { Link } from "react-router-dom";

export function LegalConsentLinks() {
  return (
    <>
      <Link to="/terms">Terms of Service</Link>
      {" and "}
      <Link to="/privacy">Privacy Policy</Link>
    </>
  );
}
