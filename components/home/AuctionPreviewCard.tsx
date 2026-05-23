import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import type { Auction } from "@/lib/mock-data";

interface AuctionPreviewCardProps {
  auction: Auction;
}

export default function AuctionPreviewCard({ auction }: AuctionPreviewCardProps) {
  return (
    <Link href={`/auctions/${auction.id}`} className="group block">
      <div className="relative aspect-[3/4] bg-[var(--bg-dark-secondary)] overflow-hidden mb-4">
        <Image src={auction.image} alt={auction.name} fill className="object-cover" sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,33vw" />
        <div className="absolute inset-0 bg-transparent group-hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-500" />
      </div>

      <div className="space-y-2">
        <h3 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[var(--text-primary)] tracking-wide group-hover:text-[var(--gold)] transition-colors">
          {auction.name}
        </h3>

        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-0.5">
              Current Bid
            </p>
            <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
              {formatPrice(auction.currentBid)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-0.5">
              Bids
            </p>
            <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
              {auction.bids.length}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
