import {
  getMerchantProducts,
  getMerchantProductsByType,
  addMerchantProduct,
  updateMerchantProduct,
} from "@/lib/merchant-storage";
import type { MerchantProductRepository } from "../types";

export const localMerchantProductRepo: MerchantProductRepository = {
  getAll: () => getMerchantProducts(),
  getByType: (type) => getMerchantProductsByType(type),
  getById: (id) => getMerchantProducts().find((p) => p.id === id) ?? null,
  upsert: (product) => {
    const exists = getMerchantProducts().some((p) => p.id === product.id);
    if (exists) {
      updateMerchantProduct(product.id, product);
    } else {
      addMerchantProduct(product);
    }
  },
};
