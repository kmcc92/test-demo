"use client";

import { useState, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import type { Auction, Bid } from "@/lib/mock-data";
import { formatPrice, formatAddress } from "@/lib/utils";
import AuthBadge from "@/components/ui/AuthBadge";
import GoldButton from "@/components/ui/GoldButton";
import { useToast } from "@/components/ui/Toast";

interface AuctionDetailClientProps {
  auction: Auction;
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuctionDetailClient({ auction }: AuctionDetailClientProps) {
  const reduced = useReducedMotion();
  const { show: showToast } = useToast();
  const inputId = useId();

  const [currentBid, setCurrentBid] = useState(auction.currentBid);
  const [bidHistory, setBidHistory] = useState<Bid[]>(auction.bids);
  const [bidInput, setBidInput] = useState("");
  const [isPlacing, setIsPlacing] = useState(false);
  const [bidError, setBidError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  const minBid = Math.ceil(currentBid * 1.05);

  function handleBid() {
    const amount = parseInt(bidInput.replace(/[^0-9]/g, ""), 10);
    if (!amount || amount < minBid) {
      setBidError(`Minimum bid is ${formatPrice(minBid)}`);
      return;
    }
    setBidError("");
    setIsPlacing(true);

    setTimeout(() => {
      const newBid: Bid = {
        id: `bid-live-${Date.now()}`,
        address: "0xYou0000000000000000000000000000000000000",
        amount,
        timestamp: new Date().toISOString(),
      };
      setCurrentBid(amount);
      setBidHistory((prev) => [newBid, ...prev]);
      setBidInput("");
      setIsPlacing(false);
      showToast("Bid placed", "gold");
    }, 400);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleBid();
  }

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
        {/* Left: Image gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[3/4] bg-[var(--bg-dark-secondary)] overflow-hidden">
            <Image src={auction.image} alt={auction.name} fill className="object-cover" sizes="(max-width:1024px) 100vw,50vw" />
            <div className="absolute inset-0 flex items-end p-6">
              <div className="space-y-1">
                <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[rgba(255,255,255,0.3)]">
                  {auction.certificateId}
                </p>
              </div>
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`aspect-square bg-[var(--bg-dark-secondary)] transition-all duration-200 ${
                  activeImage === i
                    ? "ring-1 ring-[var(--gold)]"
                    : "opacity-40 hover:opacity-70"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right: Details + bid */}
        <div className="flex flex-col">
          {/* Category + badge */}
          <div className="flex items-center gap-3 mb-4">
            <p className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
              {auction.type === "reserve" ? "Reserve Auction" : "Buy Now"}
            </p>
            <AuthBadge size="sm" />
          </div>

          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light text-[var(--text-primary)] tracking-wide leading-tight mb-6">
            {auction.name}
          </h1>

          <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] leading-relaxed mb-8">
            {auction.description}
          </p>

          {/* Current bid */}
          <div className="p-6 border border-[var(--border)] mb-8">
            <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
              Current Bid
            </p>
            <motion.p
              key={currentBid}
              initial={reduced ? {} : { opacity: 0.6, y: -4 }}
              animate={reduced ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="font-[family-name:var(--font-ibm-mono)] text-2xl text-[var(--text-primary)]"
            >
              {formatPrice(currentBid)}
            </motion.p>
          </div>

          {/* Bid input */}
          <div className="space-y-3 mb-8">
            <label
              htmlFor={inputId}
              className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]"
            >
              Place a bid
            </label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-[family-name:var(--font-ibm-mono)] text-[var(--text-muted)] text-sm">
                  $
                </span>
                <input
                  id={inputId}
                  type="text"
                  inputMode="numeric"
                  value={bidInput}
                  onChange={(e) => {
                    setBidInput(e.target.value);
                    setBidError("");
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isPlacing}
                  placeholder={formatPrice(minBid).replace("$", "")}
                  className="w-full h-12 pl-8 pr-4 border border-[var(--border)] bg-transparent font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors disabled:opacity-50"
                />
              </div>
              <GoldButton
                variant="primary"
                size="md"
                loading={isPlacing}
                onClick={handleBid}
                disabled={isPlacing}
                className="shrink-0 px-8"
              >
                Place Bid
              </GoldButton>
            </div>

            <AnimatePresence>
              {bidError && (
                <motion.p
                  initial={reduced ? {} : { opacity: 0, y: -4 }}
                  animate={reduced ? {} : { opacity: 1, y: 0 }}
                  exit={reduced ? {} : { opacity: 0 }}
                  className="text-xs text-red-400 font-[family-name:var(--font-dm-sans)]"
                >
                  {bidError}
                </motion.p>
              )}
            </AnimatePresence>

            <p className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
              Minimum bid: {formatPrice(minBid)} (current + 5%)
            </p>
          </div>

          {/* Bid history */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1 h-1 rounded-full bg-[var(--gold)]" />
              <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                Bid History
              </p>
              <span className="ml-auto font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]">
                {bidHistory.length} bids
              </span>
            </div>

            <div className="space-y-0 border border-[var(--border)]">
              <AnimatePresence initial={false}>
                {bidHistory.map((bid, i) => (
                  <motion.div
                    key={bid.id}
                    initial={reduced ? {} : { opacity: 0, y: -16, backgroundColor: "rgba(201,168,76,0.08)" }}
                    animate={reduced ? {} : { opacity: 1, y: 0, backgroundColor: "rgba(201,168,76,0)" }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`flex items-center justify-between px-4 py-3 ${
                      i < bidHistory.length - 1 ? "border-b border-[var(--border)]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {i === 0 && (
                        <span className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)]">
                          ↑
                        </span>
                      )}
                      <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]">
                        {formatAddress(bid.address)}
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
        </div>
      </div>
    </div>
  );
}
