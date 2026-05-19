"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { Campaign, Product } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";
import AuthBadge from "@/components/ui/AuthBadge";

interface CollectionContentProps {
  campaigns: Campaign[];
  exclusiveProducts: Product[];
}

export default function CollectionContent({ campaigns, exclusiveProducts }: CollectionContentProps) {
  const reduced = useReducedMotion();

  const revealProps = reduced
    ? {}
    : ({
        initial: { opacity: 0, y: 36 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.8, ease: "easeOut" },
      } as const);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-8 pt-12 pb-16">
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[--text-primary] mb-4">
          Spring / Summer 2026
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-6xl md:text-7xl font-light text-[--text-primary] tracking-wide">
          Collection
        </h1>
      </div>

      {/* Full-bleed editorial sections */}
      {campaigns.map((campaign, i) => (
        <motion.div key={campaign.id} {...revealProps} className="mb-2">
          <Link href={campaign.href} className="group block">
            <div className="relative h-[70vh] bg-[--bg-dark-secondary] overflow-hidden">
              <Image src={campaign.image} alt={campaign.title} fill className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,8,8,0.7)] via-transparent to-transparent" />
              <div
                className={`absolute bottom-0 p-10 md:p-16 ${
                  i % 2 === 0 ? "left-0" : "right-0 text-right"
                }`}
              >
                <p className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[--gold] mb-3">
                  {campaign.subtitle}
                </p>
                <h2 className="font-[family-name:var(--font-cormorant)] text-3xl md:text-4xl font-light text-white tracking-wide mb-4">
                  {campaign.title}
                </h2>
                <span className="text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[--on-dark-muted] border-b border-[--on-dark-muted] pb-px group-hover:text-white group-hover:border-white transition-colors duration-200">
                  View Collection →
                </span>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}

      {/* Pull quote */}
      <motion.div
        {...revealProps}
        className="max-w-2xl mx-auto px-8 py-24 text-center"
      >
        <p className="font-[family-name:var(--font-cormorant)] text-2xl md:text-3xl font-light text-[--text-primary] tracking-wide leading-relaxed">
          "Every piece in this collection carries a permanent record — a
          certificate that cannot be altered, transferred without consent, or
          forged."
        </p>
        <p className="mt-6 text-[10px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[--text-primary]">
          — TEST, SS26
        </p>
      </motion.div>

      {/* Exclusive product grid */}
      <div className="max-w-7xl mx-auto px-8 pb-24">
        <motion.div {...revealProps} className="mb-12">
          <p className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[--text-primary] mb-2">
            From the Collection
          </p>
          <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-[--text-primary] tracking-wide">
            Exclusive Pieces
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {exclusiveProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={reduced ? {} : { opacity: 0, y: 24 }}
              whileInView={reduced ? {} : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
            >
              <Link href="/exclusive" className="group block">
                <div className="flex justify-end mb-3">
                  <AuthBadge size="sm" />
                </div>
                <div className="relative aspect-[3/4] bg-[--bg-dark-secondary] mb-3 overflow-hidden">
                  <Image src={product.images[0]} alt={product.name} fill className="object-cover" sizes="(max-width:640px) 50vw,25vw" />
                  <div className="absolute inset-0 bg-transparent group-hover:bg-[rgba(255,255,255,0.03)] transition-colors duration-500" />
                </div>
                <h3 className="font-[family-name:var(--font-cormorant)] text-base font-light text-[--text-primary] tracking-wide leading-snug">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between mt-1">
                  <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[--text-primary]">
                    {product.edition}
                  </p>
                  <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[--text-primary]">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
