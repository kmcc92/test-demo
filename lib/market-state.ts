/**
 * MARKET STATE CONTRACT
 *
 * This module is the ONLY allowed source for:
 * - product visibility filtering
 * - ownership filtering
 * - listing filtering
 *
 * UI components must NOT implement their own filtering logic.
 *
 * All product visibility must use:
 *   getVisibleProducts({ products, purchases, listings })
 *
 * FORBIDDEN PATTERNS (do not reintroduce):
 * - array.filter with startsWith("excl-")
 * - array.filter with startsWith("merchant-")
 * - scattered isOwned/isListed inline filter chains
 */

import type { PurchaseRecord } from "@/lib/purchase-storage";
import type { MarketplaceListing } from "@/lib/marketplace-types";

export function isOwnedProduct(
  productId: string,
  purchases: PurchaseRecord[]
): boolean {
  return purchases.some((p) => p.productId === productId);
}

export function isListedProduct(
  productId: string,
  listings: MarketplaceListing[]
): boolean {
  return listings.some(
    (l) => l.productId === productId && l.status === "active"
  );
}

export function isVisibleProduct(params: {
  productId: string;
  purchases: PurchaseRecord[];
  listings: MarketplaceListing[];
}): boolean {
  return (
    !isOwnedProduct(params.productId, params.purchases) &&
    !isListedProduct(params.productId, params.listings)
  );
}

export function getVisibleProducts<T extends { id: string }>(params: {
  products: T[];
  purchases: PurchaseRecord[];
  listings: MarketplaceListing[];
}): T[] {
  return params.products.filter((p) =>
    isVisibleProduct({
      productId: p.id,
      purchases: params.purchases,
      listings: params.listings,
    })
  );
}
