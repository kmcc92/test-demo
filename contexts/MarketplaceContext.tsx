"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import type { MarketplaceListing, MarketplaceBid } from "@/lib/marketplace-types";
import {
  transferOwnershipEntry,
  getMarketplaceListings,
  marketplaceVersion,
  hydrateMarketplace,
  createMarketplaceListingEntry,
  setMarketplaceListingStatusEntry,
} from "@/lib/repositories";
import { useDomainSubscription } from "@/lib/use-domain-subscription";
import { useToast } from "@/components/ui/Toast";

export interface AuctionWinner {
  email: string;
  wallet: string;
  amount: number;
  listingId: string;
}

type CreateListingParams = Omit<MarketplaceListing, "id" | "bidHistory" | "status" | "currentBid">;

interface MarketplaceContextValue {
  listings: MarketplaceListing[];
  createListing: (params: CreateListingParams) => Promise<void>;
  placeBid: (listingId: string, bid: Omit<MarketplaceBid, "id">) => void;
  settleAuction: (listingId: string, options?: { force?: boolean }) => Promise<void>;
  determineAuctionWinner: (listingId: string) => AuctionWinner | null;
  completeAuctionTransfer: (listingId: string, stripePaymentId: string) => Promise<void>;
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

// STEP 10a — LISTINGS PERSISTENCE ONLY.
//
// Listing SCALARS are now persisted in Supabase and owned by
// lib/repositories/supabase/marketplaceRepo.ts (the sole snapshot owner). This
// provider is the lifecycle mount point for that repo AND — TEMPORARILY, until
// bids migrate in Step 10b — still owns the SESSION-ONLY per-listing bid state
// (`sessionBids`). Bids are out of scope for this step, so placeBid / bidHistory
// / determineAuctionWinner keep their existing session semantics unchanged; the
// only change is WHERE bids are stored (a dedicated session map instead of being
// embedded in the listings array, which the repo now owns).
//
// `listings` exposed here is the COMPOSITION: persisted repo listings + the
// session bid overlay (bidHistory + a live currentBid = max(persisted, bids)).
// Auction/bid-displaying consumers read this composed value; pure
// visibility/status consumers read the index accessors directly.
export default function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const { show: showToast } = useToast();

  // Lifecycle: hydrate the persisted-listings repo on mount, dispose on unmount.
  useEffect(() => {
    let active = true;
    let dispose: (() => void) | null = null;

    hydrateMarketplace()
      .then((teardown) => {
        if (active) dispose = teardown;
        else teardown();
      })
      .catch(() => {
        // Hydration failure leaves an empty snapshot; nothing to surface.
      });

    return () => {
      active = false;
      if (dispose) dispose();
    };
  }, []);

  // Re-render when the persisted listing snapshot changes (hydrate / create /
  // status). The composed `listings` below reads the repo synchronously.
  const repoVersion = useDomainSubscription(
    "marketplace-listings-changed",
    () => marketplaceVersion()
  );

  // SESSION-ONLY bid overlay (temporary — Step 10b migrates bids). Map of
  // listingId → bids (newest first), exactly as the listings array held before.
  const [sessionBids, setSessionBids] = useState<Map<string, MarketplaceBid[]>>(
    () => new Map()
  );

  // Compose persisted listings with the session bid overlay.
  const listings = useMemo<MarketplaceListing[]>(() => {
    void repoVersion; // recompute whenever the persisted snapshot changes
    return getMarketplaceListings().map((listing) => {
      const bids = sessionBids.get(listing.id);
      if (!bids || bids.length === 0) return listing;
      const currentBid = Math.max(listing.currentBid, ...bids.map((b) => b.amount));
      return { ...listing, bidHistory: bids, currentBid };
    });
  }, [repoVersion, sessionBids]);

  // Ref keeps the latest composed listings accessible in stable callbacks
  // (determineAuctionWinner / settleAuction / completeAuctionTransfer are called
  // synchronously from the auction page's effects).
  const listingsRef = useRef<MarketplaceListing[]>(listings);
  listingsRef.current = listings;

  const createListing = useCallback(async (params: CreateListingParams) => {
    const listing: MarketplaceListing = {
      ...params,
      id: `listing-${Date.now()}`,
      currentBid: params.reservePrice,
      bidHistory: [],
      status: "active",
    };
    // Persist-first; the repo emits "marketplace-listings-changed" on success and
    // the composed `listings` picks it up.
    await createMarketplaceListingEntry(listing);
  }, []);

  // Pure computation — no state changes, no side effects. Reads the composed
  // listing (bid overlay included). Returns the top bidder if the auction has a
  // valid winner, null otherwise.
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
    async (listingId: string, stripePaymentId: string) => {
      const listing = listingsRef.current.find((l) => l.id === listingId);
      if (!listing || listing.status === "sold") return;

      const sorted = [...listing.bidHistory].sort((a, b) =>
        b.amount !== a.amount
          ? b.amount - a.amount
          : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      const topBid = sorted[0];
      if (!topBid) return;

      // Persist-first: mark the listing sold BEFORE the transfer. The status write
      // is the idempotency guard (a re-fire sees status "sold" and returns). The
      // RPC is ALSO idempotent on payment_ref, so a double-fire cannot
      // double-transfer.
      try {
        await setMarketplaceListingStatusEntry(listingId, "sold");
      } catch (err) {
        console.error(`completeAuctionTransfer: failed to mark listing ${listingId} sold:`, err);
        showToast("Payment received but the listing could not be updated. Please contact support.");
        return;
      }

      try {
        // Atomic cross-user transfer via Postgres RPC: seller loses + buyer gains
        // in ONE transaction (never two client-side writes). certificateId carried
        // verbatim (#2); payment reference threaded (#3). Buyer/seller purchase
        // snapshots update via realtime. UNCHANGED ownership path.
        await transferOwnershipEntry({
          paymentRef: stripePaymentId,
          certificateId: listing.certificateId,
          productId: listing.productId,
          productName: listing.productName,
          buyerEmail: topBid.bidderEmail,
          sellerEmail: listing.sellerEmail,
          price: topBid.amount,
          buyerWallet: topBid.bidderWallet || undefined,
          productImage: listing.image,
          productDescription: "",
        });
      } catch (err) {
        console.error(`completeAuctionTransfer failed for listing ${listingId}:`, err);
        showToast("Payment received but ownership transfer failed. Please contact support.");
      }
    },
    [showToast]
  );

  // Marks a listing "ended" when there is no valid winner (no bids, reserve not met,
  // or winner is not present to complete payment). Does not transfer ownership.
  const settleAuction = useCallback(
    async (listingId: string, options?: { force?: boolean }) => {
      const listing = listingsRef.current.find((l) => l.id === listingId);
      if (!listing || listing.status !== "active") return;
      if (!options?.force && new Date(listing.endsAt).getTime() >= Date.now()) return;
      // Persist-first; the repo emits and the composed listing flips to "ended".
      await setMarketplaceListingStatusEntry(listingId, "ended");
    },
    []
  );

  // SESSION-ONLY (bids out of scope this step). Appends to the session bid map;
  // the composed `listings` recomputes bidHistory + currentBid. Rules unchanged.
  const placeBid = useCallback((listingId: string, bid: Omit<MarketplaceBid, "id">) => {
    const newBid: MarketplaceBid = {
      ...bid,
      id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    setSessionBids((prev) => {
      const next = new Map(prev);
      const existing = next.get(listingId) ?? [];
      next.set(listingId, [newBid, ...existing]);
      return next;
    });
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
