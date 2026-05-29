"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useOwnership } from "@/hooks/useOwnership";
import { useToast } from "@/components/ui/Toast";
import { readCards, type SavedCard } from "@/lib/payment-storage";
import type { Product } from "@/lib/mock-data";

export type PurchaseStep =
  | { phase: "idle"; product: null }
  | { phase: "prereq"; product: Product; missing: ("card" | "wallet")[] }
  | { phase: "confirm"; product: Product; card: SavedCard; walletAddress: `0x${string}` };

export interface PurchaseFlowResult {
  step: PurchaseStep;
  initiatePurchase: (product: Product) => void;
  dismiss: () => void;
  confirm: () => void;
}

export function usePurchaseFlow(): PurchaseFlowResult {
  const { user, openAuth, openCheckout } = useAuth();
  const { isConnected, address } = useWallet();
  const { isOwned } = useOwnership();
  const { show: showToast } = useToast();
  const [step, setStep] = useState<PurchaseStep>({ phase: "idle", product: null });

  const initiatePurchase = useCallback((product: Product) => {
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
    if (!isConnected || !address) missing.push("wallet");
    if (cards.length === 0) missing.push("card");

    if (missing.length > 0) {
      setStep({ phase: "prereq", product, missing });
      return;
    }

    setStep({ phase: "confirm", product, card: cards[0], walletAddress: address! });
  }, [user, openAuth, isConnected, address, isOwned, showToast]);

  const dismiss = useCallback(() => setStep({ phase: "idle", product: null }), []);

  const confirm = useCallback(() => {
    if (step.phase !== "confirm") return;
    openCheckout(step.product);
    setStep({ phase: "idle", product: null });
  }, [step, openCheckout]);

  return { step, initiatePurchase, dismiss, confirm };
}
