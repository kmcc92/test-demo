import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[--border] mt-auto">
      <div className="max-w-7xl mx-auto px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <span className="font-[family-name:var(--font-cormorant)] text-lg font-light tracking-[0.5em] uppercase text-[--text-primary]">
            TEST
          </span>
          <p className="mt-3 text-xs text-[--text-muted] font-[family-name:var(--font-dm-sans)] leading-relaxed max-w-[180px]">
            Every piece authenticated. Every owner verified.
          </p>
        </div>

        <div>
          <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[--text-muted] mb-4">
            Collection
          </p>
          <ul className="space-y-2">
            {[
              ["Shop", "/shop"],
              ["Exclusive", "/exclusive"],
              ["Auctions", "/auctions"],
              ["Collection", "/collection"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-xs text-[--text-secondary] font-[family-name:var(--font-dm-sans)] hover:text-[--text-primary] transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[--text-muted] mb-4">
            Verify
          </p>
          <ul className="space-y-2">
            {[
              ["Library", "/library"],
              ["Journal", "/journal"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="text-xs text-[--text-secondary] font-[family-name:var(--font-dm-sans)] hover:text-[--text-primary] transition-colors"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[10px] tracking-widest uppercase font-[family-name:var(--font-dm-sans)] text-[--text-muted] mb-4">
            Authentication
          </p>
          <p className="text-[10px] font-[family-name:var(--font-ibm-mono)] text-[--text-muted] leading-relaxed">
            Each certificate is stored permanently and cannot be altered or deleted.
          </p>
        </div>
      </div>

      <div className="border-t border-[--border] px-8 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <p className="text-[10px] text-[--text-muted] font-[family-name:var(--font-dm-sans)] tracking-wider">
          © 2026 TEST. All rights reserved.
        </p>
        <p className="text-[10px] text-[--text-muted] font-[family-name:var(--font-ibm-mono)]">
          AUTHENTICATION PROTOCOL v1.0
        </p>
      </div>
    </footer>
  );
}
