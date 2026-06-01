/**
 * ARCHITECTURE GUARD
 *
 * This file exists to document and enforce the market state contract.
 *
 * All product visibility filtering MUST go through:
 *   getVisibleProducts() from lib/market-state.ts
 *
 * DO NOT use:
 * - array.filter with isOwned/isListed inline
 * - startsWith("merchant-") for filtering
 * - startsWith("excl-") for filtering
 *
 * CANONICAL USAGE PATTERN:
 *
 *   const { purchases } = useOwnership()
 *   const { listings } = useMarketplace()
 *
 *   const visibleProducts = getVisibleProducts({
 *     products,
 *     purchases,
 *     listings,
 *   })
 */

import { getVisibleProducts } from "./market-state";

export { getVisibleProducts };

export const MARKET_STATE_CONTRACT = {
  version: "1.0",
  rule: "All product visibility must use getVisibleProducts()",
  forbidden: [
    'startsWith("excl-") in filter',
    'startsWith("merchant-") in filter',
    "inline isOwned/isListed filter chains",
  ],
} as const;

// Development-only violation detector
export function warnIfLegacyFilter(context: string, code: string): void {
  if (process.env.NODE_ENV !== "development") return;

  const violations = [
    'startsWith("excl-")',
    'startsWith("merchant-")',
  ];

  violations.forEach((v) => {
    if (code.includes(v)) {
      console.warn(
        `[MARKET STATE] Legacy filter detected in ${context}:`,
        v,
        "→ Use getVisibleProducts() instead"
      );
    }
  });
}
