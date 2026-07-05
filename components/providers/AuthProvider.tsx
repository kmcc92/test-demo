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
import {
  readSession,
  writeSession,
  deleteSession,
  DEMO_MERCHANT,
  type AuthSession,
} from "@/lib/auth-storage";
import type { PurchaseInsert } from "@/lib/repositories";
import type { CheckoutSession } from "@/lib/mock-checkout";
import type { Product } from "@/lib/mock-data";
import AuthModal from "@/components/auth/AuthModal";
import CheckoutModal from "@/components/checkout/CheckoutModal";

export interface AuthContextValue {
  user: AuthSession | null;
  isLoaded: boolean;
  role: "customer" | "merchant" | null;
  isMerchant: boolean;
  logout: () => void;
  openAuth: (tab?: "login" | "signup") => void;
  openCheckout: (product: Product) => void;
  // OwnershipProvider registers its addOwnership here so AuthProvider can call it
  // on checkout complete without circular dependencies.
  setPurchaseHandler: (fn: ((record: PurchaseInsert) => void) | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [role, setRole] = useState<"customer" | "merchant" | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  const { disconnect: disconnectWallet } = useDisconnect();

  // Ref holds the OwnershipProvider's addOwnership function.
  // Using a ref avoids stale closures and doesn't trigger re-renders.
  const purchaseHandlerRef = useRef<((record: PurchaseInsert) => void) | null>(null);

  const setPurchaseHandler = useCallback(
    (fn: ((record: PurchaseInsert) => void) | null) => {
      purchaseHandlerRef.current = fn;
    },
    []
  );

  useEffect(() => {
    const session = readSession();
    setUser(session);
    setRole(session ? session.role : null);
    setIsLoaded(true);
  }, []);

  const logout = useCallback(() => {
    deleteSession();
    setUser(null);
    setRole(null);
    setCheckoutProduct(null);
    setPendingProduct(null);
    disconnectWallet();
  }, [disconnectWallet]);

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
      const assignedRole: "customer" | "merchant" =
        email === DEMO_MERCHANT.email ? "merchant" : "customer";
      const session = writeSession(email, assignedRole);
      setUser(session);
      setRole(assignedRole);
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
