import {
  getCertificateFromRegistry,
  registerCertificate,
  listRegisteredCertificates,
  isCertificateRegistered,
} from "@/lib/certificate-registry";
import type { CertificateRegistryRepository } from "../types";

export const localCertificateRegistryRepo: CertificateRegistryRepository = {
  get: (id) => getCertificateFromRegistry(id),
  register: (params) => registerCertificate(params),
  list: () => listRegisteredCertificates(),
  isRegistered: (id) => isCertificateRegistered(id),
};
