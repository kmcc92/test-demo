"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import type { MarketplaceListing, MarketplaceBid } from "@/lib/marketplace-types";
import type { PurchaseRecord } from "@/lib/purchase-storage";
import { OwnershipContext } from "@/components/providers/OwnershipProvider";
import { useToast } from "@/components/ui/Toast";
import { emitDomainEvent } from "@/lib/domain-events";

export interface AuctionWinner {
  email: string;
  wallet: string;
  amount: number;
  listingId: string;
}

type CreateListingParams = Omit<MarketplaceListing, "id" | "bidHistory" | "status" | "currentBid">;

interface MarketplaceContextValue {
  listings: MarketplaceListing[];
  createListing: (params: CreateListingParams) => void;
  placeBid: (listingId: string, bid: Omit<MarketplaceBid, "id">) => void;
  settleAuction: (listingId: string, options?: { force?: boolean }) => void;
  determineAuctionWinner: (listingId: string) => AuctionWinner | null;
  completeAuctionTransfer: (listingId: string, stripePaymentId: string) => void;
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
  const { show: showToast } = useToast();

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

  // Pure computation — no state changes, no side effects.
  // Returns the top bidder if the auction has a valid winner, null otherwise.
  const determineAuctionWinner = useCallback(
    (listingId: string): AuctionWinner | null => {
      const listing = listingsRef.current.find((l) => l.id === listingId);
      if (!listing || listing.status !== "active") return null;
      if (listing.bidHistory.length === 0) return null;
      if (listing.currentBid < listing.reservePrice) return null;

      const sorted = [...listing.bidHistory].sort((a, b) =>
        b.amount !== a.amount
          ? b.amount - a.amount
          : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const topBid = sorted[0];
      return {
        email: topBid.bidderEmail,
        wallet: topBid.bidderWallet,
        amount: topBid.amount,
        listingId,
      };
    },
    []
  );

  // Called ONLY after Stripe payment is confirmed.
  // Idempotent: sold listing is a no-op.
  const completeAuctionTransfer = useCallback(
    (listingId: string, stripePaymentId: string) => {
      const listing = listingsRef.current.find((l) => l.id === listingId);
      if (!listing || listing.status === "sold") return;

      const sorted = [...listing.bidHistory].sort((a, b) =>
        b.amount !== a.amount
          ? b.amount - a.amount
          : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const topBid = sorted[0];
      if (!topBid) return;

      setListings((prev) =>
        prev.map((l) => l.id === listingId ? { ...l, status: "sold" as const } : l)
      );

      try {
        ownership?.removeOwnership(listing.sellerEmail, listing.productId);
        const record: PurchaseRecord = {
          id: stripePaymentId,
          productId: listing.productId,
          productName: listing.productName,
          certificateId: listing.certificateId,
          txHash: stripePaymentId,
          price: topBid.amount,
          purchasedAt: new Date().toISOString(),
          walletAddress: topBid.bidderWallet || undefined,
        };
        ownership?.addOwnership(record);
        emitDomainEvent("purchases-changed");
      } catch (err) {
        console.error(`completeAuctionTransfer failed for listing ${listingId}:`, err);
        showToast("Payment received but ownership transfer failed. Please contact support.");
      }
    },
    [ownership, showToast]
  );

  // Marks a listing "ended" when there is no valid winner (no bids, reserve not met,
  // or winner is not present to complete payment). Does not transfer ownership.
  const settleAuction = useCallback((listingId: string, options?: { force?: boolean }) => {
    const listing = listingsRef.current.find((l) => l.id === listingId);
    if (!listing || listing.status !== "active") return;
    if (!options?.force && new Date(listing.endsAt).getTime() >= Date.now()) return;
    setListings((prev) =>
      prev.map((l) => l.id === listingId ? { ...l, status: "ended" as const } : l)
    );
  }, []);

  const placeBid = useCallback((listingId: string, bid: Omit<MarketplaceBid, "id">) => {
    const newBid: MarketplaceBid = {
      ...bid,
      id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    const updatedListings = listingsRef.current.map((l) => {
      if (l.id !== listingId) return l;
      const updatedHistory = [newBid, ...l.bidHistory];
      const currentBid = Math.max(...updatedHistory.map((b) => b.amount));
      return { ...l, bidHistory: updatedHistory, currentBid };
    });

    // Keep the ref in sync immediately so determineAuctionWinner (called synchronously
    // by the auction page's useEffect after setListings triggers a re-render) sees
    // this bid.
    listingsRef.current = updatedListings;
    setListings(updatedListings);
  }, []);

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
    <MarketplaceContext.Provider value={{
      listings,
      createListing,
      placeBid,
      settleAuction,
      determineAuctionWinner,
      completeAuctionTransfer,
      getListingById,
      getListingByProductId,
      isListed,
    }}>
      {children}
    </MarketplaceContext.Provider>
  );
}
