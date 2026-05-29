"use client";

import Link from "next/link";
import Image from "next/image";
import { useMarketplace } from "@/hooks/useMarketplace";
import { formatPrice } from "@/lib/utils";
import CountdownTimer from "@/components/ui/CountdownTimer";
import type { MarketplaceListing } from "@/lib/marketplace-types";

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
  const { listings } = useMarketplace();
  const activeListings = listings.filter((l) => l.status === "active");

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 w-full">
      <div className="mb-14">
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
    </div>
  );
}
