"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useOwnership } from "@/hooks/useOwnership";
import { useMarketplace } from "@/hooks/useMarketplace";
import { PRODUCTS, AUCTIONS } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import CountdownTimer from "@/components/ui/CountdownTimer";
import GoldButton from "@/components/ui/GoldButton";
import SelectItemModal from "@/components/marketplace/SelectItemModal";
import CreateListingModal from "@/components/marketplace/CreateListingModal";
import type { MarketplaceListing } from "@/lib/marketplace-types";
import type { PurchaseRecord } from "@/lib/purchase-storage";

function getProductImage(productId: string): string {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (product) return product.images[0] ?? "";
  const auction = AUCTIONS.find((a) => a.id === productId);
  if (auction) return auction.image ?? "";
  return "";
}

function ListingCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <Link href={`/auctions/${listing.id}`} className="group block">
      <div className="relative aspect-[3/4] bg-[var(--bg-dark-secondary)] overflow-hidden mb-5">
        {listing.image ? (
          <Image
            src={listing.image}
            alt={listing.productName}
            fill
            className="object-cover"
            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
          />
        ) : null}
        <div className="absolute inset-0 bg-transparent group-hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-500" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-[family-name:var(--font-ibm-mono)] text-[9px] text-[rgba(255,255,255,0.3)] truncate">
            {listing.certificateId}
          </p>
        </div>
      </div>

      <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-[var(--text-primary)] tracking-wide mb-4 group-hover:text-[var(--gold)] transition-colors duration-200">
        {listing.productName}
      </h3>

      <div className="grid grid-cols-2 divide-x divide-[var(--border)] border border-[var(--border)] mb-3">
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
            Current Bid
          </p>
          <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
            {formatPrice(listing.currentBid)}
          </p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
            Ends In
          </p>
          <CountdownTimer endDate={listing.endsAt} className="text-sm text-[var(--text-primary)]" />
        </div>
      </div>
    </Link>
  );
}

export default function AuctionsPage() {
  const { user, openAuth } = useAuth();
  const { purchases } = useOwnership();
  const { listings } = useMarketplace();

  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseRecord | null>(null);
  const [noEligibleMessage, setNoEligibleMessage] = useState(false);

  const activeListings = listings.filter((l) => l.status === "active");

  const eligiblePurchases = purchases.filter(
    (p) => !!p.certificateId && p.certificateId !== "" && p.productId.startsWith("excl-")
  );

  function handleListButtonClick() {
    if (!user) {
      openAuth("signup");
      return;
    }
    if (eligiblePurchases.length === 0) {
      setNoEligibleMessage(true);
      return;
    }
    setNoEligibleMessage(false);
    setSelectModalOpen(true);
  }

  function handleSelectItem(purchase: PurchaseRecord) {
    setSelectedPurchase(purchase);
    setSelectModalOpen(false);
    setCreateModalOpen(true);
  }

  const selectedImage = selectedPurchase ? getProductImage(selectedPurchase.productId) : "";

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 w-full">
      {/* Page header */}
      <div className="mb-14">
        <div className="flex items-start justify-between gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <span
                className={`w-1.5 h-1.5 rounded-full bg-[var(--gold)] ${
                  activeListings.length > 0 ? "animate-pulse" : "opacity-30"
                }`}
              />
              <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)]">
                {activeListings.length > 0 ? "Live Now" : "No Active Auctions"}
              </p>
            </div>
            <h1 className="font-[family-name:var(--font-cormorant)] text-5xl md:text-6xl font-light text-[var(--text-primary)] tracking-wide">
              Auctions
            </h1>
            <p className="mt-4 text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] max-w-md leading-relaxed">
              Authenticated archive pieces, open for bidding. Each lot is permanently
              certified and verifiable on-chain.
            </p>
          </div>

          {/* List button + inline message */}
          <div className="shrink-0 flex flex-col items-end gap-3 pt-1">
            <GoldButton variant="primary" size="md" onClick={handleListButtonClick}>
              List an Item for Auction
            </GoldButton>
            {noEligibleMessage && (
              <p className="text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] text-right max-w-[220px] leading-relaxed">
                You don&apos;t own any authenticated pieces yet.{" "}
                <Link
                  href="/exclusive"
                  className="text-[var(--gold)] underline underline-offset-2 hover:text-[var(--gold-light)] transition-colors"
                >
                  Browse the Exclusive collection
                </Link>{" "}
                to acquire one.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Listings grid */}
      {activeListings.length === 0 ? (
        <div className="border border-[var(--border)] py-24 text-center">
          <p className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[var(--text-muted)] tracking-wide mb-3">
            No auctions at this time
          </p>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
            Authenticated pieces listed for auction will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {activeListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* Select item modal */}
      {selectModalOpen && (
        <SelectItemModal
          open={selectModalOpen}
          onClose={() => setSelectModalOpen(false)}
          onSelect={handleSelectItem}
        />
      )}

      {/* Create listing modal */}
      {createModalOpen && selectedPurchase && (
        <CreateListingModal
          purchase={selectedPurchase}
          image={selectedImage}
          onClose={() => {
            setCreateModalOpen(false);
            setSelectedPurchase(null);
          }}
        />
      )}
    </div>
  );
}
