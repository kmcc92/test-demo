export interface AuthSession {
  email: string;
  createdAt: string;
}

const STORAGE_KEY = "test_auth_v1";

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function writeSession(email: string): AuthSession {
  const session: AuthSession = { email, createdAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function deleteSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
