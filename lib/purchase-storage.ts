// PurchaseRecord is the canonical purchase data shape.
// Ownership is session-only — no localStorage reads or writes for purchases.

export interface PurchaseRecord {
  id: string;
  productId: string;
  productName: string;
  certificateId: string;
  txHash: string;
  price: number;
  purchasedAt: string;
  walletAddress?: string;
}
