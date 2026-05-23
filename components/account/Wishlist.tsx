"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/mock-data";
import ShopCheckoutModal, { type CheckoutResult } from "@/components/shop/ShopCheckoutModal";
import ShopOrderConfirmModal, { type ShopOrder } from "@/components/shop/ShopOrderConfirmModal";
import { saveOrder } from "@/lib/order-storage";

interface WishlistProps {
  onPurchaseComplete?: () => void;
}

export default function Wishlist({ onPurchaseComplete }: WishlistProps) {
  const reduced = useReducedMotion();
  const { items, remove } = useWishlist();
  const { user } = useAuth();
  const [checkoutProductId, setCheckoutProductId] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<ShopOrder | null>(null);

  const checkoutItem = items.find((i) => i.productId === checkoutProductId) ?? null;

  const productForCheckout: Product | null = checkoutItem
    ? {
        id: checkoutItem.productId,
        name: checkoutItem.productName,
        price: checkoutItem.price,
        images: [checkoutItem.image],
        category: "outerwear",
        stock_type: "regular",
        description: "",
      }
    : null;

  function handleConfirm(result: CheckoutResult) {
    if (!checkoutItem || !user?.email) return;
    saveOrder(user.email, {
      orderId: result.orderId,
      productId: checkoutItem.productId,
      productName: checkoutItem.productName,
      price: checkoutItem.price,
      size: result.size,
      purchasedAt: result.purchasedAt,
      trackingNumber: result.trackingNumber,
      estimatedDelivery: result.shippingMethod.eta,
    });
    setConfirmedOrder({
      orderId: result.orderId,
      productId: checkoutItem.productId,
      productName: checkoutItem.productName,
      price: checkoutItem.price,
      purchasedAt: result.purchasedAt,
    });
    setCheckoutProductId(null);
  }

  function handleOrderClose() {
    setConfirmedOrder(null);
    onPurchaseComplete?.();
  }

  if (items.length === 0) {
    return (
      <div className="py-12 border border-[var(--border)] text-center">
        <p className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3">
          No Saved Items Yet
        </p>
        <p className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide">
          Items you save will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border border-[var(--border)]">
        <AnimatePresence>
          {items.map((item, i) => (
            <motion.div
              key={item.productId}
              initial={reduced ? {} : { opacity: 0, y: 8 }}
              animate={reduced ? {} : { opacity: 1, y: 0 }}
              exit={reduced ? {} : { opacity: 0, x: -16 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: "easeOut" }}
              className={`flex items-center gap-6 px-6 py-5 ${
                i < items.length - 1 ? "border-b border-[var(--border)]" : ""
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-16 h-20 bg-[var(--bg-secondary)] shrink-0 overflow-hidden">
                <Image
                  src={item.image}
                  alt={item.productName}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-[family-name:var(--font-cormorant)] text-base font-light text-[var(--text-primary)] tracking-wide leading-snug mb-1">
                  {item.productName}
                </h4>
                <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
                  {formatPrice(item.price)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <button
                  onClick={() => setCheckoutProductId(item.productId)}
                  className="text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--gold)] hover:opacity-70 transition-opacity duration-200"
                >
                  Buy Now
                </button>
                <button
                  onClick={() => remove(item.productId)}
                  className="text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-200"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {productForCheckout && (
        <ShopCheckoutModal
          product={productForCheckout}
          onConfirm={handleConfirm}
          onClose={() => setCheckoutProductId(null)}
        />
      )}

      {confirmedOrder && (
        <ShopOrderConfirmModal order={confirmedOrder} onClose={handleOrderClose} />
      )}
    </>
  );
}
