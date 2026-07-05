"use client";

import {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { useDisconnect } from "wagmi";
import type { Session, User } from "@supabase/supabase-js";
import type { PurchaseInsert } from "@/lib/repositories";
import type { CheckoutSession } from "@/lib/mock-checkout";
import type { Product } from "@/lib/mock-data";
import AuthModal from "@/components/auth/AuthModal";
import CheckoutModal from "@/components/checkout/CheckoutModal";

// STEP 10b — REAL AUTHENTICATION (Supabase Auth), NOT authorization.
//
// AUTH IS NOW REAL: email/password credentials are verified by Supabase GoTrue.
// AUTHORIZATION IS NOT: RLS is still OFF, repositories are still keyed by email
// (not auth.uid), and the anon key can read/write any row. Do NOT claim user data
// is protected — enforcement waits for the RLS step. This migration changes the
// IDENTITY SOURCE only; every repository stays architecturally unchanged and
// still receives an EMAIL (canonical auth.uid is exposed as user.id but not yet
// used for scoping).
//
// Feature flag parity with the domain migrations. When false, auth is DISABLED
// (no user, no fake fallback — the fake localStorage auth has been removed).
const USE_SUPABASE_AUTH = true;

// Merchant role mechanism (confirmed): EMAIL ALLOWLIST derived from the REAL
// authenticated email on every session restore. Persists through refresh for
// free (the email lives in the Supabase session). This is a UI role only — NOT a
// security boundary until RLS. merchant@test.com must register once in Supabase
// Auth to log in as merchant.
const DEMO_MERCHANT_EMAIL = "merchant@test.com";

// App user model — Supabase User mapped into the shape downstream consumers
// already expect ({ email, createdAt, role }), plus id (auth.uid, canonical
// identity for the eventual RLS migration; unused for scoping today).
export interface AppUser {
  id: string;
  email: string;
  createdAt: string;
  role: "customer" | "merchant";
}

function mapUser(u: User): AppUser {
  const email = (u.email ?? "").toLowerCase();
  return {
    id: u.id,
    email,
    createdAt: u.created_at,
    role: email === DEMO_MERCHANT_EMAIL ? "merchant" : "customer",
  };
}

// Friendlier copy for the common GoTrue error messages.
function humanizeAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Incorrect email or password.";
  if (m.includes("already registered")) return "An account with this email already exists.";
  if (m.includes("email not confirmed")) return "Please confirm your email, then log in.";
  if (m.includes("password")) return message; // e.g. length rules — pass through
  return message || "Authentication failed. Please try again.";
}

export interface AuthContextValue {
  user: AppUser | null;
  isLoaded: boolean;
  role: "customer" | "merchant" | null;
  isMerchant: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  openAuth: (tab?: "login" | "signup") => void;
  openCheckout: (product: Product) => void;
  // OwnershipProvider registers its addOwnership here so AuthProvider can call it
  // on checkout complete without circular dependencies.
  setPurchaseHandler: (fn: ((record: PurchaseInsert) => void) | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// Lazy dynamic-import of the supabase client (import-safety parity with repos).
async function getSupabase() {
  const mod = await import("@/lib/supabase");
  return mod.supabase;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [role, setRole] = useState<"customer" | "merchant" | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);

  const { disconnect: disconnectWallet } = useDisconnect();

  // Ref holds the OwnershipProvider's addOwnership function.
  const purchaseHandlerRef = useRef<((record: PurchaseInsert) => void) | null>(null);
  // Product the user tried to buy before logging in — resumed after auth success.
  // A ref (not state) because it never renders; it only gates a post-login action.
  const pendingProductRef = useRef<Product | null>(null);

  const setPurchaseHandler = useCallback(
    (fn: ((record: PurchaseInsert) => void) | null) => {
      purchaseHandlerRef.current = fn;
    },
    []
  );

  const applySession = useCallback((session: Session | null) => {
    const u = session?.user ?? null;
    if (u) {
      const mapped = mapUser(u);
      setUser(mapped);
      setRole(mapped.role);
    } else {
      setUser(null);
      setRole(null);
    }
  }, []);

  // Session bootstrap + change subscription. Supabase OWNS session persistence
  // (localStorage under its own key, auto-refresh) — no manual session handling.
  // getSession() restores on refresh; onAuthStateChange keeps user/role in sync
  // (login, logout, token refresh, cross-tab). OwnershipProvider reacts to the
  // resulting user.email change exactly as before (its hydration is unchanged).
  useEffect(() => {
    if (!USE_SUPABASE_AUTH) {
      setIsLoaded(true);
      return;
    }
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    (async () => {
      const supabase = await getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      applySession(session);
      setIsLoaded(true);
      const { data } = supabase.auth.onAuthStateChange((_event, s) => {
        applySession(s);
      });
      subscription = data.subscription;
    })().catch(() => {
      // Auth bootstrap failure → treat as logged-out but loaded (no hang).
      if (active) setIsLoaded(true);
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [applySession]);

  // Resume a pending checkout after a successful interactive auth, and close the
  // modal. onAuthStateChange handles setting user/role.
  const finishAuthSuccess = useCallback(() => {
    setAuthOpen(false);
    const pending = pendingProductRef.current;
    pendingProductRef.current = null;
    if (pending) setCheckoutProduct(pending);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!USE_SUPABASE_AUTH) return { error: "Authentication is disabled." };
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { error: humanizeAuthError(error.message) };
      finishAuthSuccess();
      return { error: null };
    },
    [finishAuthSuccess]
  );

  const register = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      if (!USE_SUPABASE_AUTH) return { error: "Authentication is disabled." };
      const supabase = await getSupabase();
      const normEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({ email: normEmail, password });
      if (error) return { error: humanizeAuthError(error.message) };
      // Email confirmation is DISABLED in the dashboard, so signUp returns a live
      // session and the user is immediately authenticated. Defensive fallback: if
      // no session came back (confirmation somehow re-enabled), try an immediate
      // sign-in; if THAT fails, surface a clear confirm-your-email message rather
      // than hang.
      if (!data.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: normEmail,
          password,
        });
        if (signInErr) {
          return { error: "Account created. Please confirm your email, then log in." };
        }
      }
      finishAuthSuccess();
      return { error: null };
    },
    [finishAuthSuccess]
  );

  const logout = useCallback(() => {
    // Supabase signOut clears its session; onAuthStateChange(SIGNED_OUT) then sets
    // user null, which drives OwnershipProvider to dispose the user-scoped
    // purchases snapshot (global repos are untouched).
    void getSupabase()
      .then((supabase) => supabase.auth.signOut())
      .catch(() => {});
    setCheckoutProduct(null);
    pendingProductRef.current = null;
    disconnectWallet();
  }, [disconnectWallet]);

  const openAuth = useCallback((tab: "login" | "signup" = "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  }, []);

  const openCheckout = useCallback(
    (product: Product) => {
      if (!user) {
        pendingProductRef.current = product;
        setAuthTab("signup");
        setAuthOpen(true);
        return;
      }
      setCheckoutProduct(product);
    },
    [user]
  );

  const handleModalSubmit = useCallback(
    (tab: "login" | "signup", email: string, password: string) =>
      tab === "signup" ? register(email, password) : login(email, password),
    [register, login]
  );

  const handleAuthClose = useCallback(() => {
    setAuthOpen(false);
    pendingProductRef.current = null;
  }, []);

  // Called by CheckoutModal when step 4 is reached.
  // Delegates to OwnershipProvider via the registered handler — the only write path.
  const handleCheckoutComplete = useCallback(
    (session: CheckoutSession, walletAddress: string | undefined) => {
      if (!user || !checkoutProduct) return;
      const record: PurchaseInsert = {
        id: session.txHash,
        productId: checkoutProduct.id,
        productName: checkoutProduct.name,
        certificateId: checkoutProduct.certificateId ?? "",
        txHash: session.txHash,
        price: checkoutProduct.price,
        purchasedAt: session.timestamp,
        walletAddress,
        // Snapshot the product presentation at purchase time so it survives
        // product deletion (populates purchases.product_image/description).
        productImage: checkoutProduct.images[0],
        productDescription: checkoutProduct.description,
      };
      // Routed to the purchases repo (persist-first Supabase insert). The write
      // is async in the repo; the UI reflects it reactively once persisted.
      purchaseHandlerRef.current?.(record);
    },
    [user, checkoutProduct]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        role,
        isMerchant: role === "merchant",
        login,
        register,
        logout,
        openAuth,
        openCheckout,
        setPurchaseHandler,
      }}
    >
      {children}
      <AuthModal
        open={authOpen}
        initialTab={authTab}
        onClose={handleAuthClose}
        onSubmit={handleModalSubmit}
      />
      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          onClose={() => setCheckoutProduct(null)}
          onComplete={handleCheckoutComplete}
        />
      )}
    </AuthContext.Provider>
  );
}
