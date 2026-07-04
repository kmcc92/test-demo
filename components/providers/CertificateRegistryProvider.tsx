"use client";

import { useEffect, type ReactNode } from "react";
import { hydrateCertificateRegistry } from "@/lib/repositories";

// Lifecycle-only provider. It owns NO data — the repository owns the snapshot.
// On mount it initiates hydration (idempotent) and, on unmount, disposes the
// realtime subscription + snapshot. It exposes no readiness boolean by design:
// before hydration the snapshot is empty, reads return the empty/fallback view,
// and hydration completion emits "certificates-changed" so subscribed consumers
// re-render with data.
export default function CertificateRegistryProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    let active = true;
    let dispose: (() => void) | null = null;

    hydrateCertificateRegistry()
      .then((teardown) => {
        if (active) {
          dispose = teardown;
        } else {
          // Unmounted before hydration resolved — tear down immediately.
          teardown();
        }
      })
      .catch(() => {
        // Hydration failure leaves an empty snapshot; the UI shows the fallback
        // view. Nothing to surface here (no readiness leakage by design).
      });

    return () => {
      active = false;
      if (dispose) dispose();
    };
  }, []);

  return <>{children}</>;
}
