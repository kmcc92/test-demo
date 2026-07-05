"use client";

import { useEffect, type ReactNode } from "react";
import { hydrateCertificateStatus, hydrateCertificateEvents } from "@/lib/repositories";

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
    const disposers: Array<() => void> = [];

    const attach = (teardown: () => void) => {
      if (active) {
        disposers.push(teardown);
      } else {
        teardown();
      }
    };

    // Hydrate status + events. A failure leaves an empty snapshot; reads fall
    // back to the empty/"active" default (no readiness leakage by design).
    hydrateCertificateStatus().then(attach).catch(() => {});
    hydrateCertificateEvents().then(attach).catch(() => {});

    return () => {
      active = false;
      disposers.forEach((d) => d());
    };
  }, []);

  return <>{children}</>;
}
