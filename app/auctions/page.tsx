import { AUCTIONS } from "@/lib/mock-data";
import AuctionCard from "@/components/auctions/AuctionCard";

export const metadata = { title: "Auctions — TEST" };

export default function AuctionsPage() {
  return (
    <div className="max-w-7xl mx-auto px-8 py-12 w-full">
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[--gold] animate-pulse" />
          <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[--text-primary]">
            Live Now
          </p>
        </div>
        <h1 className="font-[family-name:var(--font-cormorant)] text-5xl md:text-6xl font-light text-[--text-primary] tracking-wide">
          Auctions
        </h1>
        <p className="mt-4 text-sm font-[family-name:var(--font-dm-sans)] text-[--text-primary] max-w-md leading-relaxed">
          Authenticated archive pieces, open for bidding. Each lot is permanently
          certified and verifiable on-chain.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {AUCTIONS.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </div>
    </div>
  );
}
