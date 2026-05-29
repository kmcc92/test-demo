export type MarketplaceBid = {
  id: string;
  bidderEmail: string;
  bidderWallet: string;
  amount: number;
  timestamp: string;
};

export type MarketplaceListing = {
  id: string;
  productId: string;
  productName: string;
  certificateId: string;
  image: string;
  sellerEmail: string;
  sellerWallet: string;
  reservePrice: number;
  currentBid: number;
  minimumIncrement: number;
  endsAt: string;
  condition: string;
  bidHistory: MarketplaceBid[];
  provenanceDepth: number;
  serviceHistoryCount: number;
  status: "active" | "ended" | "sold";
};
