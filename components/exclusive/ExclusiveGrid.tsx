"use client";

import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import type { Product } from "@/lib/mock-data";
import { type MerchantProduct } from "@/lib/merchant-storage";
import { getMerchantProductsByTypeEntry, merchantProductsVersion } from "@/lib/repositories";
import { useDomainSubscription } from "@/lib/use-domain-subscription";
import { formatPrice } from "@/lib/utils";
import AuthBadge from "@/components/ui/AuthBadge";
import QuickViewDrawer from "./QuickViewDrawer";
import { useOwnership } from "@/hooks/useOwnership";
import { useMarketplace } from "@/hooks/useMarketplace";
import { usePurchaseFlow } from "@/hooks/usePurchaseFlow";
import { getVisibleProducts } from "@/lib/market-state";
import PrerequisitesModal from "@/components/checkout/PrerequisitesModal";
import PurchaseConfirmModal from "@/components/checkout/PurchaseConfirmModal";

interface ExclusiveGridProps {
  products: Product[];
}

function mapMerchantExclusive(p: MerchantProduct): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    images: p.image ? [p.image] : [],
    stock_type: "exclusive",
    certificateId: p.certificateId ?? "",
    edition: "Merchant Edition",
    sizes: ["S", "M", "L", "XL"],
    category: "accessories",
  };
}

export default function ExclusiveGrid({ products }: ExclusiveGridProps) {
  const [selected, setSelected] = useState<Product | null>(null);
  const [merchantRaw, setMerchantRaw] = useState<MerchantProduct[]>([]);
  const reduced = useReducedMotion();
  const { isOwned, purchases } = useOwnership();
  const { isListed, listings } = useMarketplace();
  const { step, initiatePurchase, confirm, dismiss } = usePurchaseFlow();

  const productsVersion = useDomainSubscription(
    "merchant-products-changed",
    () => merchantProductsVersion()
  );
  useEffect(() => {
    setMerchantRaw(getMerchantProductsByTypeEntry("exclusive"));
  }, [productsVersion]);

  const merchantMapped = merchantRaw.map(mapMerchantExclusive);

  // Mock exclusive products (excl-001..004 in lib/mock-data.ts) are demo
  // placeholders — only merchant-created exclusives are displayed here.
  const nonMockProducts = products.filter((p) => !p.id.startsWith("excl-"));

  const allProducts = [...nonMockProducts, ...merchantMapped];

  const visibleProducts = getVisibleProducts({
    products: allProducts,
    purchases,
    listings,
  });

  return (
    <section className="px-8 pb-24 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-[rgba(255,255,255,0.04)]">
        {visibleProducts.map((product, i) => {
          const owned = isOwned(product.id);
          return (
            <motion.button
              key={product.id}
              initial={reduced ? {} : { opacity: 0, y: 24 }}
              animate={reduced ? {} : { opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
              whileHover={reduced ? {} : { scale: 1.015 }}
              onClick={() => setSelected(product)}
              className="group relative bg-[var(--bg-dark)] text-left cursor-pointer p-6 flex flex-col"
              style={owned ? { outline: "1px solid #C9A84C" } : undefined}
            >
              {/* Badge row */}
              <div className="flex justify-end mb-3 h-[18px] items-center">
                {owned ? (
                  <span
                    className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] px-2 py-0.5"
                    style={{ color: "#C9A84C", border: "1px solid #C9A84C" }}
                  >
                    Owned
                  </span>
                ) : product.certificateId ? (
                  <AuthBadge size="sm" />
                ) : null}
              </div>

              {/* Image area */}
              <div className="relative aspect-[3/4] bg-[var(--bg-dark-secondary)] mb-5 overflow-hidden">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width:640px) 100vw,(max-width:1024px) 50vw,25vw"
                />
                <div className="absolute bottom-3 right-3 z-10">
                  <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[rgba(255,255,255,0.3)]">
                    {product.edition}
                  </span>
                </div>
                <div className="absolute inset-0 bg-transparent group-hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-500" />
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col gap-2">
                <h2 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[var(--text-primary)] tracking-wide leading-tight">
                  {product.name}
                </h2>
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-[rgba(255,255,255,0.06)]">
                  <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--gold)]">
                    {formatPrice(product.price)}
                  </span>
                  <span className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors">
                    {owned ? "Owned →" : "View →"}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <QuickViewDrawer
        product={selected}
        onClose={() => setSelected(null)}
        onBuyNow={initiatePurchase}
      />

      {step.phase === "prereq" && (
        <PrerequisitesModal
          missing={step.missing}
          onClose={dismiss}
        />
      )}

      {step.phase === "confirm" && (
        <PurchaseConfirmModal
          product={step.product}
          walletAddress={step.walletAddress}
          onConfirm={confirm}
          onClose={dismiss}
        />
      )}
    </section>
  );
}
