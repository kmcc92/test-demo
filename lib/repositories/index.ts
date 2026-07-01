import { localPurchaseRepo } from "./localStorage/purchaseRepo";
import { localMerchantProductRepo } from "./localStorage/merchantProductRepo";
import { localServiceRequestRepo } from "./localStorage/serviceRequestRepo";
import { localCertificateEventRepo } from "./localStorage/certificateEventRepo";
import { localCertificateStatusRepo } from "./localStorage/certificateStatusRepo";
import { localCertificateRegistryRepo } from "./localStorage/certificateRegistryRepo";

// Migration switch — flip to true when Supabase is ready
const USE_SUPABASE = false;

export const purchaseRepo = USE_SUPABASE
  ? localPurchaseRepo // replace with supabasePurchaseRepo later
  : localPurchaseRepo;

export const serviceRequestRepo = USE_SUPABASE
  ? localServiceRequestRepo
  : localServiceRequestRepo;

export const certificateEventRepo = USE_SUPABASE
  ? localCertificateEventRepo
  : localCertificateEventRepo;

export const certificateStatusRepo = USE_SUPABASE
  ? localCertificateStatusRepo
  : localCertificateStatusRepo;

export const certificateRegistryRepo = USE_SUPABASE
  ? localCertificateRegistryRepo
  : localCertificateRegistryRepo;

export const merchantProductRepo = USE_SUPABASE
  ? localMerchantProductRepo
  : localMerchantProductRepo;
