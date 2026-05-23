import Link from "next/link";
import Image from "next/image";
import type { Auction } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

interface AuctionCardProps {
  auction: Auction;
}

export default function AuctionCard({ auction }: AuctionCardProps) {
  return (
    <Link href={`/auctions/${auction.id}`} className="group block">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-[var(--bg-dark-secondary)] overflow-hidden mb-5">
        <Image src={auction.image} alt={auction.name} fill className="object-cover" sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" />
        <div className="absolute inset-0 bg-transparent group-hover:bg-[rgba(255,255,255,0.04)] transition-colors duration-500" />
      </div>

      {/* Name */}
      <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-[var(--text-primary)] tracking-wide mb-4 group-hover:text-[var(--gold)] transition-colors duration-200">
        {auction.name}
      </h3>

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-[var(--border)] border border-[var(--border)]">
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-1">
            Current Bid
          </p>
          <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
            {formatPrice(auction.currentBid)}
          </p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-1">
            Bids
          </p>
          <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
            {auction.bids.length}
          </p>
        </div>
      </div>
    </Link>
  );
}
