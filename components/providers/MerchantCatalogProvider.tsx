"use client";

import { useEffect, type ReactNode } from "react";
import { hydrateMerchantProducts } from "@/lib/repositories";

// Lifecycle-only provider for the GLOBAL public merchant catalog. Mirrors
// CertificateRegistryProvider: hydrate the snapshot on mount, dispose on
// unmount. No readiness boolean, no user-scoping, no epoch guard — the catalog
// is public global data. Hydration completion emits "merchant-products-changed"
// so subscribed grids re-render with data.
export default function MerchantCatalogProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    let active = true;
    let dispose: (() => void) | null = null;

    hydrateMerchantProducts()
      .then((teardown) => {
        if (active) {
          dispose = teardown;
        } else {
          teardown();
        }
      })
      .catch(() => {
        // Hydration failure leaves an empty catalog snapshot; nothing to surface.
      });

    return () => {
      active = false;
      if (dispose) dispose();
    };
  }, []);

  return <>{children}</>;
}
