"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useMarketplace } from "@/hooks/useMarketplace";
import { formatPrice } from "@/lib/utils";
import type { MarketplaceBid } from "@/lib/marketplace-types";
import CountdownTimer from "@/components/ui/CountdownTimer";
import AuthBadge from "@/components/ui/AuthBadge";
import BidForm from "@/components/marketplace/BidForm";
import {
  getMarketplaceCertificateBadge,
  type MarketplaceCertificateBadge,
} from "@/lib/marketplace-certificate-view";

function pickWinner(bidHistory: MarketplaceBid[]): MarketplaceBid | null {
  if (bidHistory.length === 0) return null;
  return [...bidHistory].sort((a, b) =>
    b.amount !== a.amount
      ? b.amount - a.amount
      : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
}

function truncateEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 4) return email;
  return email.slice(0, 4) + "…" + email.slice(at);
}

export default function AuctionPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { getListingById, settleAuction } = useMarketplace();
  const listing = getListingById(id);

  const [certBadge, setCertBadge] = useState<MarketplaceCertificateBadge>({
    hasCertificate: false,
  });

  useEffect(() => {
    if (!listing?.productId) return;
    setCertBadge(getMarketplaceCertificateBadge(listing.productId));
  }, [listing?.productId]);

  useEffect(() => {
    if (!listing || listing.status !== "active") return;
    const listingId = listing.id;
    const ms = new Date(listing.endsAt).getTime() - Date.now();
    if (ms <= 0) {
      settleAuction(listingId);
      return;
    }
    const timer = setTimeout(() => settleAuction(listingId), ms);
    return () => clearTimeout(timer);
  }, [listing?.id, listing?.endsAt, listing?.status, settleAuction]);

  if (!listing) notFound();

  const winner = pickWinner(listing.bidHistory);
  const userWon = !!winner && !!user && user.email === winner.bidderEmail;

  return (
    <div className="max-w-7xl mx-auto px-8 py-12 w-full">
      <Link
        href="/auctions"
        className="inline-flex items-center gap-2 mb-10 text-[11px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] hover:text-[var(--gold)] transition-colors duration-200 group"
      >
        <svg
          width="16"
          height="10"
          viewBox="0 0 16 10"
          fill="none"
          className="transition-transform duration-200 group-hover:-translate-x-1"
        >
          <path
            d="M5 1L1 5M1 5L5 9M1 5H15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Auctions
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Left: Image */}
        <div className="space-y-3">
          <div className="relative aspect-[3/4] bg-[var(--bg-dark-secondary)] overflow-hidden">
            {listing.image ? (
              <Image
                src={listing.image}
                alt={listing.productName}
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw,50vw"
              />
            ) : null}
            <div className="absolute inset-0 flex items-end p-6">
              <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[rgba(255,255,255,0.3)]">
                {listing.certificateId}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Reserve Auction
            </p>
            <AuthBadge size="sm" />
          </div>

          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light text-[var(--text-primary)] tracking-wide leading-tight mb-6">
            {listing.productName}
          </h1>

          {listing.condition && (
            <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] leading-relaxed mb-8">
              {listing.condition}
            </p>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 border border-[var(--border)]">
              <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
                Reserve Price
              </p>
              <p className="font-[family-name:var(--font-ibm-mono)] text-lg text-[var(--text-primary)]">
                {formatPrice(listing.reservePrice)}
              </p>
            </div>
            <div className="p-4 border border-[var(--border)]">
              <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
                Bids
              </p>
              <p className="font-[family-name:var(--font-ibm-mono)] text-lg text-[var(--text-primary)]">
                {listing.bidHistory.length}
              </p>
            </div>
          </div>

          {/* Active: countdown + bid form / Ended: result state */}
          {listing.status === "active" ? (
            <>
              <div className="p-6 border border-[var(--border)] mb-8">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                    Ends In
                  </p>
                  <CountdownTimer endDate={listing.endsAt} className="text-[var(--text-primary)]" />
                </div>
              </div>
              <BidForm listing={listing} />
            </>
          ) : (
            <div className="p-6 border border-[var(--border)] mb-8">
              {listing.status === "sold" ? (
                userWon ? (
                  /* Current user won */
                  <div className="space-y-4">
                    <p className="text-[9px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)]">
                      You Won This Auction
                    </p>
                    <p className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide">
                      {formatPrice(winner!.amount)}
                    </p>
                    <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--gold)]">
                      {listing.certificateId}
                    </p>
                    <p className="text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                      Certificate transferred to your account
                    </p>
                    <div className="flex gap-3 pt-2">
                      <Link
                        href={`/verify?id=${listing.certificateId}`}
                        className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] border border-[rgba(201,168,76,0.4)] px-3 py-2 hover:bg-[rgba(201,168,76,0.06)] transition-colors"
                      >
                        Verify Certificate
                      </Link>
                      <Link
                        href="/account"
                        className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] border border-[var(--border)] px-3 py-2 hover:border-[var(--gold)] transition-colors"
                      >
                        My Account
                      </Link>
                    </div>
                  </div>
                ) : (
                  /* Sold to another bidder */
                  <div className="space-y-3">
                    <p className="text-[9px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                      Auction Ended — Sold
                    </p>
                    <p className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide">
                      {winner ? formatPrice(winner.amount) : "—"}
                    </p>
                    {winner && (
                      <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]">
                        Buyer: {truncateEmail(winner.bidderEmail)}
                      </p>
                    )}
                    <p className="text-xs font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                      Certificate transferred to new owner
                    </p>
                  </div>
                )
              ) : listing.bidHistory.length === 0 ? (
                /* Ended — no bids */
                <div className="space-y-3">
                  <p className="text-[9px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                    Auction Ended — No Bids
                  </p>
                  <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                    Item returned to seller
                  </p>
                </div>
              ) : (
                /* Ended — reserve not met */
                <div className="space-y-3">
                  <p className="text-[9px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                    Auction Ended — Reserve Not Met
                  </p>
                  <p className="font-[family-name:var(--font-ibm-mono)] text-lg text-[var(--text-primary)]">
                    {winner ? formatPrice(winner.amount) : "—"}
                  </p>
                  <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                    Item returned to seller
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Certificate + provenance meta */}
          <div className="border-t border-[var(--border)] pt-6 space-y-0">
            <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
              <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                Certificate
              </span>
              <span className="font-[family-name:var(--font-ibm-mono)] text-xs text-[var(--gold)]">
                {listing.certificateId}
              </span>
            </div>
            {listing.provenanceDepth > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
                <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                  Provenance
                </span>
                <span className="font-[family-name:var(--font-ibm-mono)] text-xs text-[var(--text-primary)]">
                  {listing.provenanceDepth} transfer{listing.provenanceDepth !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {listing.serviceHistoryCount > 0 && (
              <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
                <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                  Service Records
                </span>
                <span className="font-[family-name:var(--font-ibm-mono)] text-xs text-[var(--text-primary)]">
                  {listing.serviceHistoryCount}
                </span>
              </div>
            )}
          </div>

          {/* Item Metadata — merchant certificate record, display only */}
          {certBadge.hasCertificate && (
            <div className="border-t border-[var(--border)] pt-6 mt-6 space-y-0">
              <p className="text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-4">
                Item Metadata
              </p>
              <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
                <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                  Issued Record
                </span>
                <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]">
                  {certBadge.certificateId}
                </span>
              </div>
              {certBadge.provenanceDepth !== undefined && (
                <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
                  <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                    Provenance Depth
                  </span>
                  <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]">
                    {certBadge.provenanceDepth}
                  </span>
                </div>
              )}
              {certBadge.serviceHistoryCount !== undefined && (
                <div className="flex justify-between items-center py-3 border-b border-[var(--border)]">
                  <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                    Service History
                  </span>
                  <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]">
                    {certBadge.serviceHistoryCount}
                  </span>
                </div>
              )}
              <p className="text-[8px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] opacity-50 pt-3">
                Certificate metadata available
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
