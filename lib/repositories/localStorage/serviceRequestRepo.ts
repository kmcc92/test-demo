import {
  getAllServiceRequests,
  getServiceRequestsForCertificate,
  getActiveServiceRequest,
  createServiceRequest,
  updateServiceRequest,
} from "@/lib/service-requests";
import type { ServiceRequestRepository } from "../types";

export const localServiceRequestRepo: ServiceRequestRepository = {
  getAll: () => getAllServiceRequests(),
  getByCertificate: (id) => getServiceRequestsForCertificate(id),
  getActive: (id) => getActiveServiceRequest(id),
  create: (req) =>
    void createServiceRequest({
      certificateId: req.certificateId,
      productName: req.productName,
      requestType: req.requestType,
      customerDescription: req.customerDescription,
    }),
  update: (id, patch) => updateServiceRequest(id, patch),
};
