"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useOwnership } from "@/hooks/useOwnership";
import { formatPrice, getProductImage } from "@/lib/utils";
import {
  getCertificateStatus,
  clearStatus,
  type CertificateStatus,
} from "@/lib/certificate-status";
import {
  getCertificateTimeline,
  type CertificateEvent,
  type CertificateEventType,
} from "@/lib/certificate-events";
import {
  getCertificateFromRegistry,
  type RegisteredCertificate,
} from "@/lib/certificate-registry";
import GoldButton from "@/components/ui/GoldButton";
import AuthBadge from "@/components/ui/AuthBadge";
import type { PurchaseRecord } from "@/lib/purchase-storage";

const EVENT_LABEL_MAP: Record<CertificateEventType, string> = {
  created: "Authenticated",
  purchased: "Purchased",
  transferred: "Transferred",
  reported_stolen: "Stolen Reported",
  reported_lost: "Lost Reported",
  recovered: "Recovered",
  refurbish_requested: "Refurbish Requested",
  replace_requested: "Replace Requested",
  refurbished: "Refurbished",
  replaced: "Replaced",
  listed: "Listed for Auction",
  delisted: "Removed from Auction",
};

interface CollectionItem {
  purchase: PurchaseRecord;
  displayName: string;
  status: CertificateStatus;
  timeline: CertificateEvent[];
  registryEntry: RegisteredCertificate | null;
  image: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: CertificateStatus }) {
  if (status === "active") return <AuthBadge size="sm" />;
  return (
    <span className="inline-flex items-center gap-1.5 border border-red-900/40 text-red-400 font-[family-name:var(--font-dm-sans)] text-[9px] tracking-widest uppercase px-2 py-0.5">
      <span className="w-1 h-1 rounded-full bg-red-400" />
      {status === "stolen" ? "Stolen" : "Lost"}
    </span>
  );
}

function Timeline({ events }: { events: CertificateEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-1.5">
      {events.map((event) => (
        <p
          key={event.id}
          className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--text-muted)]"
        >
          {EVENT_LABEL_MAP[event.eventType]} · {formatDate(event.timestamp)}
        </p>
      ))}
    </div>
  );
}

function CollectionCard({
  item,
  fullTimeline,
  onClearReport,
}: {
  item: CollectionItem;
  fullTimeline: boolean;
  onClearReport: (certificateId: string) => void;
}) {
  const { purchase, displayName, status, timeline, image } = item;
  const visibleTimeline = fullTimeline ? timeline : timeline.slice(-5);

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-primary)] flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-[var(--bg-secondary)] overflow-hidden">
        {image && (
          <Image
            src={image}
            alt={displayName}
            fill
            className="object-cover"
            sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
          />
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-5 py-5">
        <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-[var(--text-primary)] tracking-wide leading-snug mb-1">
          {displayName}
        </h3>
        <p className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--gold)] mb-2">
          {purchase.certificateId}
        </p>
        <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
          Purchased
        </p>
        <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] mb-4">
          {formatDate(purchase.purchasedAt)}
        </p>

        <div className="flex flex-wrap gap-3 mt-auto">
          <Link href={`/verify?id=${encodeURIComponent(purchase.certificateId)}`}>
            <GoldButton variant="outline" size="sm">
              View Certificate
            </GoldButton>
          </Link>
          <GoldButton
            variant="ghost"
            size="sm"
            disabled
            title="Available soon in your collection dashboard"
          >
            Refurbish / Replace
          </GoldButton>
        </div>

        {status !== "active" && (
          <button
            onClick={() => onClearReport(purchase.certificateId)}
            className="mt-3 text-left text-[9px] tracking-[0.2em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] hover:text-[var(--gold)] underline underline-offset-4 transition-colors"
          >
            Clear Report
          </button>
        )}

        <Timeline events={visibleTimeline} />
      </div>
    </div>
  );
}

export default function CollectionPage() {
  const { user, isLoaded, openAuth } = useAuth();
  const { purchases } = useOwnership();
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => setMounted(true), []);

  // Authenticated pieces only — items with a non-empty certificateId. Shop
  // purchases (no certificateId) are excluded.
  const authenticatedPurchases = useMemo(
    () => purchases.filter((p) => typeof p.certificateId === "string" && p.certificateId.length > 0),
    [purchases]
  );

  const items = useMemo<CollectionItem[]>(
    () =>
      authenticatedPurchases.map((purchase) => {
        const registryEntry = getCertificateFromRegistry(purchase.certificateId);
        const displayName =
          (registryEntry?.productName && registryEntry.productName.length > 0
            ? registryEntry.productName
            : undefined) ??
          (purchase.productName && purchase.productName.length > 0 ? purchase.productName : undefined) ??
          "Unknown Item";

        return {
          purchase,
          displayName,
          status: getCertificateStatus(purchase.certificateId),
          timeline: getCertificateTimeline(purchase.certificateId),
          registryEntry,
          image: getProductImage(purchase.productId),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authenticatedPurchases, mounted, refreshKey]
  );

  const activeItems = items.filter((i) => i.status === "active");
  const reportedItems = items.filter((i) => i.status === "stolen" || i.status === "lost");
  const totalAuthenticatedItems = activeItems.length + reportedItems.length;

  function handleClearReport(certificateId: string) {
    clearStatus(certificateId);
    setRefreshKey((k) => k + 1);
  }

  if (!isLoaded) return null;

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-24 w-full text-center">
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-4">
          My Collection
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light text-[var(--text-primary)] tracking-wide mb-8">
          Sign in to view your collection
        </h1>
        <GoldButton variant="primary" size="md" onClick={() => openAuth("signup")}>
          Sign In
        </GoldButton>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-16 w-full">
      {/* Header */}
      <div className="mb-16">
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3">
          My Collection
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-5xl md:text-6xl font-light text-[var(--text-primary)] tracking-wide mb-4">
          Your Authenticated Pieces
        </h1>
        <p className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-muted)]">
          {totalAuthenticatedItems} authenticated {totalAuthenticatedItems === 1 ? "piece" : "pieces"}
        </p>
      </div>

      {totalAuthenticatedItems === 0 ? (
        <div className="border border-[var(--border)] px-8 py-20 text-center">
          <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--text-primary)] tracking-wide mb-3">
            Your collection is empty
          </h2>
          <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-8">
            Authenticated pieces you purchase will appear here
          </p>
          <Link href="/exclusive">
            <GoldButton variant="primary" size="md">
              Shop Exclusive
            </GoldButton>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeItems.map((item) => (
              <CollectionCard
                key={item.purchase.id}
                item={item}
                fullTimeline={false}
                onClearReport={handleClearReport}
              />
            ))}
          </div>

          {reportedItems.length > 0 && (
            <div className="mt-16">
              <h2 className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-8">
                Reported Items
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportedItems.map((item) => (
                  <CollectionCard
                    key={item.purchase.id}
                    item={item}
                    fullTimeline={true}
                    onClearReport={handleClearReport}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
