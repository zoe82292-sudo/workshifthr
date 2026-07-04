import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { checkAuthStatus, checkBackendHealth } from "./api";
import { clearSession, getStoredEmail, getStoredOrganization, getStoredToken } from "./auth";
import { AnalyzerApp } from "./components/AnalyzerApp";
import { LoadingScreen } from "./components/LoadingScreen";
import { CheckoutCancelPage } from "./components/CheckoutCancelPage";
import { CheckoutSuccessPage } from "./components/CheckoutSuccessPage";
import { LandingPage } from "./components/LandingPage";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { SamplePreviewPage } from "./components/SamplePreviewPage";
import { MeritChecklistPage } from "./components/MeritChecklistPage";
import { SecurityPage } from "./components/SecurityPage";
import { RecoverAccessPage } from "./components/RecoverAccessPage";
import { TermsOfService } from "./components/TermsOfService";
import { captureAttributionFromUrl } from "./marketingAttribution";

function MainApp() {
  const [authRequired, setAuthRequired] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(getStoredEmail());
  const [userOrganization, setUserOrganization] = useState<string | null>(getStoredOrganization());
  const [devPreview, setDevPreview] = useState(false);

  useEffect(() => {
    captureAttributionFromUrl();
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

  function handleLogin(email: string, organization?: string) {
    setUserEmail(email);
    setUserOrganization(organization ?? null);
  }

  function handleLogout() {
    clearSession();
    setUserEmail(null);
    setUserOrganization(null);
    setDevPreview(false);
  }

  if (authRequired === null) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <LandingPage
        onLogin={handleLogin}
        showLogin={authRequired}
        onTryDemo={authRequired ? undefined : () => setDevPreview(true)}
      />
    );
  }

  return (
    <AnalyzerApp
      authRequired={authRequired}
      userEmail={userEmail}
      userOrganization={userOrganization}
      onLogout={handleLogout}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
      <Route path="/checkout/canceled" element={<CheckoutCancelPage />} />
      <Route path="/recover-access" element={<RecoverAccessPage />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/checklist" element={<MeritChecklistPage />} />
      <Route path="/sample-preview" element={<SamplePreviewPage />} />
      <Route path="/marketing-preview" element={<Navigate to="/sample-preview" replace />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}
