"use client";

export type DomainEvent =
  | "service-requests-changed"
  | "certificate-events-changed"
  | "certificate-status-changed"
  | "certificates-changed"
  | "purchases-changed"
  | "auth-changed";

export function emitDomainEvent(event: DomainEvent): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(event));
}

export function onDomainEvent(
  event: DomainEvent,
  handler: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  window.addEventListener(event, handler);

  const storageKeyMap: Record<string, DomainEvent> = {
    test_service_requests_v1: "service-requests-changed",
    test_certificate_events_v1: "certificate-events-changed",
    test_certificate_status_v1: "certificate-status-changed",
    test_purchases_v1: "purchases-changed",
  };

  const storageHandler = (e: StorageEvent) => {
    const mapped = e.key ? storageKeyMap[e.key] : undefined;
    if (mapped === event) handler();
  };

  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(event, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
