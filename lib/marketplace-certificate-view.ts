import { getCertificateByProductId } from "@/lib/certificate-storage";

export type MarketplaceCertificateBadge = {
  hasCertificate: boolean;
  certificateId?: string;
  provenanceDepth?: number;
  serviceHistoryCount?: number;
};

const EMPTY: MarketplaceCertificateBadge = { hasCertificate: false };

export function getMarketplaceCertificateBadge(
  productId: string
): MarketplaceCertificateBadge {
  try {
    if (!productId || typeof window === "undefined") return EMPTY;
    const certificate = getCertificateByProductId(productId);
    if (!certificate) return EMPTY;
    return {
      hasCertificate: true,
      certificateId: certificate.id,
      provenanceDepth: certificate.metadata.provenanceDepth,
      serviceHistoryCount: certificate.metadata.serviceHistoryCount,
    };
  } catch {
    return EMPTY;
  }
}
