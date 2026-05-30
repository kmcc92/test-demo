export const DEMO_MERCHANT = {
  email: "merchant@test.com",
};

export interface AuthSession {
  email: string;
  createdAt: string;
  role: "customer" | "merchant";
}

const STORAGE_KEY = "test_auth_v1";

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.email) return null;
    return {
      email: parsed.email,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      // Backward compat: sessions written before role was added default to "customer"
      role: parsed.role ?? "customer",
    };
  } catch {
    return null;
  }
}

export function writeSession(
  email: string,
  role: "customer" | "merchant"
): AuthSession {
  const session: AuthSession = { email, createdAt: new Date().toISOString(), role };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function deleteSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
