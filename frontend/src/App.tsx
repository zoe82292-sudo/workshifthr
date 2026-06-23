import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { checkAuthStatus, checkBackendHealth } from "./api";
import { clearSession, getStoredEmail, getStoredToken } from "./auth";
import { AnalyzerApp } from "./components/AnalyzerApp";
import { LandingPage } from "./components/LandingPage";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { TermsOfService } from "./components/TermsOfService";

function MainApp() {
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(getStoredEmail());
  const [devPreview, setDevPreview] = useState(false);

  useEffect(() => {
    void Promise.all([checkBackendHealth(), checkAuthStatus()]).then(([, requiresAuth]) => {
      setAuthRequired(requiresAuth);
      if (!requiresAuth) {
        setUserEmail("guest");
      }
    });
  }, []);

  const isAuthenticated =
    authRequired === false ||
    devPreview ||
    (authRequired === true && Boolean(getStoredToken() && userEmail));

  function handleLogout() {
    clearSession();
    setUserEmail(null);
    setDevPreview(false);
  }

  if (authRequired === null) {
    return <div className="app-shell loading-shell">Loading ShiftWorksHR...</div>;
  }

  if (!isAuthenticated) {
    return (
      <LandingPage
        onLogin={setUserEmail}
        showLogin={authRequired}
        onTryDemo={authRequired ? undefined : () => setDevPreview(true)}
      />
    );
  }

  return (
    <AnalyzerApp
      authRequired={authRequired}
      userEmail={userEmail}
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}
