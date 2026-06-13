// UI_ONLY: static demo content for shop catalog display — not business logic
import { PRODUCTS } from "@/lib/mock-data";
import ShopClient from "@/components/shop/ShopClient";

export const metadata = { title: "Shop — TEST" };

export default function ShopPage() {
  const filteredProducts = PRODUCTS.filter(
    (p) => p.id.startsWith("prod-") || p.stock_type === "regular"
  );

  return (
    <>
      <div className="max-w-7xl mx-auto px-8 pt-12 pb-0 w-full">
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-primary)] mb-4">
          Collection
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-5xl md:text-6xl font-light text-[var(--text-primary)] tracking-wide">
          Shop
        </h1>
      </div>
      <ShopClient products={filteredProducts} />
    </>
  );
}
