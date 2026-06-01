import Link from "next/link";
import Image from "next/image";
import HeroSection from "@/components/home/HeroSection";
import MarketplacePreview from "@/components/home/MarketplacePreview";
import { CAMPAIGNS } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <>
      <HeroSection />

      {/* Authentication strip */}
      <section className="bg-[var(--bg-dark)] py-10 overflow-hidden">
        <div className="flex items-center justify-center gap-12 flex-wrap px-8">
          {[
            "Every piece is serialized.",
            "Every certificate is permanent.",
            "Every owner is verified.",
          ].map((phrase) => (
            <p
              key={phrase}
              className="text-[10px] md:text-xs tracking-[0.25em] uppercase text-[rgba(255,255,255,0.4)] font-[family-name:var(--font-dm-sans)] whitespace-nowrap"
            >
              {phrase}
            </p>
          ))}
        </div>
      </section>

      <MarketplacePreview />

      {/* Editorial strip */}
      <section className="max-w-7xl mx-auto px-8 pb-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CAMPAIGNS.map((campaign) => (
            <Link
              key={campaign.id}
              href={campaign.href}
              className="group relative aspect-[4/3] overflow-hidden bg-[var(--bg-dark-secondary)] block"
            >
              <Image src={campaign.image} alt={campaign.title} fill className="object-cover" sizes="(max-width:768px) 100vw,50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-dark)]/80 via-transparent to-transparent z-10" />
              <div className="absolute bottom-0 left-0 p-8 z-20">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--gold)] font-[family-name:var(--font-dm-sans)] mb-2">
                  {campaign.subtitle}
                </p>
                <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-white tracking-wide">
                  {campaign.title}
                </h3>
              </div>
              <div className="absolute inset-0 bg-transparent group-hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-500 z-10" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
