// Certificate event ledger — append-only historical record of certificate
// lifecycle events. This is NOT event-sourcing: existing systems remain
// authoritative for current state —
//   certificate-registry.ts → identity authority
//   certificate-status.ts   → current status (active/stolen/lost)
//   purchase-storage.ts     → current ownership
// Events neither replace nor derive current state; they are a historical
// log only, written as side effects after those systems' own writes.
//
// Storage pattern mirrors lib/certificate-status.ts exactly.

export type CertificateEventType =
  | "created"
  | "purchased"
  | "transferred"
  | "reported_stolen"
  | "reported_lost"
  | "recovered"
  | "refurbish_requested"
  | "replace_requested"
  | "refurbished"
  | "replaced"
  | "listed"
  | "delisted";

export interface CertificateEvent {
  id: string;
  certificateId: string;
  eventType: CertificateEventType;
  timestamp: string;
  actorType?: "customer" | "merchant" | "owner" | "system";
  actorId?: string;
  metadata?: Record<string, unknown>;
}

type EventStore = {
  events: CertificateEvent[];
};

const STORAGE_KEY = "test_certificate_events_v1";

const STUB_EVENT: CertificateEvent = {
  id: "stub",
  certificateId: "",
  eventType: "created",
  timestamp: new Date(0).toISOString(),
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStore(): EventStore {
  if (!isBrowser()) return { events: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Legacy schema migration: old format was a raw array
      return { events: parsed };
    }
    if (!parsed || !Array.isArray(parsed.events)) {
      return { events: [] };
    }
    return parsed as EventStore;
  } catch {
    return { events: [] };
  }
}

function writeStore(store: EventStore): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

function sortByTimestampAsc(events: CertificateEvent[]): CertificateEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// Appends a new event to the log — never overwrites or modifies existing
// events. SSR-safe and falsy-certificateId-safe: returns a stub event
// without writing in either case.
export function recordEvent(
  event: Omit<CertificateEvent, "id" | "timestamp">
): CertificateEvent {
  if (!event.certificateId) {
    console.warn("recordEvent called with a falsy certificateId — ignored.");
    return STUB_EVENT;
  }
  if (!isBrowser()) return STUB_EVENT;

  const fullEvent: CertificateEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
  };

  const store = readStore();
  store.events.push(fullEvent);
  writeStore(store);

  return fullEvent;
}

// Pure read — all events for a certificateId, sorted oldest to newest.
export function getEventsForCertificate(certificateId: string): CertificateEvent[] {
  if (!certificateId || !isBrowser()) return [];
  const normalized = certificateId.trim().toUpperCase();
  const events = readStore().events.filter(
    (e) => e.certificateId.toUpperCase() === normalized
  );
  return sortByTimestampAsc(events);
}

// Semantic alias for getEventsForCertificate, used in UI timelines.
export function getCertificateTimeline(certificateId: string): CertificateEvent[] {
  return getEventsForCertificate(certificateId);
}

export function getLatestEventOfType(
  certificateId: string,
  eventType: CertificateEventType
): CertificateEvent | null {
  if (!certificateId || !isBrowser()) return null;
  const matches = getEventsForCertificate(certificateId).filter(
    (e) => e.eventType === eventType
  );
  return matches.length > 0 ? matches[matches.length - 1] : null;
}

// Pure read — the entire event log across all certificates, sorted oldest to newest.
export function getAllEvents(): CertificateEvent[] {
  if (!isBrowser()) return [];
  return sortByTimestampAsc(readStore().events);
}
