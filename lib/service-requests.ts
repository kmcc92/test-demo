// Service request storage — a standalone, client-side-only layer keyed by
// certificateId, tracking refurbish/replace requests raised by owners and
// the merchant decisions/quotes that follow. All reads/writes are
// runtime-only and fail silently on the server.

export type ServiceRequestType = "refurbish" | "replace";

export type ServiceRequestStatus =
  | "pending"
  | "quoted"
  | "accepted"
  | "paid"
  | "completed"
  | "denied"
  | "cancelled";

export interface ServiceRequest {
  id: string;
  certificateId: string;
  productName: string;
  requestType: ServiceRequestType;
  status: ServiceRequestStatus;
  customerDescription: string;
  submittedAt: string;
  merchantDecision?: "refurbish" | "replace";
  merchantNote?: string;
  quotedPrice?: number;
  quotedAt?: string;
  customerResponseAt?: string;
  stripePaymentIntentId?: string;
  paidAt?: string;
  completedAt?: string;
}

type ServiceRequestStore = {
  requests: ServiceRequest[];
};

const STORAGE_KEY = "test_service_requests_v1";

const ACTIVE_STATES: ServiceRequestStatus[] = ["pending", "quoted", "accepted", "paid"];

const SERVICE_REQUEST_STUB: ServiceRequest = {
  id: "",
  certificateId: "",
  productName: "",
  requestType: "refurbish",
  status: "pending",
  customerDescription: "",
  submittedAt: "",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStore(): ServiceRequestStore {
  if (!isBrowser()) return { requests: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { requests: [] };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { requests: [] };
    if (!parsed || !Array.isArray(parsed.requests)) return { requests: [] };
    return parsed as ServiceRequestStore;
  } catch {
    return { requests: [] };
  }
}

function writeStore(store: ServiceRequestStore): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    console.warn("service-requests: failed to write store");
  }
}

function sortBySubmittedAtDesc(requests: ServiceRequest[]): ServiceRequest[] {
  return [...requests].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export function createServiceRequest(params: {
  certificateId: string;
  productName: string;
  requestType: ServiceRequestType;
  customerDescription: string;
}): ServiceRequest {
  if (!params.certificateId) {
    console.warn("service-requests: createServiceRequest called with empty certificateId");
    return SERVICE_REQUEST_STUB;
  }
  if (!isBrowser()) return SERVICE_REQUEST_STUB;

  if (getActiveServiceRequest(params.certificateId)) {
    console.warn(
      `service-requests: an active request already exists for ${params.certificateId}`
    );
    return SERVICE_REQUEST_STUB;
  }

  const request: ServiceRequest = {
    id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    certificateId: params.certificateId,
    productName: params.productName,
    requestType: params.requestType,
    status: "pending",
    customerDescription: params.customerDescription,
    submittedAt: new Date().toISOString(),
  };

  const store = readStore();
  store.requests.push(request);
  writeStore(store);

  return request;
}

export function getServiceRequestsForCertificate(certificateId: string): ServiceRequest[] {
  if (!certificateId || !isBrowser()) return [];
  const normalized = certificateId.trim().toUpperCase();
  const matches = readStore().requests.filter(
    (r) => r.certificateId.toUpperCase() === normalized
  );
  return sortBySubmittedAtDesc(matches);
}

export function getActiveServiceRequest(certificateId: string): ServiceRequest | null {
  if (!certificateId || !isBrowser()) return null;
  const requests = getServiceRequestsForCertificate(certificateId);
  return requests.find((r) => ACTIVE_STATES.includes(r.status)) ?? null;
}

export function getAllServiceRequests(): ServiceRequest[] {
  if (!isBrowser()) return [];
  return sortBySubmittedAtDesc(readStore().requests);
}

export function updateServiceRequest(id: string, updates: Partial<ServiceRequest>): void {
  if (!isBrowser()) return;

  const store = readStore();
  const index = store.requests.findIndex((r) => r.id === id);
  if (index === -1) {
    console.warn(`service-requests: updateServiceRequest could not find request ${id}`);
    return;
  }

  const sanitizedUpdates = { ...updates };
  delete sanitizedUpdates.id;
  delete sanitizedUpdates.certificateId;
  delete sanitizedUpdates.submittedAt;

  store.requests[index] = { ...store.requests[index], ...sanitizedUpdates };
  writeStore(store);
}
