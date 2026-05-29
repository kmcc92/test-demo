"use client";

import { useMarketplaceContext } from "@/contexts/MarketplaceContext";

export function useMarketplace() {
  return useMarketplaceContext();
}
