"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import type { MarketplaceListing, MarketplaceBid } from "@/lib/marketplace-types";
import type { PurchaseRecord } from "@/lib/purchase-storage";
import { OwnershipContext } from "@/components/providers/OwnershipProvider";

type CreateListingParams = Omit<MarketplaceListing, "id" | "bidHistory" | "status" | "currentBid">;

interface MarketplaceContextValue {
  listings: MarketplaceListing[];
  createListing: (params: CreateListingParams) => void;
  placeBid: (listingId: string, bid: Omit<MarketplaceBid, "id">) => void;
  settleAuction: (listingId: string, options?: { force?: boolean }) => void;
  getListingById: (listingId: string) => MarketplaceListing | null;
  getListingByProductId: (productId: string) => MarketplaceListing | null;
  isListed: (productId: string) => boolean;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function useMarketplaceContext() {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error("useMarketplace must be used inside MarketplaceProvider");
  return ctx;
}

export default function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const ownership = useContext(OwnershipContext);

  // Ref keeps latest listings accessible in stable callbacks without re-creating them
  const listingsRef = useRef<MarketplaceListing[]>([]);
  listingsRef.current = listings;

  const createListing = useCallback((params: CreateListingParams) => {
    const listing: MarketplaceListing = {
      ...params,
      id: `listing-${Date.now()}`,
      currentBid: params.reservePrice,
      bidHistory: [],
      status: "active",
    };
    setListings((prev) => [...prev, listing]);
  }, []);

  const settleAuction = useCallback((listingId: string, options?: { force?: boolean }) => {
    const listing = listingsRef.current.find((l) => l.id === listingId);
    if (!listing || listing.status !== "active") return;
    if (!options?.force && new Date(listing.endsAt).getTime() >= Date.now()) return;

    const noBids = listing.bidHistory.length === 0;
    const reserveNotMet = listing.currentBid < listing.reservePrice;

    if (noBids || reserveNotMet) {
      setListings((prev) =>
        prev.map((l) => l.id === listingId ? { ...l, status: "ended" as const } : l)
      );
      return;
    }

    // Winner: sort by amount DESC, timestamp DESC (tie-break)
    const sorted = [...listing.bidHistory].sort((a, b) =>
      b.amount !== a.amount
        ? b.amount - a.amount
        : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const winner = sorted[0];

    // Mark sold — idempotent guard for subsequent calls
    setListings((prev) =>
      prev.map((l) => l.id === listingId ? { ...l, status: "sold" as const } : l)
    );

    // Transfer ownership
    ownership?.removeOwnership(listing.sellerEmail, listing.productId);
    const txHash =
      "0x" +
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const record: PurchaseRecord = {
      id: `auction-${listingId}-${Date.now()}`,
      productId: listing.productId,
      productName: listing.productName,
      certificateId: listing.certificateId,
      price: winner.amount,
      purchasedAt: new Date().toISOString(),
      walletAddress: winner.bidderWallet,
      txHash,
    };
    ownership?.addOwnership(record);
  }, [ownership]);

  const placeBid = useCallback((listingId: string, bid: Omit<MarketplaceBid, "id">) => {
    const newBid: MarketplaceBid = {
      ...bid,
      id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    let triggerInstantBuy = false;
    const updatedListings = listingsRef.current.map((l) => {
      if (l.id !== listingId) return l;
      const updatedHistory = [newBid, ...l.bidHistory];
      const currentBid = Math.max(...updatedHistory.map((b) => b.amount));
      if (l.buyNowPrice !== undefined && newBid.amount >= l.buyNowPrice) {
        triggerInstantBuy = true;
      }
      return { ...l, bidHistory: updatedHistory, currentBid };
    });

    // Keep the ref in sync immediately so settleAuction (called synchronously
    // below) sees this bid — setListings alone won't update it until re-render.
    listingsRef.current = updatedListings;
    setListings(updatedListings);

    if (triggerInstantBuy) {
      settleAuction(listingId, { force: true });
    }
  }, [settleAuction]);

  const getListingById = useCallback(
    (listingId: string) => listings.find((l) => l.id === listingId) ?? null,
    [listings],
  );

  const getListingByProductId = useCallback(
    (productId: string) => listings.find((l) => l.productId === productId) ?? null,
    [listings],
  );

  const isListed = useCallback(
    (productId: string) => listings.some((l) => l.productId === productId && l.status === "active"),
    [listings],
  );

  return (
    <MarketplaceContext.Provider value={{ listings, createListing, placeBid, settleAuction, getListingById, getListingByProductId, isListed }}>
      {children}
    </MarketplaceContext.Provider>
  );
}
