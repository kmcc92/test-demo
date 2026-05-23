import { PRODUCTS } from "@/lib/mock-data";
import ExclusiveGrid from "@/components/exclusive/ExclusiveGrid";

export const metadata = {
  title: "Exclusive — TEST",
};

export default function ExclusivePage() {
  const exclusiveProducts = PRODUCTS.filter((p) => p.stock_type === "exclusive");

  return (
    <div className="min-h-full bg-[var(--bg-dark)] flex-1">
      {/* Header */}
      <div className="pt-16 pb-12 px-8 max-w-7xl mx-auto">
        <p className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] mb-4">
          Limited Edition
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-5xl md:text-6xl font-light text-[var(--text-primary)] tracking-wide">
          Exclusive
        </h1>
        <p className="mt-4 text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] max-w-md leading-relaxed">
          Each piece is individually serialized and permanently authenticated.
          Ten editions only.
        </p>
      </div>

      <ExclusiveGrid products={exclusiveProducts} />
    </div>
  );
}
