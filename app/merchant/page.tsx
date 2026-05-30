"use client";

import { useAuth } from "@/hooks/useAuth";
import { useMarketplace } from "@/hooks/useMarketplace";
import { PRODUCTS } from "@/lib/mock-data";

export default function MerchantDashboard() {
  const { user, logout } = useAuth();
  const { listings } = useMarketplace();

  const shopCount = PRODUCTS.filter((p) => p.id.startsWith("prod-")).length;
  const exclusiveCount = PRODUCTS.filter((p) => p.id.startsWith("excl-")).length;
  const activeListings = listings.filter((l) => l.status === "active").length;

  const stats: { label: string; value: string | number }[] = [
    { label: "Total Shop Products", value: shopCount },
    { label: "Total Exclusive Pieces", value: exclusiveCount },
    { label: "Active Listings", value: activeListings },
    { label: "Platform Status", value: "Demo Mode" },
  ];

  return (
    <main className="px-10 py-10">
      <div className="mb-10">
        <p
          style={{ color: "#8a8a8a" }}
          className="text-[9px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] mb-3"
        >
          Merchant Portal
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light text-[#080808] tracking-wide mb-3">
          Dashboard
        </h1>
        <p className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[#8a8a8a]">
          Logged in as: {user?.email}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10 max-w-2xl">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            style={{ border: "1px solid rgba(0,0,0,0.08)" }}
            className="px-6 py-6 bg-white"
          >
            <p
              style={{ color: "#8a8a8a" }}
              className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] mb-3"
            >
              {label}
            </p>
            <p className="font-[family-name:var(--font-ibm-mono)] text-2xl text-[#080808]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={logout}
        style={{ border: "1px solid rgba(0,0,0,0.12)", color: "#8a8a8a" }}
        className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] h-9 px-5 hover:text-[#080808] hover:border-[#080808] transition-colors duration-200"
      >
        Log Out
      </button>
    </main>
  );
}
