# TEST — Project State (Demo)
# Update this file as the build progresses.
# Load every session alongside PROJECT_SPEC.md.

---

## CURRENT PHASE

Phase 4 — Polish & Harden

---

## SESSION START PROMPT

When starting a new session, paste both files and say:

> "Continue building the TEST demo. Current phase is [X]."

Claude will read the file tree below and continue without regenerating existing files.

---

## PRESENTATION SCRIPT STATUS

Track each step of the scripted path independently — these are the only things that must work perfectly.

- [x] Homepage hero + gold shimmer fires reliably on every load
- [x] EXCLUSIVE page loads with dark mode transition
- [x] Quick-view drawer opens on exclusive item click
- [x] Auction detail page loads for featured auction
- [x] Bid input accepts amount and validates minimum increment
- [x] PLACE BID → bid appears in history + price updates + toast fires
- [x] VERIFY page loads cleanly
- [x] TEST-GOLD-001 → AUTHENTICATED with gold checkmark animation
- [BROKEN] TEST-STOLEN-001 → FLAGGED red warning state — REGRESSION, see ACTIVE ISSUES
- [ ] Full script runs start-to-finish without hesitation ← final check before deploy

---

## COUNTDOWN TIMER DATES

*(Update these before every presentation)*

```typescript
// lib/mock-data.ts — AUCTION_DATES constant
// Currently set to: 2026-08-15, 2026-08-18, 2026-08-20
// Set all auction end dates at least 48h past your earliest presentation date
FEATURED: "2026-08-15T18:00:00Z",
AUCTION_2: "2026-08-18T12:00:00Z",
AUCTION_3: "2026-08-20T20:00:00Z",
```

---

## COMPLETED

**Phase 1 — Shell**
- [x] Next.js initialized
- [x] Tailwind configured (v4, @import "tailwindcss")
- [x] CSS variables + globals.css + grain texture
- [x] Fonts loaded (Cormorant Garamond, DM Sans, IBM Plex Mono via next/font/google)
- [x] lib/utils.ts
- [x] lib/mock-data.ts (with presentation-safe countdown dates: 2026-08-15+)
- [x] lib/mock-verify.ts (CERTIFICATES: TEST-GOLD-001 authenticated, TEST-GOLD-002 transferred — TEST-REVOKED-001/TEST-STOLEN-001 removed, see ACTIVE ISSUES)
- [x] components/ui/GoldButton.tsx
- [x] components/ui/PageTransition.tsx
- [x] components/ui/LoadingShimmer.tsx
- [x] components/ui/CountdownTimer.tsx
- [x] components/ui/AuthBadge.tsx
- [x] components/ui/Toast.tsx (ToastProvider + useToast hook)
- [x] components/layout/Navbar.tsx
- [x] components/layout/Footer.tsx
- [x] app/layout.tsx
- [x] app/page.tsx (homepage with gold shimmer)
- [x] components/home/HeroSection.tsx (gold shimmer sweep, CTAs, scroll indicator)
- [x] components/home/AuctionPreviewCard.tsx

**Phase 2 — Scripted Path**
- [x] app/exclusive/page.tsx + quick-view drawer
- [x] components/exclusive/ExclusiveGrid.tsx
- [x] components/exclusive/QuickViewDrawer.tsx (ESC to close, body scroll lock)
- [x] app/auctions/[id]/page.tsx (server component, await params)
- [x] components/auctions/AuctionDetailClient.tsx (useState bid flow, 5% min increment, animated history, toast)
- [x] app/verify/page.tsx (all 5 states, 800ms delay, SVG gold checkmark animation)
- [ ] Full script tested end-to-end on local dev ← do this before Phase 3

**Phase 3 — Supporting Pages**
- [x] app/shop/page.tsx + components/shop/ShopClient.tsx (filter sidebar, 3-col grid)
- [x] components/shop/ProductCard.tsx (slide-up quick view button on hover)
- [x] components/shop/ShopQuickView.tsx (light-themed drawer)
- [x] app/auctions/page.tsx + components/auctions/AuctionCard.tsx (bid/countdown/count stats)
- [x] app/collection/page.tsx + components/collection/CollectionContent.tsx (scroll reveals, editorial)
- [x] app/journal/page.tsx (server component, static editorial entries)

**Phase 4 — Polish & Harden**
- [x] app/verify/page.tsx rebuilt (all 5 states, 800ms delay, SVG gold checkmark with pathLength animation)
- [x] VERIFY added to Navbar NAV_LINKS
- [x] Wallet connect (RainbowKit UI only)
  - @rainbow-me/rainbowkit@2.2.11 + wagmi@2 + viem + @tanstack/react-query installed
  - lib/wagmi.ts — getDefaultConfig with mainnet, ssr: true
  - components/providers/WalletProvider.tsx — WagmiProvider + QueryClientProvider + RainbowKitProvider
  - Navbar CONNECT button wired to useConnectModal → openConnectModal
  - Placeholder projectId used — WalletConnect deep-link won't resolve, all other wallets show
- [ ] Script run 3× without touching keyboard
- [ ] Mobile QA
- [ ] Animation timing pass
- [x] Countdown dates verified 48h+ ahead (2026-08-15, -08-18, -08-20 — 89+ days past 2026-05-18)
- [x] lib/certificate-status.ts — client-side certificate status overlay (active/stolen/lost),
  localStorage-backed, SSR-safe (returns "active" on server)
  - lib/verify-lookup.ts attaches result.reportedStatus after lookup resolves
  - app/verify/page.tsx renders a "REPORTED STOLEN"/"REPORTED LOST" banner from reportedStatus
  - lib/merchant-storage.ts getStaticCertificateIds() now Object.keys(CERTIFICATES)
- [x] Report Stolen/Lost — full feature
  - lib/certificate-status.ts: CertificateStatusRecord extended with reportedDate/reportedLocation;
    reportStolen()/reportLost() accept {dateStolen|dateLost, location, note}; reportedAt always
    auto-set; new pure-read getCertificateStatusRecord(); SAFEGUARD 3 falsy-certificateId guards
    added to getCertificateStatus/getCertificateStatusRecord/setCertificateStatus
  - components/certificate-status/ReportStatusModal.tsx — shared modal (date/location/note +
    library-removal warning) used by both /account and merchant
  - app/account/page.tsx — Authenticated Pieces rows show Report Stolen/Lost actions, status
    badge + reported details, and Clear Report
  - app/merchant/exclusive/page.tsx — same status badge/actions (Mark Stolen/Lost/Clear Status)
    on each inventory card, same shared functions (last-write-wins, no merge UI)
  - components/library/LibraryContent.tsx — filteredEntries (NOT getVisibleProducts, see
    DEVIATION below) now excludes entries whose certificateId has status stolen/lost; brief
    SSR->client flicker is expected (status overlay is "active" on server)
  - lib/verify-lookup.ts / app/verify/page.tsx — stolen/lost banner now also shows
    reportedDate/reportedLocation when present; verification result itself unaffected
  - DEVIATION FROM SPEC: the request specified adding the library-exclusion filter inside
    getVisibleProducts() (lib/market-state.ts) as "the only place this filter is added."
    Diagnosis found /library never calls getVisibleProducts() — its visibility is governed
    entirely by LibraryContent.tsx's own filteredEntries. Implementing the filter in
    getVisibleProducts() would have had zero effect on /library, so (per user decision) the
    filter was added directly to filteredEntries instead. getVisibleProducts() itself is
    unchanged.

**Phase 5 — Deploy**
- [ ] vercel deploy --prod
- [ ] Script tested on live URL
- [ ] Starting URL bookmarked

---

## CURRENT FILE TREE

```
/
├── app/
│   ├── auctions/[id]/page.tsx       ← server component, await params
│   ├── auctions/page.tsx
│   ├── collection/page.tsx
│   ├── exclusive/page.tsx
│   ├── journal/page.tsx
│   ├── library/page.tsx
│   ├── shop/page.tsx
│   ├── verify/page.tsx              ← all 5 certificate states, gold checkmark animation
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auctions/
│   │   └── AuctionDetailClient.tsx
│   ├── exclusive/
│   │   ├── ExclusiveGrid.tsx
│   │   └── QuickViewDrawer.tsx
│   ├── home/
│   │   ├── AuctionPreviewCard.tsx
│   │   └── HeroSection.tsx
│   ├── layout/
│   │   ├── Footer.tsx
│   │   └── Navbar.tsx
│   └── ui/
│       ├── AuthBadge.tsx
│       ├── CountdownTimer.tsx
│       ├── GoldButton.tsx
│       ├── LoadingShimmer.tsx
│       ├── PageTransition.tsx
│       └── Toast.tsx
├── components/
│   ├── providers/
│   │   └── WalletProvider.tsx     ← WagmiProvider + QueryClientProvider + RainbowKitProvider
├── lib/
│   ├── mock-data.ts
│   ├── mock-verify.ts
│   ├── utils.ts
│   └── wagmi.ts                   ← wagmi v2 config (getDefaultConfig, mainnet, ssr: true)
├── public/
│   └── images/    ← add product/auction/campaign images here
├── PROJECT_SPEC.md
├── PROJECT_STATE.md
└── AGENTS.md
```

---

## ACTIVE ISSUES

```
- No product images in public/images/ yet — containers display dark background placeholder
  (intentional; Unsplash CDN images are used from mock-data.ts; add local images before offline presentation)
- /auctions/[id] image gallery thumbnails are placeholder containers only — swipe not implemented
  (acceptable for demo)
- RainbowKit WalletConnect option will fail silently (placeholder projectId) — injected wallets (MetaMask etc.) display correctly in modal

- REGRESSION (Certificate Status Overlay System): TEST-STOLEN-001 and
  TEST-REVOKED-001 were removed from lib/mock-verify.ts CERTIFICATES per
  explicit instruction. /verify?id=TEST-STOLEN-001 now returns
  "CERTIFICATE NOT FOUND" instead of the FLAGGED red warning state.
  This breaks PRESENTATION SCRIPT step 4's TEST-STOLEN-001 demo beat
  (PROJECT_SPEC.md). Accepted knowingly — if this step is needed again
  before a presentation, either re-add a stolen-status certificate to
  CERTIFICATES, or use the new overlay system (lib/certificate-status.ts:
  reportStolen("TEST-GOLD-001")) to demo the new "REPORTED STOLEN" banner
  on an existing certificate instead.
```

---

## NEXT TASKS

Phase 4 — Polish & Harden (remaining):
1. Run full scripted path 3× without touching keyboard (manual test at localhost:3000)
2. Mobile QA pass
3. Animation timing pass — check every transition feels inevitable
4. Update AUCTION_DATES in lib/mock-data.ts to 48h+ past your presentation date before presenting

---

## PRODUCTION GAPS

| Feature | Demo Version | Production Needs |
|---------|-------------|-----------------|
| Certificate verification | lib/mock-verify.ts + 800ms delay | Polygon contract + Alchemy RPC |
| Auction bidding | React useState | Supabase Realtime + Postgres RPC |
| Bid history | Pre-seeded mock array | Supabase auction_bids table |
| Countdown timers | Hardcoded future dates | Supabase auctions.end_time |
| Wallet auth | RainbowKit UI only | SIWE + Supabase session |
| Product data | lib/mock-data.ts | Supabase + Sanity CMS |
| Ownership transfer | Visual badge only | TESTCertificate.sol on Polygon |
| Payments | None | Stripe + webhook handlers |

---

## DEPLOY

```
Vercel URL: [fill in after first deploy]
Last deployed: [date]
Pre-presentation checklist run: [date + "passed" or issues noted]
```
