"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { href: "/merchant", label: "Dashboard" },
  { href: "/merchant/shop", label: "Shop Products" },
  { href: "/merchant/exclusive", label: "Exclusive Pieces" },
  { href: "/merchant/certificates", label: "Certificates" },
  { href: "/merchant/orders", label: "Orders" },
  { href: "/merchant/customers", label: "Customers" },
];

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded, role, logout } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user || role !== "merchant") {
      router.replace("/");
    }
  }, [isLoaded, user, role, router]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div
          className="animate-spin"
          style={{
            width: 20,
            height: 20,
            border: "1.5px solid #C9A84C",
            borderTopColor: "transparent",
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }

  if (!user || role !== "merchant") return null;

  return (
    <div className="flex flex-col flex-1" style={{ minHeight: 0 }}>
      {/* Merchant header */}
      <div
        style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", background: "#f8f6f1" }}
        className="flex items-center justify-between px-8 h-11 shrink-0"
      >
        <div className="flex items-center gap-8">
          <span className="font-[family-name:var(--font-ibm-mono)] text-[10px] tracking-[0.25em] uppercase text-[#080808]">
            TEST — Merchant Portal
          </span>
          <Link
            href="/"
            className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] hover:text-[#080808] transition-colors duration-200"
          >
            ← Back to Store
          </Link>
        </div>
        <button
          onClick={logout}
          className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#8a8a8a] hover:text-[#080808] transition-colors duration-200"
        >
          Log Out
        </button>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1" style={{ minHeight: 0 }}>
        <aside
          style={{ borderRight: "1px solid rgba(0,0,0,0.08)", width: 220, background: "#fafaf8" }}
          className="shrink-0 flex flex-col py-8"
        >
          <p
            style={{ color: "#8a8a8a" }}
            className="px-6 mb-4 text-[9px] tracking-[0.3em] uppercase font-[family-name:var(--font-dm-sans)]"
          >
            Navigation
          </p>
          <nav className="flex flex-col">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    color: active ? "#080808" : "#8a8a8a",
                    borderLeft: active ? "2px solid #C9A84C" : "2px solid transparent",
                    background: active ? "rgba(201,168,76,0.04)" : "transparent",
                  }}
                  className="px-6 py-3 text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] hover:text-[#080808] transition-colors duration-200"
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
