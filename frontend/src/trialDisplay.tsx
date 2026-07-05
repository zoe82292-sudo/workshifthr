import { createContext, useContext, type ReactNode } from "react";

const TrialDisplayContext = createContext(false);

export function TrialDisplayProvider({
  trialMode,
  children,
}: {
  trialMode: boolean;
  children: ReactNode;
}) {
  return <TrialDisplayContext.Provider value={trialMode}>{children}</TrialDisplayContext.Provider>;
}

export function useTrialDisplay(): boolean {
  return useContext(TrialDisplayContext);
}

export function TrialName({ value, fallback = "—" }: { value: string | null | undefined; fallback?: string }) {
  const trialMode = useTrialDisplay();
  if (!value) return <>{fallback}</>;
  if (!trialMode) return <>{value}</>;
  return (
    <span className="trial-blurred-text" title="Upgrade to view employee names">
      {value}
    </span>
  );
}