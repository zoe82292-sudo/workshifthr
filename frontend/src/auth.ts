const TOKEN_KEY = "shiftworkshr_token";
const EMAIL_KEY = "shiftworkshr_email";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function storeSession(token: string, email: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getStoredToken();
  if (!token) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
}
