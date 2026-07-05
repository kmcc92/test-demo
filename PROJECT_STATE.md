# TEST — Project State (Demo)
# Update this file as the build progresses.
# Load every session alongside PROJECT_SPEC.md.

---

## CURRENT PHASE

Phase 5 — Supabase Migration · **Step 10a complete** (marketplace listings).
(Phases 1–4 complete; see COMPLETED below for their detail.)

---

## PHASE 5 — SUPABASE MIGRATION STATUS

Per-domain migration off localStorage onto Supabase, one repository at a time.
Pattern: repo owns a module-scoped snapshot + `hydrate()`/`version()` + realtime;
a lifecycle provider triggers hydration; the UI reads through backend-hiding
index accessors (`lib/repositories/index.ts`) and stays synchronous; writes are
authoritative persist-first. The Supabase client is lazily dynamic-imported so
importing a repo never loads `lib/supabase.ts` (import-safety).

### Domains migrated → Supabase (cross-device)

| Domain | Repo | Snapshot shape | Notes |
|--------|------|----------------|-------|
| Certificate registry | `supabase/certificateRegistryRepo.ts` | `Map<certId>` (global) | table `certificates`; identity authority |
| Certificate status | `supabase/certificateStatusRepo.ts` | `Map<certId>` (global) | `"active"` = deleted row; LWW |
| Certificate events | `supabase/certificateEventsRepo.ts` | `Map<certId, Event[]>` (global) | append-only ledger; `seenIds` dedupe; INSERT-only realtime |
| Purchases | `supabase/purchaseRepo.ts` | single **current-user** array (private) | email-scoped hydrate + epoch guard; **atomic `transfer_ownership` RPC** for auction transfers |
| Merchant products | `supabase/merchantProductRepo.ts` | flat `Map<id>` (global public catalog) | full CRUD; LWW edits; one-way create→cert coupling |
| Service requests | `supabase/serviceRequestRepo.ts` | flat `Map<id>` (global workflow) | full CRUD; refurbish/replace lifecycle; GLOBAL (no owner column, merchant reads all); `certificate_id` is a FK→certificates |
| Marketplace listings | `supabase/marketplaceRepo.ts` | flat `Map<id>` (global CRUD) | **Step 10a — LISTINGS SCALARS ONLY.** create + status (active→ended/sold); `certificate_id` FK→certificates. **Bids NOT migrated** (marketplace_bids = Step 10b) |

Per-domain flags in `lib/repositories/index.ts` — **all currently `true`**:
`USE_SUPABASE_CERTIFICATES`, `USE_SUPABASE_STATUS`, `USE_SUPABASE_EVENTS`,
`USE_SUPABASE_PURCHASES`, `USE_SUPABASE_MERCHANT_PRODUCTS`,
`USE_SUPABASE_SERVICE_REQUESTS`, `USE_SUPABASE_MARKETPLACE`.
Global `USE_SUPABASE` stays `false` until the last domain flips.

Step 10a notes (marketplace listings — persistence only):
- **Table ≠ TS model.** `marketplace_listings` has the 14 listing scalars +
  `created_at`, but NO column for `bidHistory` (→ separate `marketplace_bids`,
  out of scope), `provenanceDepth`, or `serviceHistoryCount`. The repo persists
  scalars only; it reconstructs `provenanceDepth: 1` / `serviceHistoryCount: 0`
  (the only values ever created) and returns `bidHistory: []` on read. Prices
  round to integers (integer columns).
- **Bids remain a SESSION overlay.** `contexts/MarketplaceContext.tsx` still owns
  per-listing session bids (`sessionBids` map) and composes repo-listings + bid
  overlay (bidHistory + live `currentBid`) for auction consumers. `placeBid` /
  `determineAuctionWinner` / bidding rules UNCHANGED — only WHERE bids are stored
  moved (out of the listings array, since the repo now owns listings). **The
  provider is NOT strictly lifecycle-only** — it retains bid state TEMPORARILY
  until Step 10b migrates `marketplace_bids`. Documented deviation, per decision.
- **Consumer split.** Bid-displaying consumers keep `useMarketplace()` (composed):
  auction detail, BidForm, CreateListingModal, SelectItemModal, auctions grid,
  MarketplacePreview. Pure visibility/status consumers read index accessors
  (`getMarketplaceListings`, `marketplaceVersion`): ExclusiveGrid (visibility),
  account, merchant. No consumer imports the repo directly.
- **Ownership transfer on sale UNCHANGED** — `completeAuctionTransfer` persists
  status→sold (persist-first) then calls the existing `transferOwnershipEntry`
  RPC path. Marketplace only changes LISTING state, never purchases/certificates.
- **Known limitation:** a hard reload / direct deep-link of `/auctions/[id]`
  can 404 during the async hydration window (the page's `notFound()` guard fires
  on the empty pre-hydration snapshot). This is NOT a regression — pre-migration,
  session-only listings 404'd on EVERY reload. The scripted click-through
  (create → click card → detail) works: the provider lives in the persistent
  layout, so it stays hydrated across client navigation. A hydration-aware guard
  is a candidate follow-up (out of scope for persistence-only).

Step 9 notes: service requests are GLOBAL, not user-scoped — the table has no
owner/email column and `/merchant` reads every request via
`getAllServiceRequestsEntry()`; the customer view (`/collection`) is a
client-side filter over owned `certificateId`s. So it reuses the
merchant-products/registry pattern (module-scoped snapshot, unfiltered realtime,
no epoch guard). CRUD dedup = Map replacement keyed by request id (not seenIds).
`ServiceRequestProvider` (lifecycle only) mounts in `app/layout.tsx` under
`MerchantCatalogProvider`. Consumers rewired to index accessors
(`getAllServiceRequestsEntry`, `getActiveServiceRequestEntry`,
`createServiceRequestEntry`, `updateServiceRequestEntry`, `serviceRequestsVersion`)
— they no longer import `lib/service-requests` (except the `ServiceRequest` type)
and no longer manually emit `service-requests-changed` (the repo emits on change).

### Still on localStorage / session (not yet migrated)

- **Marketplace bids** (`marketplace_bids` table exists; still session-only in
  `contexts/MarketplaceContext.tsx` `sessionBids`) — **Step 10b**
- Legacy backends kept as the flag-off path and **must NOT be deleted**:
  `lib/certificate-registry.ts`, `lib/certificate-status.ts`,
  `lib/certificate-events.ts`, `lib/purchase-storage.ts`, `lib/merchant-storage.ts`,
  `lib/service-requests.ts`.

### Auth

Still **fake** (email-based session in `lib/auth-storage.ts`, anon key, no JWT).
Real Supabase Auth + RLS is pending (end of Phase 5).

### Standing verification dependencies (carry-over, re-check each deploy)

- **Realtime must be enabled per-table** in Supabase for live cross-device push:
  `certificates`, `certificate_status`, `certificate_events`, `purchases`,
  `merchant_products`, `service_requests`, `marketplace_listings`. Without it,
  reads/writes still work but changes appear only on next hydrate (reload/login),
  not instantly. **Step 10a TODO (manual): enable Realtime for
  `marketplace_listings`** in Dashboard → Database → Replication before
  cross-device testing. (Step 9's `service_requests` toggle likewise.)
- **Service requests are NOT access-secured** (same as purchases): no owner
  column, RLS off, anon key — any client can read/write any request. The
  customer/merchant split is UX-only until RLS + real auth. Also: `certificate_id`
  is a FK→certificates, so a request for an unregistered cert fails the insert
  (persist-first surfaces it as a caught error, no phantom local state).
- **Purchases are NOT access-secured** until RLS + real auth land. The email
  Realtime/query filter is **UX-only** — a client could still query another
  user's rows via the anon key. Do not treat email scoping as a security boundary.
- **`transfer_ownership` RPC signature is unverified in code** — built against the
  expected param names; a mismatch fails auction settlement with a caught toast
  (regular checkout is unaffected). Verify against the live function.
- **No `updated_at` on `merchant_products`** → catalog edits are last-write-wins
  (safe at single-merchant scale; add `updated_at` + optimistic concurrency for
  Phase 7 multi-designer).
- **Always test in a fresh, non-incognito session on the canonical URL**
  (`test-demo-lyart-one.vercel.app`). A stale browser/dev bundle previously
  masked a working migration and read as a regression — verify the running build
  before diagnosing.

### Remaining Phase 5 sequence

1. ~~**Step 9 — Service requests → Supabase**~~ ✅ done
2. ~~**Step 10a — Marketplace listings → Supabase**~~ ✅ done (listings persisted;
   bids still session)
3. **Step 10b — Marketplace bids → Supabase** (`marketplace_bids`) — removes the
   session-only bid overlay; reduce MarketplaceContext to lifecycle-only
4. **Supabase Auth + RLS** — real identities; flip email scoping into an enforced
   security boundary; enable per-user/per-designer row policies (multi-tenant groundwork)

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

- [x] Certificate Registry — Phase 1
  - lib/certificate-registry.ts (NEW) — primary certificateId identity authority. Same
    storage pattern as certificate-status.ts (localStorage, test_certificate_registry_v1,
    normalized uppercase keys, SSR-safe). Exports registerCertificate (idempotent,
    no-op + console.warn on falsy certificateId), getCertificateFromRegistry,
    listRegisteredCertificates, isCertificateRegistered.
  - Minting event wired into BOTH exclusive-product-creation flows (diagnosis found two —
    components/merchant/AddProductForm.tsx used by /merchant/shop, and the separate inline
    handleAddSubmit in app/merchant/exclusive/page.tsx, which is the primary exclusive-piece
    creation UI). Both call registerCertificate({certificateId, productName}) right after
    addMerchantProduct().
  - lib/mock-verify.ts — DEPRECATED as legacy fallback (frozen, not deleted, no new
    CERTIFICATES entries). CertificateResult gained optional registryUnowned?: boolean.
  - lib/verify-lookup.ts — new identity resolution: registry checked before mock-verify,
    registry result wins with no merging (mock-verify not consulted if registry hits).
    DEVIATION FROM SPEC: the contract specified ownership overlay strictly AFTER identity
    resolution ("only if identity resolved"). Diagnosis found the existing session-purchase
    check runs FIRST and builds a full result directly from the purchase record — this is
    how dynamic certs (mock-data exclusive items bought this session, e.g. TEST-GOLD-005..018)
    verify today, since they exist in neither the registry nor mock-verify CERTIFICATES.
    Moving ownership after identity resolution would make those return not_found despite
    being owned — a regression of existing, working purchase-verification behavior and a
    likely violation of "do not modify ownership... logic." Per established precedent, the
    existing ownership-first check was preserved unchanged; the new registry → mock-verify →
    not_found short-circuit applies only to the not-yet-purchased branch.
  - app/verify/page.tsx — new ResultCard branch for status === "authenticated" &&
    registryUnowned: "AUTHENTIC — UNOWNED" card showing product name + certificate ID and
    "This item has been authenticated but has not yet been purchased." Status overlay
    (stolen/lost banner) still applies on top, unchanged.
  - npx tsc --noEmit passes.

- [x] Certificate Event Layer — Phase 1
  - lib/certificate-events.ts (NEW) — append-only historical ledger, same storage
    pattern as certificate-status.ts (localStorage, test_certificate_events_v1,
    SSR-safe, falsy-certificateId guard on writes). Exports recordEvent (auto id +
    timestamp, no update/delete), getEventsForCertificate / getCertificateTimeline
    (sorted timestamp ascending), getLatestEventOfType, getAllEvents. Defines all 12
    CertificateEventType values; only 5 are wired up this phase (see below) —
    refurbish_requested/replace_requested/refurbished/replaced/listed/delisted/
    transferred remain unwired by design.
  - 5 recordEvent() side effects added (each wrapped in try/catch so existing
    behavior is unaffected if recording fails):
    1. lib/certificate-registry.ts registerCertificate() → "created" (merchant)
    2. components/providers/OwnershipProvider.tsx addOwnership() → "purchased"
       (system) — this is the canonical purchase-write point (no AuthProvider
       purchase write exists; addOwnership is the checkout-success handler per
       STATE OWNERSHIP RULES)
    3. lib/certificate-status.ts reportStolen() → "reported_stolen" (owner)
    4. lib/certificate-status.ts reportLost() → "reported_lost" (owner)
    5. lib/certificate-status.ts clearStatus() → "recovered" (owner)
  - No existing function signatures changed; current-state reads/writes in
    registry/status/purchase systems untouched — events are additive only.
  - npx tsc --noEmit passes.

- [x] My Collection page — new peer route /collection
  - app/collection/page.tsx (NEW) — client-side personal certificate
    ownership dashboard. Fetches useOwnership().purchases, filters to
    items with non-empty certificateId (shop items excluded), enriches
    each with getCertificateStatus, getCertificateTimeline, and
    getCertificateFromRegistry (registry → purchase.productName →
    "Unknown Item" display-name fallback). Splits into activeItems vs
    reportedItems (stolen/lost) — split only, never filters out.
    "Clear Report" calls clearStatus() then bumps a refreshKey to force
    re-read from storage (no optimistic UI). EVENT_LABEL_MAP defined
    once at module scope. Auth guard shows "Sign in to view your
    collection" + Sign In CTA (openAuth) when logged out, rather than
    redirecting.
  - components/layout/Navbar.tsx — added "Collection" to NAV_LINKS as a
    peer entry after "Library".
  - Did not modify /library, /account, /verify, certificate-status.ts,
    certificate-registry.ts, or certificate-events.ts.
  - npx tsc --noEmit passes.

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
