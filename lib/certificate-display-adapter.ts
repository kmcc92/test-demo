import {
  getCertificateByProductId,
  type Certificate,
} from "@/lib/certificate-storage";

export type CertificateDisplayContext = {
  certificate: Certificate | null;
  hasCertificate: boolean;
};

const EMPTY: CertificateDisplayContext = { certificate: null, hasCertificate: false };

export function getCertificateDisplayContext(
  productId: string
): CertificateDisplayContext {
  try {
    if (!productId || typeof window === "undefined") return EMPTY;
    const certificate = getCertificateByProductId(productId);
    return certificate ? { certificate, hasCertificate: true } : EMPTY;
  } catch {
    return EMPTY;
  }
}
