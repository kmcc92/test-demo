import {
  getCertificateStatus,
  setCertificateStatus,
  clearStatus,
  getCertificateStatusRecord,
} from "@/lib/certificate-status";
import type { CertificateStatusRepository } from "../types";

export const localCertificateStatusRepo: CertificateStatusRepository = {
  get: (id) => getCertificateStatus(id),
  set: (id, status, details) =>
    setCertificateStatus(id, status, {
      reportedDate: details?.reportedDate,
      reportedLocation: details?.location,
      note: details?.note,
    }),
  clear: (id) => clearStatus(id),
  getRecord: (id) => getCertificateStatusRecord(id),
};
