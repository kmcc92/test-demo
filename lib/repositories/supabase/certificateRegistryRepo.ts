import { supabase } from "@/lib/supabase";
import type { AsyncCertificateRegistryRepository } from "../types";

const COLUMNS = "certificate_id, product_name, merchant_id, registered_at";

export const supabaseCertificateRegistryRepo: AsyncCertificateRegistryRepository = {
  async get(certificateId) {
    const { data, error } = await supabase
      .from("certificates")
      .select(COLUMNS)
      .eq("certificate_id", certificateId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      certificateId: data.certificate_id,
      productName: data.product_name,
      merchantId: data.merchant_id ?? undefined,
      registeredAt: data.registered_at,
    };
  },

  async register(params) {
    const { error } = await supabase.from("certificates").insert({
      certificate_id: params.certificateId,
      product_name: params.productName,
      merchant_id: params.merchantId ?? null,
    });
    // Ignore ONLY unique violation (already registered — immutable identity, fine).
    if (error && error.code !== "23505") throw error;
  },

  async list() {
    const { data, error } = await supabase
      .from("certificates")
      .select(COLUMNS)
      .order("registered_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((d) => ({
      certificateId: d.certificate_id,
      productName: d.product_name,
      merchantId: d.merchant_id ?? undefined,
      registeredAt: d.registered_at,
    }));
  },

  async isRegistered(certificateId) {
    const { data, error } = await supabase
      .from("certificates")
      .select("certificate_id")
      .eq("certificate_id", certificateId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  },
};
