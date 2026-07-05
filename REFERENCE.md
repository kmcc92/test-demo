# TEST Platform — Reference Doc
> Paste relevant sections to Claude Code only when working on that specific area.

---

## Full Vision
Multi-designer platform ("Shopify for designers"): independent designers sell blockchain-verified fashion pieces, every purchase mints permanent on-chain certificate (Polygon), NFC chips link to /verify, designers provide lifetime service (refurbish/replace/resize), live-streamed fashion competitions with real-time auctions, permanent verifiable library of everything ever sold, designers integrate their own websites via API/widgets.

---

## Completed Phase 5 Work (Steps 1–8)

### Certificate Domain
Registry: repo-owned module-scoped snapshot (Map<certId, RegisteredCertificate>), monotonic version, hydrate()/dispose, Realtime subscription. CertificateRegistryProvider mounts at root. getCertificateView() + /verify both read through getRegistryEntry(). USE_SUPABASE_CERTIFICATES = true.

Status: one-to-one snapshot with delete-on-active semantics (active = no row). Authoritative persist-first writes. Coupled-write wrappers (reportStolenEntry/reportLostEntry/clearStatusEntry) in index.ts — status-first authoritative, event best-effort. CertificateAnnotationsProvider hydrates status + events.

Events: append-only Map<certId, CertificateEvent[]> + seenIds Set (load-bearing dedupe). Canonical order: created_at ASC, tie-break by id. INSERT-only Realtime. recordEventEntry routes ALL recordEvent callers.

### Purchases Domain
User-scoped snapshot: single PurchaseRecord[] (CURRENT USER ONLY — not Map<email,...>), snapshotEmail, seenIds, ownedProductIds (derived O(1) isOwned), epoch token for user-switch race guard.

Atomic transfer RPC: transfer_ownership() in Postgres — SECURITY DEFINER, atomic delete-seller + insert-buyer, idempotent on payment_ref. Enforces invariants #2 (certificate_id verbatim) and #3 (non-empty payment ref).

Epoch guard: hydrate(email) increments epoch; stale hydrate results discarded.

Security limitation: email filtering is UX-only under fake auth + anon key. Not access-secured until RLS + real auth.

OwnershipProvider: lifecycle + context bridge (snapshot in repo); same context API so ~9 consumers need zero changes.

### Merchant Products Domain
Flat Map<id, MerchantProduct> snapshot, global unfiltered Realtime (INSERT/UPDATE/DELETE), LWW update model.

merchant-products-changed added to DomainEvent union.

One-way create→cert coupling: product creation registers certificate first; cert-fail aborts product creation; product-fail after cert = orphan cert acceptable.

merchantEmail → merchant_id mapping (multi-tenant groundwork). 13 consumer files rewired to index accessors.

FK cascade verified: no ON DELETE CASCADE from merchant_products to purchases or certificates (invariant #7 safe at DB level).

### /library Archive
Bug fixed: was rendering global merchant catalog to every user. Rebuilt: reads from archiveRepo (global, read-only) returning ArchiveEntry view model. Archive = every purchases row with non-empty certificate_id, deduped to one per certificate_id.

ArchiveEntry fields (public-safe): certificateId, productName, image, description, price, soldDate, authenticated, status. Never exposes: email, wallet_address, tx_hash.

Reads product_image/product_description snapshot columns. Realtime deferred — hydrate-on-mount only.

### /collection Image Snapshot Fix
Purchase repo SELECT now includes product_image/product_description; PurchaseRecord type gains optional productImage/productDescription; /collection image resolution: snapshot first → live product fallback → empty.

---

## Contract Design Decisions (for reference)

### Exclusive Variant Model (Phase 7)
Product = collection of manually-predetermined variants, each individually-certified, mint-on-sale, per-variant price/image/mini-page, "Sold" labels, "X/Y remaining", "Sold Out" flag, merchant-controlled visibility.

### Scheduled Drop Lifecycle (Phase 7)
Optional publish-at / retire-at timestamps per collection, manual override always wins, timers are convenience not rules, drops are not inherently seasonal, EST default timezone, visibility derived at read time (no background job).

### Provenance Ownership Ledger (Phase 6)
Append-only ownership_transfers table, built on real auth + RLS. Design alongside blockchain. Dependency chain: real auth → verified identity → blockchain proof → public verify surface.

### Public Anonymous Ownership Verification (Phase 6)
Dedicated public view/API, not public-read RLS on purchases. Opt-in anonymity tiers.

---

## Full Roadmap
| Phase | Scope |
|-------|-------|
| 5 🔄 | Supabase (service requests, marketplace, auth, RLS remaining) |
| 6 | Provenance ledger, blockchain (Polygon), full /library provenance, public anonymous verification |
| 7 | Multi-designer pivot (Stripe Connect, /designer/[slug]), variant model, drop lifecycle |
| 8 | Designer service network (resize, routing to creating designer) |
| 9 | Competitions (submissions, judging, winner certificates) |
| 10 | Live auctions + stream integration (Supabase Realtime bidding) |
| 11 | Designer website integration (verification widgets, product sync API) |
| 12 | Production launch (Quebec: incorporate, GST/QST, Stripe live, Law 25, French) |

---

## Known Limitations
- localStorage per-device for unmigrated domains (service requests, marketplace)
- Marketplace listings still in useState (lost on refresh)
- Auction transfer RPC currently DELETES seller's purchase row (destroyed history) — replaced by provenance ledger in Phase 6
- Provenance is permanent-in-DB (Phase 5) but not yet trustless (Phase 6 on-chain)
- Shop product certificates: open question whether /shop items carry certificates at all
