"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const NAV_LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/exclusive", label: "Exclusive" },
  { href: "/auctions", label: "Auctions" },
  { href: "/library", label: "Library" },
];

function formatEmail(email: string): string {
  const [local] = email.split("@");
  return `${local.length > 8 ? local.slice(0, 8) : local}@...`;
}

export default function Navbar() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const { user, isLoaded, logout, openAuth } = useAuth();

  const [visible, setVisible] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) setVisible(true);
      else if (y > lastY + 4) setVisible(false);
      else if (y < lastY - 4) setVisible(true);
      lastY = y;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (e.clientY < 80) setVisible(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  useEffect(() => {
    setVisible(true);
    setDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [dropdownOpen]);

  return (
    <motion.header
      animate={{ y: reduced ? 0 : visible ? 0 : -80 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      style={{ background: "#ffffff", borderBottom: "1px solid rgba(0,0,0,0.1)" }}
      className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center px-8"
    >
      {/* Wordmark */}
      <Link
        href="/"
        style={{ color: "#080808" }}
        className="font-[family-name:var(--font-cormorant)] text-xl font-light tracking-[0.5em] uppercase shrink-0"
      >
        TEST
      </Link>

      {/* Nav links — centered */}
      <nav className="hidden md:flex items-center gap-8 mx-auto">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{ color: "#080808" }}
              className={`text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] transition-opacity duration-200 ${
                isActive ? "opacity-100" : "opacity-60 hover:opacity-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Right: auth only — deferred until isLoaded to prevent hydration mismatch */}
      <div className="shrink-0">
        {isLoaded && (
          user ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setDropdownOpen((o) => !o)}
                style={{ color: "#080808", borderColor: "rgba(0,0,0,0.15)" }}
                className="h-9 px-4 text-[10px] tracking-widest font-[family-name:var(--font-ibm-mono)] border transition-colors duration-200 hover:border-[#080808] flex items-center gap-2"
              >
                {formatEmail(user.email)}
                <svg
                  width="8"
                  height="5"
                  viewBox="0 0 8 5"
                  fill="none"
                  aria-hidden
                  style={{
                    transform: dropdownOpen ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s",
                  }}
                >
                  <path
                    d="M1 1L4 4L7 1"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {dropdownOpen && (
                <div
                  style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)" }}
                  className="absolute right-0 top-full mt-1 w-44 z-50"
                >
                  <div style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }} className="px-4 py-3">
                    <p style={{ color: "#8A8A8A" }} className="text-[9px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] mb-1">
                      Signed In
                    </p>
                    <p className="font-[family-name:var(--font-ibm-mono)] text-[11px] text-[#080808] truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="px-4 py-2">
                    <Link
                      href="/account"
                      onClick={() => setDropdownOpen(false)}
                      className="block py-2 text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#080808] hover:opacity-60 transition-opacity duration-200"
                    >
                      My Account
                    </Link>
                    <Link
                      href="/verify"
                      onClick={() => setDropdownOpen(false)}
                      className="block py-2 text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#080808] hover:opacity-60 transition-opacity duration-200"
                    >
                      Verify
                    </Link>
                    <button
                      onClick={() => { logout(); setDropdownOpen(false); }}
                      className="block w-full text-left py-2 text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[#080808] hover:opacity-60 transition-opacity duration-200"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuth("signup")}
              style={{ color: "#080808", borderColor: "rgba(0,0,0,0.15)" }}
              className="h-9 px-4 text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] border transition-colors duration-200 hover:border-[#080808]"
            >
              Sign Up
            </button>
          )
        )}
      </div>
    </motion.header>
  );
}
