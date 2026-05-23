"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import PurchaseHistory from "@/components/account/PurchaseHistory";
import PaymentMethods from "@/components/account/PaymentMethods";
import GoldButton from "@/components/ui/GoldButton";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-8">
      {children}
    </p>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-[var(--border)]">
      <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
        {value}
      </span>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isLoaded, logout } = useAuth();
  const { isConnected, truncatedAddress, connect, disconnect } = useWallet();
  const [walletMounted, setWalletMounted] = useState(false);

  useEffect(() => { setWalletMounted(true); }, []);

  useEffect(() => {
    if (isLoaded && !user) router.push("/");
  }, [isLoaded, user, router]);

  if (!isLoaded || !user) return null;

  const createdDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-3xl mx-auto px-8 py-16 w-full">

      {/* Page header */}
      <div className="mb-16">
        <p className="text-[10px] tracking-[0.4em] uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] mb-3">
          TEST Member
        </p>
        <h1 className="font-[family-name:var(--font-cormorant)] text-5xl md:text-6xl font-light text-[var(--text-primary)] tracking-wide">
          My Account
        </h1>
      </div>

      {/* ── Profile ──────────────────────────────────── */}
      <section>
        <SectionHeading>Profile</SectionHeading>
        <div className="mb-8">
          <MetaRow label="Email" value={user.email} />
          <MetaRow label="Member Since" value={createdDate} />
        </div>
        <GoldButton
          variant="outline"
          size="sm"
          onClick={() => { logout(); router.push("/"); }}
        >
          Log Out
        </GoldButton>
      </section>

      <div className="border-t border-[var(--border)] my-16" />

      {/* ── Wallet ───────────────────────────────────── */}
      <section>
        <SectionHeading>Wallet</SectionHeading>
        {!walletMounted ? null : isConnected ? (
          <div>
            <div className="mb-8">
              <div className="flex justify-between items-center py-4 border-b border-[var(--border)]">
                <span className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)]">
                  Address
                </span>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] shrink-0" />
                  <span className="font-[family-name:var(--font-ibm-mono)] text-sm text-[var(--text-primary)]">
                    {truncatedAddress}
                  </span>
                </div>
              </div>
              <MetaRow label="Network" value="Polygon" />
            </div>
            <GoldButton variant="outline" size="sm" onClick={disconnect}>
              Disconnect Wallet
            </GoldButton>
          </div>
        ) : (
          <div>
            <p className="text-sm font-[family-name:var(--font-dm-sans)] text-[var(--text-muted)] leading-relaxed mb-6">
              Connect a wallet to enable blockchain authentication on your purchases.
            </p>
            <GoldButton variant="primary" size="md" onClick={connect}>
              Connect Wallet
            </GoldButton>
          </div>
        )}
      </section>

      <div className="border-t border-[var(--border)] my-16" />

      {/* ── Purchase History ─────────────────────────── */}
      <section>
        <SectionHeading>Purchase History</SectionHeading>
        <PurchaseHistory />
      </section>

      <div className="border-t border-[var(--border)] my-16" />

      {/* ── Payment Methods ───────────────────────────── */}
      <section>
        <SectionHeading>Payment Methods</SectionHeading>
        <PaymentMethods email={user.email} />
      </section>

    </div>
  );
}
