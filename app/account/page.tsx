"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useOwnership } from "@/hooks/useOwnership";
import { useMarketplace } from "@/hooks/useMarketplace";
import { PRODUCTS, AUCTIONS } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import type { PurchaseRecord } from "@/lib/purchase-storage";
import PurchaseHistory from "@/components/account/PurchaseHistory";
import PaymentMethods from "@/components/account/PaymentMethods";
import Wishlist from "@/components/account/Wishlist";
import OrderTracking from "@/components/account/OrderTracking";
import CreateListingModal from "@/components/marketplace/CreateListingModal";
import GoldButton from "@/components/ui/GoldButton";

function getProductImage(productId: string): string {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (product) return product.images[0] ?? "";
  const auction = AUCTIONS.find((a) => a.id === productId);
  if (auction) return auction.image ?? "";
  return "";
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-8">
      {children}
    </p>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-[var(--border)]">
      <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoaded, logout } = useAuth();
  const { isConnected, truncatedAddress, connect, disconnect } = useWallet();
  const { purchases } = useOwnership();
  const { listings, isListed } = useMarketplace();
  const [walletMounted, setWalletMounted] = useState(false);
  const [orderRefreshKey, setOrderRefreshKey] = useState(0);
  const [listingTarget, setListingTarget] = useState<{ purchase: PurchaseRecord; image: string } | null>(null);

  useEffect(() => { setWalletMounted(true); }, []);

  useEffect(() => {
    if (isLoaded && !user) router.push("/");
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) return null;

  const createdDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Purchases eligible for marketplace listing: must have certificateId (exclusive/auction pieces)
  const authenticatedPurchases = purchases.filter((p) => !!p.certificateId);

  // Active listings belonging to this user
  const activeListings = listings.filter(
    (l) => l.status === "active" && l.sellerEmail === user.email,
  );

  // Sold listings belonging to this user
  const soldListings = listings.filter(
    (l) => l.status === "sold" && l.sellerEmail === user.email,
  );

  return (
    <div className="max-w-3xl mx-auto px-8 py-16 w-full">

      {/* Page header */}
      <div className="mb-16">
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3">
          TEST Member
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-5xl md:text-6xl font-light text-[var(--text-primary)] tracking-wide">
          My Account
        </h1>
      </div>

      {/* ── Profile ──────────────────────────────────── */}
      <section>
        <SectionHeading>Profile</SectionHeading>
        <div className="mb-8">
          <MetaRow label="Email" value={user.email} />
          <MetaRow label="Member Since" value={createdDate} />
        </div>
        <GoldButton
          variant="outline"
          size="sm"
          onClick={() => { logout(); router.push("/"); }}
        >
          Log Out
        </GoldButton>
      </section>

      <div className="border-t border-[var(--border)] my-16" />

      {/* ── Wallet ───────────────────────────────────── */}
      <section>
        <SectionHeading>Wallet</SectionHeading>
        {!walletMounted ? null : isConnected ? (
          <div>
            <div className="mb-8">
              <div className="flex justify-between items-center py-4 border-b border-[var(--border)]">
                <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                  Address
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] shrink-0" />
                  <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
                    {truncatedAddress}
                  </span>
                </div>
              </div>
              <MetaRow label="Network" value="Polygon" />
            </div>
            <GoldButton variant="outline" size="sm" onClick={disconnect}>
              Disconnect Wallet
            </GoldButton>
          </div>
        ) : (
          <div>
            <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] leading-relaxed mb-6">
              Connect a wallet to enable blockchain authentication on your purchases.
            </p>
            <GoldButton variant="primary" size="md" onClick={connect}>
              Connect Wallet
            </GoldButton>
          </div>
        )}
      </section>

      <div className="border-t border-[var(--border)] my-16" />

      {/* ── Saved Items ──────────────────────────────── */}
      <section>
        <SectionHeading>Saved Items</SectionHeading>
        <Wishlist onPurchaseComplete={() => setOrderRefreshKey((k) => k + 1)} />
      </section>

      <div className="border-t border-[var(--border)] my-16" />

      {/* ── Shop Orders ──────────────────────────────── */}
      <section>
        <SectionHeading>Shop Orders</SectionHeading>
        <OrderTracking refreshKey={orderRefreshKey} />
      </section>

      <div className="border-t border-[var(--border)] my-16" />

      {/* ── Purchase History ─────────────────────────── */}
      <section>
        <SectionHeading>Purchase History</SectionHeading>
        <PurchaseHistory />
      </section>

      {/* ── Authenticated Pieces ─────────────────────── */}
      {authenticatedPurchases.length > 0 && (
        <>
          <div className="border-t border-[var(--border)] my-16" />
          <section>
            <SectionHeading>Authenticated Pieces</SectionHeading>
            <div className="border border-[var(--border)]">
              {authenticatedPurchases.map((purchase, i) => {
                const image = getProductImage(purchase.productId);
                const listed = isListed(purchase.productId);
                return (
                  <div
                    key={purchase.id}
                    className={`px-6 py-6 flex items-center gap-6 ${i < authenticatedPurchases.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                  >
                    {/* Thumbnail */}
                    {image && (
                      <div className="relative w-16 h-20 shrink-0 bg-[var(--bg-secondary)] overflow-hidden">
                        <Image src={image} alt={purchase.productName} fill className="object-cover" sizes="64px" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[var(--text-primary)] tracking-wide leading-snug mb-1">
                        {purchase.productName}
                      </h4>
                      <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--gold)] mb-3">
                        {purchase.certificateId}
                      </p>

                      {listed ? (
                        <span className="inline-block text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] border border-[rgba(201,168,76,0.4)] px-2 py-1">
                          Listed for Auction
                        </span>
                      ) : (
                        <GoldButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setListingTarget({ purchase, image })}
                        >
                          List for Auction
                        </GoldButton>
                      )}
                    </div>

                    {/* Price */}
                    <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] shrink-0">
                      {formatPrice(purchase.price)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ── Active Listings ───────────────────────────── */}
      {activeListings.length > 0 && (
        <>
          <div className="border-t border-[var(--border)] my-16" />
          <section>
            <SectionHeading>Active Listings</SectionHeading>
            <div className="border border-[var(--border)]">
              {activeListings.map((listing, i) => {
                const endsAt = new Date(listing.endsAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={listing.id}
                    className={`px-6 py-6 flex items-center gap-6 ${i < activeListings.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                  >
                    {/* Thumbnail */}
                    {listing.image && (
                      <div className="relative w-16 h-20 shrink-0 bg-[var(--bg-secondary)] overflow-hidden">
                        <Image src={listing.image} alt={listing.productName} fill className="object-cover" sizes="64px" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[var(--text-primary)] tracking-wide leading-snug mb-1">
                        {listing.productName}
                      </h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
                        <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                          Reserve {formatPrice(listing.reservePrice)}
                        </span>
                        <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                          Current {formatPrice(listing.currentBid)}
                        </span>
                        <span className="text-[10px] font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                          Ends {endsAt}
                        </span>
                      </div>
                      <span className="inline-block text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] border border-[rgba(201,168,76,0.4)] px-2 py-1">
                        Active
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* ── Sold Listings ────────────────────────────── */}
      {soldListings.length > 0 && (
        <>
          <div className="border-t border-[var(--border)] my-16" />
          <section>
            <SectionHeading>Sold Listings</SectionHeading>
            <div className="border border-[var(--border)]">
              {soldListings.map((listing, i) => {
                const winner = listing.bidHistory.length > 0
                  ? [...listing.bidHistory].sort((a, b) =>
                      b.amount !== a.amount
                        ? b.amount - a.amount
                        : new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    )[0]
                  : null;
                return (
                  <div
                    key={listing.id}
                    className={`px-6 py-6 flex items-center gap-6 ${i < soldListings.length - 1 ? "border-b border-[var(--border)]" : ""}`}
                  >
                    {listing.image && (
                      <div className="relative w-16 h-20 shrink-0 bg-[var(--bg-secondary)] overflow-hidden">
                        <Image src={listing.image} alt={listing.productName} fill className="object-cover" sizes="64px" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[var(--text-primary)] tracking-wide leading-snug mb-1">
                        {listing.productName}
                      </h4>
                      {winner && (
                        <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)] mb-3">
                          Buyer: {winner.bidderEmail.slice(0, 4)}…{winner.bidderEmail.slice(winner.bidderEmail.indexOf("@"))}
                        </p>
                      )}
                      <span className="inline-block text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] border border-[rgba(201,168,76,0.4)] px-2 py-1">
                        Sold
                      </span>
                    </div>
                    {winner && (
                      <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] shrink-0">
                        {formatPrice(winner.amount)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}

      <div className="border-t border-[var(--border)] my-16" />

      {/* ── Payment Methods ───────────────────────────── */}
      <section>
        <SectionHeading>Payment Methods</SectionHeading>
        <PaymentMethods email={user.email} />
      </section>

      {/* ── Create Listing Modal ─────────────────────── */}
      {listingTarget && (
        <CreateListingModal
          purchase={listingTarget.purchase}
          image={listingTarget.image}
          onClose={() => setListingTarget(null)}
        />
      )}

    </div>
  );
}
