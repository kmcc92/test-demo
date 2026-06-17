import { readPurchases, writePurchases, addPurchase } from "@/lib/purchase-storage";
import type { PurchaseRepository } from "../types";

export const localPurchaseRepo: PurchaseRepository = {
  get: (email) => readPurchases(email),
  add: (email, purchase) => addPurchase(email, purchase),
  write: (email, purchases) => writePurchases(email, purchases),
};
