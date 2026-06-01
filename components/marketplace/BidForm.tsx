"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { MarketplaceListing } from "@/lib/marketplace-types";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useMarketplace } from "@/hooks/useMarketplace";
import { readCards } from "@/lib/payment-storage";
import { formatPrice, formatAddress, formatTimestamp } from "@/lib/utils";
import GoldButton from "@/components/ui/GoldButton";
import { useToast } from "@/components/ui/Toast";

interface BidFormProps {
  listing: MarketplaceListing;
}

export default function BidForm({ listing }: BidFormProps) {
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const { isConnected, address } = useWallet();
  const { placeBid } = useMarketplace();
  const { show: showToast } = useToast();

  const [bidInput, setBidInput] = useState("");
  const [error, setError] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);

  const minBid = listing.currentBid + listing.minimumIncrement;
  const reserveMet = listing.currentBid >= listing.reservePrice;
  const isExpired = new Date(listing.endsAt).getTime() < Date.now();

  function validate(): string | null {
    if (!user) return "Please sign in to place a bid";
    if (!isConnected || !address) return "Please connect your wallet in My Account";
    const cards = readCards(user.email);
    if (cards.length === 0) return "Please add a payment method in My Account";
    if (isExpired) return "This auction has ended";
    if (user.email === listing.sellerEmail) return "You cannot bid on your own listing";
    const amount = parseInt(bidInput.replace(/[^0-9]/g, ""), 10);
    if (!amount || isNaN(amount) || amount <= 0) return `Minimum bid: ${formatPrice(minBid)}`;
    if (amount < minBid) return `Minimum bid: ${formatPrice(minBid)}`;
    return null;
  }

  function handleBid() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const amount = parseInt(bidInput.replace(/[^0-9]/g, ""), 10);
    setError("");
    setIsPlacing(true);

    setTimeout(() => {
      placeBid(listing.id, {
        bidderEmail: user!.email,
        bidderWallet: address! as string,
        amount,
        timestamp: new Date().toISOString(),
      });
      setBidInput("");
      setIsPlacing(false);
      showToast("Bid placed successfully", "gold");
    }, 800);
  }

  return (
    <div>
      {/* Current bid + reserve indicator */}
      <div className="p-6 border border-[var(--border)] mb-6">
        <div className="flex items-start justify-between mb-1">
          <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
            Current Bid
          </p>
          <span
            className={`text-[9px] tracking-[0.25em] uppercase font-[family-name:var(--font-dm-sans)] ${
              reserveMet ? "text-[var(--gold)]" : "text-[var(--text-muted)]"
            }`}
          >
            {reserveMet ? "Reserve met" : "Reserve not yet met"}
          </span>
        </div>
        <motion.p
          key={listing.currentBid}
          initial={reduced ? {} : { opacity: 0.6, y: -4 }}
          animate={reduced ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="font-[family-name:var(--font-ibm-mono)] text-2xl text-[var(--text-primary)]"
        >
          {formatPrice(listing.currentBid)}
        </motion.p>
      </div>

      {/* Bid input */}
      <div className="space-y-3 mb-8">
        <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
          Place a Bid
        </p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-[family-name:var(--font-ibm-mono)] text-[var(--text-muted)] text-sm">
              $
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={bidInput}
              onChange={(e) => {
                setBidInput(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleBid();
              }}
              disabled={isPlacing}
              placeholder="Enter bid amount"
              className="w-full h-12 pl-8 pr-4 border border-[var(--border)] bg-transparent font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors disabled:opacity-50"
            />
          </div>
          <GoldButton
            variant="primary"
            size="md"
            loading={isPlacing}
            disabled={isPlacing}
            onClick={handleBid}
            className="shrink-0 px-8"
          >
            Place Bid
          </GoldButton>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key={error}
              initial={reduced ? {} : { opacity: 0, y: -4 }}
              animate={reduced ? {} : { opacity: 1, y: 0 }}
              exit={reduced ? {} : { opacity: 0 }}
              className="text-xs font-[family-name:var(--font-dm-sans)] text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
          Minimum bid: {formatPrice(minBid)}
        </p>
      </div>

      {/* Bid history */}
      {listing.bidHistory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-1 rounded-full bg-[var(--gold)]" />
            <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              Bid History
            </p>
            <span className="ml-auto font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]">
              {listing.bidHistory.length} bid{listing.bidHistory.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="border border-[var(--border)]">
            <AnimatePresence initial={false}>
              {listing.bidHistory.map((bid, i) => (
                <motion.div
                  key={bid.id}
                  initial={reduced ? {} : { opacity: 0, y: -16, backgroundColor: "rgba(201,168,76,0.08)" }}
                  animate={reduced ? {} : { opacity: 1, y: 0, backgroundColor: "rgba(201,168,76,0)" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < listing.bidHistory.length - 1 ? "border-b border-[var(--border)]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {i === 0 && (
                      <span className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)]">
                        ↑
                      </span>
                    )}
                    <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]">
                      {formatAddress(bid.bidderWallet)}
                    </span>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-[family-name:var(--font-ibm-mono)] text-xs text-[var(--text-secondary)]">
                      {formatTimestamp(bid.timestamp)}
                    </span>
                    <span
                      className={`font-[family-name:var(--font-ibm-mono)] text-sm ${
                        i === 0 ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
                      }`}
                    >
                      {formatPrice(bid.amount)}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
