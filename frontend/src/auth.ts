const TOKEN_KEY = "shiftworkshr_token";
const EMAIL_KEY = "shiftworkshr_email";
const ORG_KEY = "shiftworkshr_org";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function getStoredOrganization(): string | null {
  return localStorage.getItem(ORG_KEY);
}

export function storeSession(token: string, email: string, organization?: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
  if (organization) {
    localStorage.setItem(ORG_KEY, organization);
  } else {
    localStorage.removeItem(ORG_KEY);
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(ORG_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getStoredToken();
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}
