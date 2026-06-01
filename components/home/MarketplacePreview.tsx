"use client";

import Link from "next/link";
import Image from "next/image";
import { useMarketplace } from "@/hooks/useMarketplace";
import { formatPrice } from "@/lib/utils";
import CountdownTimer from "@/components/ui/CountdownTimer";
import type { MarketplaceListing } from "@/lib/marketplace-types";

function ListingPreviewCard({ listing }: { listing: MarketplaceListing }) {
  return (
    <Link href={`/auctions/${listing.id}`} className="group block">
      <div className="relative aspect-[3/4] bg-[var(--bg-dark-secondary)] overflow-hidden mb-4">
        {listing.image && (
          <Image
            src={listing.image}
            alt={listing.productName}
            fill
            className="object-cover"
            sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw"
          />
        )}
        <div className="absolute inset-0 bg-transparent group-hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-500" />
      </div>

      <div className="space-y-2">
        <h3 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[var(--text-primary)] tracking-wide group-hover:text-[var(--gold)] transition-colors">
          {listing.productName}
        </h3>

        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-0.5">
              Current Bid
            </p>
            <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
              {formatPrice(listing.currentBid)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] tracking-widests uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-0.5">
              Bids
            </p>
            <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
              {listing.bidHistory.length}
            </p>
          </div>
        </div>

        <div>
          <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-0.5">
            Ends In
          </p>
          <CountdownTimer
            endDate={listing.endsAt}
            className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]"
          />
        </div>
      </div>
    </Link>
  );
}

export default function MarketplacePreview() {
  const { listings } = useMarketplace();
  const activeListings = listings
    .filter((l) => l.status === "active")
    .slice(0, 3);

  return (
    <section className="max-w-7xl mx-auto px-8 py-24 w-full">
      <div className="flex items-baseline justify-between mb-12">
        <div className="flex items-center gap-4">
          <span
            className={`w-1.5 h-1.5 rounded-full bg-[var(--gold)] ${
              activeListings.length > 0 ? "animate-pulse" : "opacity-30"
            }`}
          />
          <h2 className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
            Live Auctions
          </h2>
        </div>
        <Link
          href="/auctions"
          className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors border-b border-transparent hover:border-current pb-0.5"
        >
          View Marketplace →
        </Link>
      </div>

      {activeListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {activeListings.map((listing) => (
            <ListingPreviewCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="border border-[var(--border)] py-20 text-center">
          <h3 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[var(--text-primary)] tracking-wide mb-3">
            Authenticated Resale Marketplace
          </h3>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-8">
            Own an authenticated piece and list it for resale
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/exclusive"
              className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] border border-[var(--border)] px-6 py-3 hover:border-[var(--gold)] transition-colors"
            >
              Shop Exclusive
            </Link>
            <Link
              href="/auctions"
              className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] border border-[rgba(201,168,76,0.4)] px-6 py-3 hover:bg-[rgba(201,168,76,0.06)] transition-colors"
            >
              View Marketplace
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
