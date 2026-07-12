import { describe, it, expect } from "vitest";

import {
  buildOwnershipTransferRow,
  toOwnershipTransferView,
} from "@/lib/ownership-transfers";

// Full set of columns the ownership_transfers INSERT sends (user_id is filled
// server-side by the buyer_email trigger, so it is NOT part of the client row).
// Kept in lock-step with supabase/ownership_transfers.sql — a drift here means
// the insert would fail against the real table.
const LEDGER_INSERT_COLUMNS = [
  "certificate_id",
  "payment_ref",
  "product_id",
  "product_name",
  "buyer_email",
  "seller_email",
  "price",
  "buyer_wallet",
  "transferred_at",
  "metadata",
].sort();

function sampleRow() {
  return buildOwnershipTransferRow({
    certificateId: " cert-001 ",
    paymentRef: "pi_123",
    productId: "prod-001",
    productName: "Silk Jacket",
    buyerEmail: "Buyer@Example.com",
    sellerEmail: "seller@example.com",
    price: 2400,
    buyerWallet: "0xabc",
    productImage: "/img.jpg",
    productDescription: "Luxury piece",
    transferredAt: "2026-01-01T00:00:00.000Z",
  });
}

describe("Ownership transfer row builder", () => {
  it("normalizes and preserves transfer details for the ledger", () => {
    const row = sampleRow();

    expect(row.certificate_id).toBe("CERT-001");
    expect(row.payment_ref).toBe("pi_123");
    expect(row.product_id).toBe("prod-001");
    expect(row.product_name).toBe("Silk Jacket");
    expect(row.buyer_email).toBe("Buyer@Example.com");
    expect(row.seller_email).toBe("seller@example.com");
    expect(row.price).toBe(2400);
    expect(row.buyer_wallet).toBe("0xabc");
    expect(row.metadata).toEqual({
      product_image: "/img.jpg",
      product_description: "Luxury piece",
    });
    expect(row.transferred_at).toBe("2026-01-01T00:00:00.000Z");
  });

  it("defaults optional wallet/image/description to null (never undefined)", () => {
    const row = buildOwnershipTransferRow({
      certificateId: "cert-002",
      paymentRef: "pi_456",
      productId: "prod-002",
      productName: "Wool Coat",
      buyerEmail: "b@example.com",
      sellerEmail: "s@example.com",
      price: 900,
      transferredAt: "2026-02-02T00:00:00.000Z",
    });

    expect(row.buyer_wallet).toBeNull();
    expect(row.metadata.product_image).toBeNull();
    expect(row.metadata.product_description).toBeNull();
  });

  it("produces exactly the columns the append-only ledger insert expects", () => {
    // Guards against schema/builder drift: the row shape must match the
    // ownership_transfers client-insert column set (see the migration).
    expect(Object.keys(sampleRow()).sort()).toEqual(LEDGER_INSERT_COLUMNS);
  });
});

describe("Ownership transfer public provenance projection", () => {
  it("keeps only public-safe fields for verify/library surfaces", () => {
    const view = toOwnershipTransferView(sampleRow());

    expect(view).toEqual({
      certificateId: "CERT-001",
      productName: "Silk Jacket",
      price: 2400,
      transferredAt: "2026-01-01T00:00:00.000Z",
    });
    // Exactly four keys — nothing private can ride along.
    expect(Object.keys(view).sort()).toEqual(
      ["certificateId", "price", "productName", "transferredAt"].sort()
    );
  });

  it("NEVER exposes email, wallet, or the payment reference (privacy boundary)", () => {
    const view = toOwnershipTransferView(sampleRow());
    const serialized = JSON.stringify(view).toLowerCase();

    expect(serialized).not.toContain("buyer@example.com");
    expect(serialized).not.toContain("seller@example.com");
    expect(serialized).not.toContain("example.com");
    expect(serialized).not.toContain("0xabc"); // wallet
    expect(serialized).not.toContain("pi_123"); // payment ref

    // Belt-and-braces: no private KEYS survive the projection either.
    for (const key of ["buyer_email", "seller_email", "buyer_wallet", "payment_ref"]) {
      expect(view).not.toHaveProperty(key);
    }
  });

  it("normalizes the certificate id in the public view", () => {
    const view = toOwnershipTransferView({
      certificate_id: " abc-9 ",
      product_name: "Bag",
      price: 100,
      transferred_at: "2026-03-03T00:00:00.000Z",
    });
    expect(view.certificateId).toBe("ABC-9");
  });
});
