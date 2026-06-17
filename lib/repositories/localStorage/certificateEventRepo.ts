import {
  getEventsForCertificate,
  getAllEvents,
  recordEvent,
} from "@/lib/certificate-events";
import type { CertificateEventRepository } from "../types";

export const localCertificateEventRepo: CertificateEventRepository = {
  getByCertificate: (id) => getEventsForCertificate(id),
  getAll: () => getAllEvents(),
  add: (event) => void recordEvent(event),
};
