import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Reset scroll position on route changes (SPA links keep prior scroll by default). */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (pathname === "/" && hash) {
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}
