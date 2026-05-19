"use client";

import {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { readSession, writeSession, deleteSession, type AuthSession } from "@/lib/auth-storage";
import type { PurchaseRecord } from "@/lib/purchase-storage";
import type { CheckoutSession } from "@/lib/mock-checkout";
import type { Product } from "@/lib/mock-data";
import AuthModal from "@/components/auth/AuthModal";
import CheckoutModal from "@/components/checkout/CheckoutModal";

export interface AuthContextValue {
  user: AuthSession | null;
  isLoaded: boolean;
  logout: () => void;
  openAuth: (tab?: "login" | "signup") => void;
  openCheckout: (product: Product) => void;
  // OwnershipProvider registers its addOwnership here so AuthProvider can call it
  // on checkout complete without circular dependencies.
  setPurchaseHandler: (fn: ((record: PurchaseRecord) => void) | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  // Ref holds the OwnershipProvider's addOwnership function.
  // Using a ref avoids stale closures and doesn't trigger re-renders.
  const purchaseHandlerRef = useRef<((record: PurchaseRecord) => void) | null>(null);

  const setPurchaseHandler = useCallback(
    (fn: ((record: PurchaseRecord) => void) | null) => {
      purchaseHandlerRef.current = fn;
    },
    []
  );

  useEffect(() => {
    setUser(readSession());
    setIsLoaded(true);
  }, []);

  const logout = useCallback(() => {
    deleteSession();
    setUser(null);
  }, []);

  const openAuth = useCallback((tab: "login" | "signup" = "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  }, []);

  const openCheckout = useCallback(
    (product: Product) => {
      if (!user) {
        setPendingProduct(product);
        setAuthTab("signup");
        setAuthOpen(true);
        return;
      }
      setCheckoutProduct(product);
    },
    [user]
  );

  const handleAuthSuccess = useCallback(
    (email: string) => {
      const session = writeSession(email);
      setUser(session);
      setAuthOpen(false);
      if (pendingProduct) {
        setCheckoutProduct(pendingProduct);
        setPendingProduct(null);
      }
    },
    [pendingProduct]
  );

  const handleAuthClose = useCallback(() => {
    setAuthOpen(false);
    setPendingProduct(null);
  }, []);

  // Called by CheckoutModal when step 3 is reached.
  // Delegates to OwnershipProvider via the registered handler — the only write path.
  const handleCheckoutComplete = useCallback(
    (session: CheckoutSession, walletAddress: string | undefined) => {
      if (!user || !checkoutProduct) return;
      const record: PurchaseRecord = {
        id: session.certificateId,
        productId: checkoutProduct.id,
        productName: checkoutProduct.name,
        certificateId: session.certificateId,
        productCertificateId: checkoutProduct.certificateId,
        txHash: session.txHash,
        price: checkoutProduct.price,
        purchasedAt: session.timestamp,
        walletAddress,
      };
      // addOwnership in OwnershipProvider: updates state first, then persists.
      purchaseHandlerRef.current?.(record);
    },
    [user, checkoutProduct]
  );

  return (
    <AuthContext.Provider
      value={{ user, isLoaded, logout, openAuth, openCheckout, setPurchaseHandler }}
    >
      {children}
      <AuthModal
        open={authOpen}
        initialTab={authTab}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
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
