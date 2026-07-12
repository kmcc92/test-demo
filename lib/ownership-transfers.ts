export type OwnershipTransferRow = {
  certificate_id: string;
  payment_ref: string;
  product_id: string;
  product_name: string;
  buyer_email: string;
  seller_email: string;
  price: number;
  buyer_wallet?: string | null;
  transferred_at: string;
  metadata: {
    product_image?: string | null;
    product_description?: string | null;
  };
};

export function buildOwnershipTransferRow(params: {
  certificateId: string;
  paymentRef: string;
  productId: string;
  productName: string;
  buyerEmail: string;
  sellerEmail: string;
  price: number;
  buyerWallet?: string | null;
  productImage?: string | null;
  productDescription?: string | null;
  transferredAt: string;
}): OwnershipTransferRow {
  return {
    certificate_id: params.certificateId.trim().toUpperCase(),
    payment_ref: params.paymentRef,
    product_id: params.productId,
    product_name: params.productName,
    buyer_email: params.buyerEmail,
    seller_email: params.sellerEmail,
    price: params.price,
    buyer_wallet: params.buyerWallet ?? null,
    transferred_at: params.transferredAt,
    metadata: {
      product_image: params.productImage ?? null,
      product_description: params.productDescription ?? null,
    },
  };
}

// Public-safe provenance projection — the ONLY shape allowed onto public
// verification / library surfaces. It deliberately DROPS buyer_email,
// seller_email, buyer_wallet, and payment_ref: those are private and must never
// leave the owner-scoped ledger (CLAUDE.md — never expose email, wallet_address,
// or tx_hash on /library or /verify). Keeping this projection pure (no I/O) makes
// the privacy boundary unit-testable without a database; the ledger repo and any
// public surface build their view models exclusively through it.
export type OwnershipTransferView = {
  certificateId: string;
  productName: string;
  price: number;
  transferredAt: string;
};

export function toOwnershipTransferView(row: {
  certificate_id: string;
  product_name: string;
  price: number;
  transferred_at: string;
}): OwnershipTransferView {
  return {
    certificateId: row.certificate_id.trim().toUpperCase(),
    productName: row.product_name,
    price: row.price,
    transferredAt: row.transferred_at,
  };
}
