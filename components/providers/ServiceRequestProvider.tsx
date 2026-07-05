"use client";

import { useEffect, type ReactNode } from "react";
import { hydrateServiceRequests } from "@/lib/repositories";

// Lifecycle-only provider for the GLOBAL service-request workflow. Mirrors
// MerchantCatalogProvider: hydrate the snapshot on mount, dispose on unmount.
// No readiness boolean, no user-scoping, no epoch guard — service requests are
// global (the merchant reads all of them). Hydration completion emits
// "service-requests-changed" so subscribed views (the collection page + merchant
// dashboard) re-render with data.
export default function ServiceRequestProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    let active = true;
    let dispose: (() => void) | null = null;

    hydrateServiceRequests()
      .then((teardown) => {
        if (active) {
          dispose = teardown;
        } else {
          teardown();
        }
      })
      .catch(() => {
        // Hydration failure leaves an empty snapshot; nothing to surface.
      });

    return () => {
      active = false;
      if (dispose) dispose();
    };
  }, []);

  return <>{children}</>;
}
