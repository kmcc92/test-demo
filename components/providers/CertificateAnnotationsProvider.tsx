"use client";

import { useEffect, type ReactNode } from "react";
import { hydrateCertificateStatus } from "@/lib/repositories";

// Lifecycle-only provider for certificate ANNOTATIONS (status now; events in
// Step 6b). It owns NO data — the repositories own their snapshots. On mount it
// initiates hydration (idempotent) and disposes on unmount. No readiness boolean
// by design: pre-hydration reads return the "active"/empty default, and
// hydration completion emits "certificate-status-changed" so subscribers
// re-render with data.
export default function CertificateAnnotationsProvider({
  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    let active = true;
    let disposeStatus: (() => void) | null = null;

    hydrateCertificateStatus()
      .then((teardown) => {
        if (active) {
          disposeStatus = teardown;
        } else {
          teardown();
        }
      })
      .catch(() => {
        // Hydration failure leaves an empty snapshot; reads fall back to
        // "active". Nothing to surface (no readiness leakage by design).
      });

    return () => {
      active = false;
      if (disposeStatus) disposeStatus();
    };
  }, []);

  return <>{children}</>;
}
