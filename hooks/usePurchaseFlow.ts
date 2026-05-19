"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useOwnership } from "@/hooks/useOwnership";
import { useToast } from "@/components/ui/Toast";
import { readCards, type SavedCard } from "@/lib/payment-storage";
import type { Product } from "@/lib/mock-data";

export type PurchaseStep =
  | { phase: "idle" }
  | { phase: "prereq"; missing: ("card" | "wallet")[] }
  | { phase: "confirm"; card: SavedCard; walletAddress: `0x${string}` };

export interface PurchaseFlowResult {
  step: PurchaseStep;
  initiatePurchase: () => void;
  dismiss: () => void;
  confirm: () => void;
}

export function usePurchaseFlow(product: Product | null): PurchaseFlowResult {
  const { user, openAuth, openCheckout } = useAuth();
  const { isConnected, address } = useWallet();
  const { isOwned } = useOwnership();
  const { show: showToast } = useToast();
  const [step, setStep] = useState<PurchaseStep>({ phase: "idle" });

  const initiatePurchase = useCallback(() => {
    if (!product) return;

    if (isOwned(product.id)) {
      showToast("You already own this piece", "neutral");
      return;
    }

    if (!user) {
      openAuth("signup");
      return;
    }

    const cards = readCards(user.email);
    const missing: ("card" | "wallet")[] = [];
    if (cards.length === 0) missing.push("card");
    if (!isConnected || !address) missing.push("wallet");

    if (missing.length > 0) {
      setStep({ phase: "prereq", missing });
      return;
    }

    setStep({ phase: "confirm", card: cards[0], walletAddress: address! });
  }, [product, user, openAuth, isConnected, address, isOwned, showToast]);

  const dismiss = useCallback(() => setStep({ phase: "idle" }), []);

  const confirm = useCallback(() => {
    setStep({ phase: "idle" });
    if (product) openCheckout(product);
  }, [openCheckout, product]);

  return { step, initiatePurchase, dismiss, confirm };
}
