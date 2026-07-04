import type { PurchaseRecord } from "@/lib/purchase-storage";
import type { MerchantProduct } from "@/lib/merchant-storage";
import type { ServiceRequest } from "@/lib/service-requests";
import type { CertificateEvent } from "@/lib/certificate-events";
import type { CertificateStatus, CertificateStatusRecord } from "@/lib/certificate-status";

export interface PurchaseRepository {
  get(email: string): PurchaseRecord[];
  add(email: string, purchase: PurchaseRecord): void;
  write(email: string, purchases: PurchaseRecord[]): void;
}

export interface ServiceRequestRepository {
  getAll(): ServiceRequest[];
  getByCertificate(certificateId: string): ServiceRequest[];
  getActive(certificateId: string): ServiceRequest | null;
  create(req: ServiceRequest): void;
  update(id: string, patch: Partial<ServiceRequest>): void;
}

export interface CertificateEventRepository {
  getByCertificate(certificateId: string): CertificateEvent[];
  getAll(): CertificateEvent[];
  add(event: CertificateEvent): void;
}

export interface CertificateStatusRepository {
  get(certificateId: string): CertificateStatus;
  set(
    certificateId: string,
    status: CertificateStatus,
    details?: { reportedDate?: string; location?: string; note?: string }
  ): void;
  clear(certificateId: string): void;
  getRecord(certificateId: string): CertificateStatusRecord | null;
}

export interface MerchantProductRepository {
  getAll(): MerchantProduct[];
  getByType(type: "shop" | "exclusive"): MerchantProduct[];
  getById(id: string): MerchantProduct | null;
  upsert(product: MerchantProduct): void;
}

export interface CertificateRegistryRepository {
  get(certificateId: string): {
    certificateId: string;
    productName: string;
    merchantId?: string;
    registeredAt: string;
  } | null;
  register(params: {
    certificateId: string;
    productName: string;
    merchantId?: string;
  }): void;
  list(): Array<{
    certificateId: string;
    productName: string;
    merchantId?: string;
    registeredAt: string;
  }>;
  isRegistered(certificateId: string): boolean;
}

export interface AsyncCertificateRegistryRepository {
  get(certificateId: string): Promise<{
    certificateId: string;
    productName: string;
    merchantId?: string;
    registeredAt: string;
  } | null>;
  register(params: {
    certificateId: string;
    productName: string;
    merchantId?: string;
  }): Promise<void>;
  list(): Promise<Array<{
    certificateId: string;
    productName: string;
    merchantId?: string;
    registeredAt: string;
  }>>;
  isRegistered(certificateId: string): Promise<boolean>;
}
