"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useOrders } from "@/hooks/useOrders";
import { computeStatus, type OrderStatus } from "@/lib/order-storage";
import { formatPrice } from "@/lib/utils";

interface OrderTrackingProps {
  refreshKey?: number;
}

const STEPS: OrderStatus[] = ["processing", "shipped", "delivered"];
const STEP_LABELS: Record<OrderStatus, string> = {
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
};

export default function OrderTracking({ refreshKey }: OrderTrackingProps) {
  const reduced = useReducedMotion();
  const { orders } = useOrders(refreshKey);

  if (orders.length === 0) {
    return (
      <div className="py-12 border border-[var(--border)] text-center">
        <p className="text-[10px] tracking-[0.35em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3">
          No Orders Yet
        </p>
        <Link
          href="/shop"
          className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-[var(--gold)] tracking-wide hover:opacity-70 transition-opacity duration-200"
        >
          Browse the Shop →
        </Link>
      </div>
    );
  }

  return (
    <div className="border border-[var(--border)]">
      {orders.map((order, i) => {
        const status = computeStatus(order.purchasedAt);
        const stepIndex = STEPS.indexOf(status);
        const date = new Date(order.purchasedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return (
          <motion.div
            key={order.orderId}
            initial={reduced ? {} : { opacity: 0, y: 8 }}
            animate={reduced ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07, ease: "easeOut" }}
            className={`px-6 py-6 ${i < orders.length - 1 ? "border-b border-[var(--border)]" : ""}`}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-6 mb-5">
              <div className="flex-1 min-w-0">
                <h4 className="font-[family-name:var(--font-cormorant)] text-lg font-light text-[var(--text-primary)] tracking-wide leading-snug mb-2">
                  {order.productName}
                </h4>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] text-[var(--gold)]">
                    {order.orderId}
                  </span>
                  <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                    {date}
                  </span>
                  {order.size && (
                    <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                      Size {order.size}
                    </span>
                  )}
                </div>
              </div>
              <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)] shrink-0">
                {formatPrice(order.price)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="flex items-start mb-5">
              {STEPS.map((step, si) => {
                const active = si <= stepIndex;
                const lineActive = si < stepIndex;
                return (
                  <div key={step} className="flex items-start" style={{ flex: si < STEPS.length - 1 ? "1 1 0" : undefined }}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: active ? "var(--gold)" : "rgba(0,0,0,0.12)",
                          flexShrink: 0,
                          transition: "background 0.3s",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "9px",
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          fontFamily: "var(--font-dm-sans)",
                          color: active ? "var(--gold)" : "var(--text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {STEP_LABELS[step]}
                      </span>
                    </div>
                    {si < STEPS.length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: "1px",
                          marginTop: "3.5px",
                          marginLeft: "8px",
                          marginRight: "8px",
                          background: lineActive ? "var(--gold)" : "rgba(0,0,0,0.12)",
                          transition: "background 0.3s",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tracking + Delivery */}
            <div className="flex flex-wrap gap-x-10 gap-y-3 pt-4 border-t border-[var(--border)]">
              <div>
                <p className="text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
                  Tracking
                </p>
                <p className="font-[family-name:var(--font-ibm-mono)] text-xs text-[var(--text-primary)]">
                  {order.trackingNumber}
                </p>
              </div>
              <div>
                <p className="text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-1">
                  Est. Delivery
                </p>
                <p className="font-[family-name:var(--font-dm-sans)] text-xs text-[var(--text-primary)]">
                  {order.estimatedDelivery}
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
