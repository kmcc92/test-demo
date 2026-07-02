/**
 * Domain Invariant Tests
 *
 * Tests the structural guarantees of the certificate and purchase domain.
 * All tests use real lib/ functions against real jsdom localStorage.
 * No mocks. localStorage is cleared before each test via tests/setup.ts.
 *
 * Invariant 6 note: lib/certificate-view.ts / getCertificateView() does not
 * exist in this codebase. Tests adapted to use getCertificateFromRegistry()
 * and isCertificateRegistered() directly, which are the actual identity APIs.
 */

import { describe, it, expect } from "vitest";

import {
  registerCertificate,
  getCertificateFromRegistry,
  listRegisteredCertificates,
  isCertificateRegistered,
} from "@/lib/certificate-registry";
import {
  addPurchase,
  readPurchases,
  type PurchaseRecord,
} from "@/lib/purchase-storage";
import {
  recordEvent,
  getEventsForCertificate,
} from "@/lib/certificate-events";
import {
  reportStolen,
  reportLost,
  clearStatus,
} from "@/lib/certificate-status";
import {
  addMerchantProduct,
  deleteMerchantProduct,
  type MerchantProduct,
} from "@/lib/merchant-storage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePurchase(overrides: Partial<PurchaseRecord> = {}): PurchaseRecord {
  return {
    id: "purchase-001",
    productId: "product-001",
    productName: "Silk Jacket",
    certificateId: "TEST-INV-CERT",
    txHash: "pi_test_stripe_payment_intent",
    price: 2400,
    purchasedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMerchantProduct(overrides: Partial<MerchantProduct> = {}): MerchantProduct {
  return {
    id: "prod-001",
    type: "exclusive",
    name: "Silk Jacket",
    description: "Exclusive piece",
    price: 2400,
    image: "",
    category: "ready-to-wear",
    certificateId: "TEST-INV-CERT",
    createdAt: new Date().toISOString(),
    merchantEmail: "merchant@test.com",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Invariant 1 — Merchant product creation registers exactly one certificateId
// ---------------------------------------------------------------------------

describe("Invariant 1 — Certificate registration is idempotent", () => {
  it("registerCertificate produces exactly one registry entry", () => {
    registerCertificate({ certificateId: "INV1-A", productName: "Jacket" });
    const matches = listRegisteredCertificates().filter(
      (r) => r.certificateId === "INV1-A"
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].productName).toBe("Jacket");
  });

  it("registering the same certificateId twice does not create a duplicate entry", () => {
    registerCertificate({ certificateId: "INV1-B", productName: "Jacket" });
    registerCertificate({ certificateId: "INV1-B", productName: "Jacket v2" });
    const matches = listRegisteredCertificates().filter(
      (r) => r.certificateId === "INV1-B"
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].productName).toBe("Jacket"); // first registration wins
  });

  // addMerchantProduct() alone does NOT call registerCertificate().
  // The UI components call both in sequence; this test documents that boundary.
  it("addMerchantProduct alone does not register the certificateId", () => {
    addMerchantProduct(makeMerchantProduct({ id: "prod-inv1c", certificateId: "INV1-C" }));
    expect(isCertificateRegistered("INV1-C")).toBe(false);
  });

  it("addMerchantProduct followed by registerCertificate produces exactly one registry entry", () => {
    const certId = "INV1-D";
    addMerchantProduct(makeMerchantProduct({ id: "prod-inv1d", certificateId: certId }));
    registerCertificate({ certificateId: certId, productName: "Jacket" });
    const matches = listRegisteredCertificates().filter(
      (r) => r.certificateId === certId
    );
    expect(matches).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Invariant 2 — Purchase preserves certificateId
// ---------------------------------------------------------------------------

describe("Invariant 2 — Purchase preserves certificateId", () => {
  const email = "buyer@test.com";

  it("stored purchase round-trips the certificateId unchanged", () => {
    const record = makePurchase({ certificateId: "INV2-CERT" });
    addPurchase(email, record);
    const retrieved = readPurchases(email);
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].certificateId).toBe("INV2-CERT");
  });

  it("addPurchase does not auto-register the certificateId in the registry", () => {
    const record = makePurchase({ certificateId: "INV2-REG" });
    addPurchase(email, record);
    expect(isCertificateRegistered("INV2-REG")).toBe(false);
  });

  it("multiple purchases for different items preserve each certificateId", () => {
    addPurchase(email, makePurchase({ id: "p1", certificateId: "INV2-MULTI-A", productId: "prod-a" }));
    addPurchase(email, makePurchase({ id: "p2", certificateId: "INV2-MULTI-B", productId: "prod-b" }));
    const records = readPurchases(email);
    const certIds = records.map((r) => r.certificateId).sort();
    expect(certIds).toContain("INV2-MULTI-A");
    expect(certIds).toContain("INV2-MULTI-B");
  });
});

// ---------------------------------------------------------------------------
// Invariant 3 — Ownership transfer record requires a payment reference
// ---------------------------------------------------------------------------
//
// completeAuctionTransfer lives in MarketplaceContext (React context) and cannot
// be called in isolation. This test verifies the storage layer guarantee:
// a PurchaseRecord's txHash is written and retrieved exactly as provided,
// which is what completeAuctionTransfer uses as the Stripe payment reference.

describe("Invariant 3 — Payment reference is preserved in ownership records", () => {
  const email = "winner@test.com";

  it("txHash written by addPurchase matches exactly when read back", () => {
    const stripePaymentId = "pi_3AbcDefGhiJklMno123456";
    const record = makePurchase({ txHash: stripePaymentId, id: stripePaymentId });
    addPurchase(email, record);
    const [retrieved] = readPurchases(email);
    expect(retrieved.txHash).toBe(stripePaymentId);
    expect(retrieved.id).toBe(stripePaymentId);
  });

  it("a purchase record with a non-empty txHash is accepted and stored", () => {
    const record = makePurchase({ txHash: "pi_test_non_empty" });
    addPurchase(email, record);
    const [retrieved] = readPurchases(email);
    expect(retrieved.txHash).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Invariant 4 — Every purchase emits exactly one "purchased" event
// ---------------------------------------------------------------------------
//
// OwnershipProvider.addOwnership() calls recordEvent("purchased") as a side
// effect; it cannot be called without a React tree. This test verifies
// recordEvent's append behavior: one call → one event stored.

describe("Invariant 4 — recordEvent appends exactly one event per call", () => {
  it("one recordEvent('purchased') call produces exactly one event for that certificate", () => {
    recordEvent({
      certificateId: "INV4-CERT",
      eventType: "purchased",
      actorType: "system",
    });
    const events = getEventsForCertificate("INV4-CERT");
    const purchased = events.filter((e) => e.eventType === "purchased");
    expect(purchased).toHaveLength(1);
  });

  it("events for different certificates are stored independently", () => {
    recordEvent({ certificateId: "INV4-A", eventType: "purchased", actorType: "system" });
    recordEvent({ certificateId: "INV4-B", eventType: "purchased", actorType: "system" });
    expect(getEventsForCertificate("INV4-A")).toHaveLength(1);
    expect(getEventsForCertificate("INV4-B")).toHaveLength(1);
  });

  it("recordEvent is append-only: two calls produce two events", () => {
    recordEvent({ certificateId: "INV4-C", eventType: "purchased", actorType: "system" });
    recordEvent({ certificateId: "INV4-C", eventType: "purchased", actorType: "system" });
    const events = getEventsForCertificate("INV4-C");
    expect(events).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Invariant 5 — Stolen/lost status never changes ownership records
// ---------------------------------------------------------------------------

describe("Invariant 5 — reportStolen/reportLost do not mutate purchase records", () => {
  const email = "owner@test.com";
  const certId = "INV5-CERT";

  it("reportStolen leaves existing purchase records intact", () => {
    const record = makePurchase({ certificateId: certId });
    addPurchase(email, record);
    reportStolen(certId);
    const [retrieved] = readPurchases(email);
    expect(retrieved.certificateId).toBe(certId);
    expect(retrieved.id).toBe(record.id);
    expect(retrieved.txHash).toBe(record.txHash);
  });

  it("reportLost leaves existing purchase records intact", () => {
    const record = makePurchase({ certificateId: certId });
    addPurchase(email, record);
    clearStatus(certId); // ensure clean state
    reportLost(certId);
    const [retrieved] = readPurchases(email);
    expect(retrieved.certificateId).toBe(certId);
    expect(retrieved.id).toBe(record.id);
  });

  it("clearing a stolen status does not modify purchase records", () => {
    const record = makePurchase({ certificateId: certId });
    addPurchase(email, record);
    reportStolen(certId);
    clearStatus(certId);
    const records = readPurchases(email);
    expect(records).toHaveLength(1);
    expect(records[0].certificateId).toBe(certId);
  });
});

// ---------------------------------------------------------------------------
// Invariant 6 — Certificate registry is the sole identity authority
// ---------------------------------------------------------------------------
//
// NOTE: lib/certificate-view.ts / getCertificateView() does not exist in
// this codebase. These tests use getCertificateFromRegistry() and
// isCertificateRegistered() directly, which are the actual identity APIs.

describe("Invariant 6 — Certificate registry is the sole identity authority", () => {
  it("an unregistered certificateId is unknown to the registry", () => {
    expect(isCertificateRegistered("UNKNOWN-99999")).toBe(false);
    expect(getCertificateFromRegistry("UNKNOWN-99999")).toBeNull();
  });

  it("a registered certificateId is recognized by the registry", () => {
    registerCertificate({ certificateId: "INV6-CERT", productName: "Cashmere Coat" });
    expect(isCertificateRegistered("INV6-CERT")).toBe(true);
  });

  it("getCertificateFromRegistry returns the correct productName", () => {
    registerCertificate({ certificateId: "INV6-NAME", productName: "Silk Dress" });
    const entry = getCertificateFromRegistry("INV6-NAME");
    expect(entry).not.toBeNull();
    expect(entry?.productName).toBe("Silk Dress");
  });

  it("registry lookup is case-insensitive (normalized to uppercase)", () => {
    registerCertificate({ certificateId: "inv6-lower", productName: "Jacket" });
    // registerCertificate normalizes to uppercase internally
    expect(isCertificateRegistered("INV6-LOWER")).toBe(true);
    expect(isCertificateRegistered("inv6-lower")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invariant 7 — Merchant listing deletion never removes purchased certificates
// ---------------------------------------------------------------------------

describe("Invariant 7 — deleteMerchantProduct does not affect registry or purchase records", () => {
  const email = "buyer@test.com";
  const certId = "INV7-CERT";
  const productId = "prod-inv7";

  it("deleting a merchant product does not remove its certificateId from the registry", () => {
    registerCertificate({ certificateId: certId, productName: "Jacket" });
    addMerchantProduct(makeMerchantProduct({ id: productId, certificateId: certId }));
    deleteMerchantProduct(productId);
    expect(isCertificateRegistered(certId)).toBe(true);
    expect(getCertificateFromRegistry(certId)).not.toBeNull();
  });

  it("deleting a merchant product does not remove purchase records for that certificateId", () => {
    addMerchantProduct(makeMerchantProduct({ id: productId, certificateId: certId }));
    addPurchase(email, makePurchase({ certificateId: certId, productId }));
    deleteMerchantProduct(productId);
    const records = readPurchases(email);
    expect(records).toHaveLength(1);
    expect(records[0].certificateId).toBe(certId);
  });

  it("deleting a merchant product does not remove certificate events", () => {
    addMerchantProduct(makeMerchantProduct({ id: productId, certificateId: certId }));
    recordEvent({ certificateId: certId, eventType: "purchased", actorType: "system" });
    deleteMerchantProduct(productId);
    const events = getEventsForCertificate(certId);
    expect(events).toHaveLength(1);
  });
});
