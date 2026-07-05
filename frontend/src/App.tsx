import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { checkAuthStatus, checkBackendHealth, type AuthStatus } from "./api";
import { clearSession, getStoredEmail, getStoredOrganization, getStoredToken } from "./auth";
import { AnalyzerApp } from "./components/AnalyzerApp";
import { LoadingScreen } from "./components/LoadingScreen";
import { CheckoutCancelPage } from "./components/CheckoutCancelPage";
import { CheckoutSuccessPage } from "./components/CheckoutSuccessPage";
import { DataProcessingAgreement } from "./components/DataProcessingAgreement";
import { LandingPage } from "./components/LandingPage";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { SamplePreviewPage } from "./components/SamplePreviewPage";
import { MeritChecklistPage } from "./components/MeritChecklistPage";
import { SecurityPage } from "./components/SecurityPage";
import { SecuritySummaryPage } from "./components/SecuritySummaryPage";
import { RecoverAccessPage } from "./components/RecoverAccessPage";
import { TermsOfService } from "./components/TermsOfService";
import { captureAttributionFromUrl } from "./marketingAttribution";

const TRIAL_START_KEY = "shiftworkshr:startTrial";

function TryEntry() {
  useEffect(() => {
    sessionStorage.setItem(TRIAL_START_KEY, "1");
    window.location.replace("/");
  }, []);
  return <LoadingScreen />;
}

function MainApp() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(getStoredEmail());
  const [userOrganization, setUserOrganization] = useState<string | null>(getStoredOrganization());
  const [devPreview, setDevPreview] = useState(false);
  const [trialMode, setTrialMode] = useState(false);

  useEffect(() => {
    captureAttributionFromUrl();
    void Promise.all([checkBackendHealth(), checkAuthStatus()]).then(([, status]) => {
      setAuthStatus(status);
      if (!status.auth_enabled) {
        setUserEmail("guest");
      }
      if (sessionStorage.getItem(TRIAL_START_KEY) === "1") {
        sessionStorage.removeItem(TRIAL_START_KEY);
        if (status.trial_enabled) {
          setTrialMode(true);
        }
      }
    });
  }, []);

  const authRequired = authStatus?.auth_enabled ?? false;
  const trialAvailable = authStatus?.trial_enabled ?? false;

  const isAuthenticated =
    authRequired === false ||
    devPreview ||
    trialMode ||
    (authRequired && Boolean(getStoredToken() && userEmail));

  function handleLogin(email: string, organization?: string) {
    setTrialMode(false);
    setUserEmail(email);
    setUserOrganization(organization ?? null);
  }

  function handleLogout() {
    clearSession();
    setUserEmail(null);
    setUserOrganization(null);
    setDevPreview(false);
    setTrialMode(false);
  }

  if (authStatus === null) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return (
      <LandingPage
        onLogin={handleLogin}
        showLogin={authRequired}
        trialAvailable={trialAvailable}
        trialMaxRows={authStatus.trial_max_rows}
        onTryTrial={trialAvailable ? () => setTrialMode(true) : undefined}
        onTryDemo={authRequired ? undefined : () => setDevPreview(true)}
      />
    );
  }

  return (
    <AnalyzerApp
      authRequired={authRequired}
      trialMode={trialMode}
      trialMaxRows={authStatus.trial_max_rows}
      trialMaxFiles={authStatus.trial_max_files}
      userEmail={trialMode ? null : userEmail}
      userOrganization={trialMode ? null : userOrganization}
      onLogout={handleLogout}
      onExitTrial={trialMode ? () => setTrialMode(false) : undefined}
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
      <Route path="/dpa" element={<DataProcessingAgreement />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/security-summary" element={<SecuritySummaryPage />} />
      <Route path="/checklist" element={<MeritChecklistPage />} />
      <Route path="/sample-preview" element={<SamplePreviewPage />} />
      <Route path="/try" element={<TryEntry />} />
      <Route path="/marketing-preview" element={<Navigate to="/sample-preview" replace />} />
      <Route path="*" element={<MainApp />} />
    </Routes>
  );
}
