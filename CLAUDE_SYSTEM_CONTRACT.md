# CLAUDE SYSTEM CONTRACT — TEST PLATFORM
# Version 2.0 — Rebuilt 2026-07-02

---

## 1. PROJECT VISION

TEST is a multi-designer fashion platform where:
- Independent designers sell blockchain-verified pieces
- Every purchase mints a permanent on-chain certificate
- Physical items carry NFC chips linking to /verify
- Designers provide lifetime service (refurbish/replace/resize) on pieces they created
- Live-streamed fashion competitions with real-time auctions
- A permanent, verifiable library of everything ever sold
- Designers integrate their own websites ("Shopify for designers")

**Current stage:** Single-merchant proof of concept
**Target:** Multi-tenant designer platform

Every architectural decision must be compatible with the multi-designer end state.
When in doubt: "does this work when there are 100 designers instead of 1 merchant?"

---

## 2. PROMPT EXECUTION CONTRACT

### Default: STRICT BUILD MODE
Every prompt is STRICT BUILD MODE unless overridden:
- Read relevant files before writing any code
- Output complete files only — no partial snippets, no pseudo-code
- Stay within declared SCOPE — zero unrequested changes
- If SCOPE is ambiguous, report BLOCKED before writing any code

### READ-ONLY override
Prefix `READ-ONLY:` blocks all file writes for that prompt.
Diagnosis, extraction, and reporting only.

### DIAGNOSIS IS NEVER FINAL OUTPUT
Diagnosis may be reported, but it is always followed by either a fix (if in scope)
or a BLOCKED report. A prompt answered with analysis alone is incomplete.

### BLOCKED reporting format
```
BLOCKED: <one-line reason>
REQUIRED: <what must be decided or expanded before proceeding>
```
Issue BLOCKED before writing any code. Never silently scope-creep.

### Output format
- Modified files only, full content, no truncation
- No explanation prose unless a BLOCKED report is required

### PowerShell environment
- Shell is PowerShell 5.1 (Windows). Chain commands with semicolons: `A; B`
- `&&` is not available. Quote paths with spaces. No Unix-style subshells.

---

## 3. IDENTITY LAYER MODEL

### Core entities
| Entity | Role | Mutability |
|--------|------|------------|
| `certificateId` | Physical item identity, NFC-encoded | Immutable forever |
| `PurchaseRecord` | Ownership state | Append-only |
| `CertificateEvent` | Lifecycle ledger | Append-only |
| `CertificateStatus` | Stolen/lost/active annotation | Last-write-wins |
| `ServiceRequest` | Refurbish/replace/resize workflow | State machine |
| `MarketplaceListing` | Peer-to-peer sale intent | Session-only until Phase 5 |

### Identity rules
- `certificateId` assigned once at product creation (merchant UI); never regenerated at checkout
- A merchant listing deletion NEVER affects certificates, purchase records, or events
- `getCertificateView()` is the single query authority for certificate data in UI —
  UI must never compose `getCertificateFromRegistry + getCertificateStatus +
  getCertificateTimeline` directly in component code

### Drop scenario
When a product is deleted: `certificateId` stays in registry, `PurchaseRecord` stays,
`CertificateEvents` stay, `CertificateStatus` stays. Only the `MerchantProduct` row is removed.

### Multi-designer extension (Phase 7)
- `certificateId` will be designer-scoped: a `designerId` permanently recorded at creation
- Service requests route to the certificate's creating designer, not the current seller
- New code must not hardcode a single `merchantEmail` as the designer identity

---

## PROVENANCE MODEL — PHASE 6 BUILD

> **Status: Phase 6, not Phase 5.** This design is preserved and valid; it is NOT built in Phase 5.
> Its principles (append-only ledger, identity protection, price public / owner anonymous,
> `ArchiveEntry` insulation) already guide the Phase 5 SIMPLE scoped `/library` archive so the later
> expansion is painless. Do not build `ownership_transfers` or the append-based transfer RPC until
> Phase 6 (after real auth + RLS land).

- Ownership becomes an **APPEND-ONLY ledger of transfer events**, not a mutable current-state table.
  History is never destroyed.
- **`ownership_transfers` (new):** `certificate_id`, `from_owner` (null for the original sale),
  `to_owner`, `price`, `occurred_at`, `transfer_type` (flexible text —
  `checkout`/`auction`/`secondary_sale`/`buyback`/`gift`/…, extensible for the future configurable
  designer platform), `payment_ref`, product snapshot (name/image/description at sale time).
- **`purchases` stays** as fast CURRENT-OWNERSHIP state (kept in sync on transfer) so `/collection`,
  `/verify`, and the user-scoped snapshot keep working with minimal change. The ledger is written
  alongside. (Final current-vs-derived decision to be confirmed in the ledger design pass.)
- **Invariant #3 preserved:** every transfer event carries a payment reference.
- **IDENTITY PROTECTION:** the ledger stores owner references, but the PUBLIC archive/view NEVER
  exposes email / wallet / `tx_hash`. Owners render as "a verified collector" by default, or an
  OPT-IN public handle. Prior owners are preserved in the chain as anonymous verified-collector nodes
  (collector → collector → you) so the provenance journey is visible without revealing identity.
- **PUBLIC ARCHIVE (`/library`):** shows every authenticated piece with original sale (first event) +
  latest sale (last event) as the headline, full price history on demand. Public fields: piece, price,
  dates, authenticated status, anonymous/opt-in owner. **Price IS public** (realized value is core to
  the value proposition). Never public: email, wallet, `tx_hash`.
- **Privacy is UX-ONLY** until RLS + real auth + a dedicated public provenance view. Under fake auth +
  anon key the raw tables are readable regardless of UI. The `ArchiveEntry` view model + repo boundary
  make the future swap (raw tables → public view) painless.

---

## 4. ARCHITECTURE LAYERS

### Data flow
```
UI → domain events → repositories → persistence (localStorage → Supabase in Phase 5)
```

### Reactivity primitive
`useDomainSubscription(event, callback)` is the ONLY reactive primitive.
No polling, no `refreshKey`, no `setInterval`, no direct `window.addEventListener` in UI.
All inter-component data sync goes through the event bus.

### Repository pattern
```typescript
const USE_SUPABASE = false; // flip per-repo in Phase 5
export const purchaseRepo = USE_SUPABASE ? supabasePurchaseRepo : localPurchaseRepo;
```

Storage key registry:
```
test_purchases_v1              test_merchant_products_v1
test_certificate_registry_v1   test_certificate_events_v1
test_certificate_status_v1     test_service_requests_v1
```

### Domain events
```typescript
type DomainEvent =
  | "purchases-changed"
  | "merchant-products-changed"
  | "service-requests-changed"
  | "certificate-status-changed";
```

### CQRS evolution
- Phase 3 (marketplace payment gate) — **COMPLETE AND STABLE**
- Phase 4 (localStorage marketplace persistence) — **SKIPPED**
  (Supabase supersedes localStorage persistence; marketplace state remains session-only until Phase 5)
- Projection extraction is unblocked after Phase 5 (Supabase) is STABLE

**Until Phase 5 is STABLE:**
- Do NOT create `/lib/projections/` directory or any new projection modules
- `getCertificateView()` is the intended single projection; `lib/certificate-view.ts`
  is its intended home — if that file does not yet exist, compose the three domain sources
  (`getCertificateFromRegistry`, `getCertificateStatus`, `getCertificateTimeline`) inside
  a single lib/ function before exposing to UI. Never compose them directly in components.

**After Phase 5 is STABLE**, extract these implicit projections:
```
lib/projections/marketplace-view.ts    → replaces market-state.ts
lib/projections/user-library-view.ts   → replaces /library composition
lib/projections/service-request-view.ts
```

---

## 5. FORBIDDEN PATTERNS

```typescript
// ❌ Polling or interval-based sync
setInterval(() => refetch(), 3000)
// ❌ refreshKey forcing re-renders
const [refreshKey, setRefreshKey] = useState(0)
// ❌ Direct localStorage in UI components
localStorage.getItem("test_purchases_v1")
// ❌ Mock data in rendering paths as empty-state fallback
if (!data) return MOCK_FALLBACK
// ❌ Hardcoded certificateId in business logic
if (cert === "TEST-GOLD-001") { ... }
// ❌ Ownership transfer without Stripe payment confirmation
ownership.addOwnership(record) // with no stripePaymentId
// ❌ certificateId generated or mutated at checkout
record.certificateId = generateId()
// ❌ Duplicate storage models for the same entity
// ❌ New code with single-merchant assumptions
if (user.email === "merchant@test.com") { ... }
// ❌ Architecture that requires per-designer code changes
//    (designers are data, not code)
```

---

## 6. PAYMENT RULES

- Stripe gates ALL ownership transfers — enforced since Phase 3
- `paymentIntentId` threads: `stripe.confirmPayment()` → `onSuccess(id)` →
  `handlePaymentSuccess(id)` → `onComplete(session, wallet, id)` → `PurchaseRecord.txHash`
- Idempotency: `listing.status === "sold"` → `completeAuctionTransfer` is a no-op
- Failed or cancelled payment = zero state change anywhere
- `settleAuction()` only marks listings "ended" — it never transfers ownership
- Phase 7: Stripe Connect for designer payouts (platform fee architecture)

---

## 7. TESTING CONTRACT

Framework: Vitest (`npm test`). Test files live in `tests/`.

### The 7 domain invariants (must always pass)
1. Certificate registration is idempotent — same `certificateId` twice → one registry entry
2. Purchase preserves `certificateId` — round-trip through storage unchanged
3. Payment reference preserved — `txHash` written by `addPurchase` matches on read
4. `recordEvent` is append-only — one call → one event; two calls → two events
5. `reportStolen`/`reportLost` never mutates purchase records
6. Registry is sole identity authority — unknown IDs → `isCertificateRegistered()` returns false
7. `deleteMerchantProduct` never removes certificate registry entries or purchase records

### Rules
- Tests use real `lib/` functions against an in-memory localStorage stub — no UI, no Stripe
- `localStorage` cleared before every test via `tests/setup.ts`
- Any change that breaks an invariant test is rejected before merge
- New domain rules added to this contract MUST get a corresponding test

---

## 8. ROADMAP

| Phase | Description | Status |
|-------|-------------|--------|
| 1–3 | Shell, scripted path, supporting pages | Complete |
| 4 | Polish & harden | In progress |
| 4.5 | Domain invariant tests (Vitest) | **In progress** |
| 5 | Supabase — persistence, multi-device, real auth + RLS; simple scoped `/library` archive | Next |
| 6 | Provenance ownership ledger → Polygon on-chain mirror (trustless) + full `/library` history + public anonymous ownership verification | Planned |
| 7 | Multi-designer — accounts, Stripe Connect, storefronts | Planned |
| 8 | Designer service network — refurbish/replace/resize | Planned |
| 9 | Fashion competitions | Planned |
| 10 | Live auctions + stream integration | Planned |
| 11 | Designer website integration (API/widgets) | Planned |
| 12 | Production launch — Quebec Law 25, GST/QST, French, Stripe live | Planned |

### Phase 5 deliverable — SIMPLE SCOPED `/library` ARCHIVE (the leak fix)
A SIMPLE public archive: every authenticated SOLD piece (`purchases` rows with a `certificate_id`),
deduped to the CURRENT owner (one entry per `certificate_id`, latest transfer), via an **`ArchiveEntry`
view model**. Public fields: piece, price, sold date, authenticated status; owner rendered anonymously
("a verified collector"). NEVER exposes email / wallet / `tx_hash`. Privacy is UX-only until RLS + real
auth (documented). The `ArchiveEntry` model lets Phase 6 expand this to full price history with **no
page rewrite**. Design principles come from **PROVENANCE MODEL** (a Phase 6 build) so the later
expansion is painless.

**Phase 5 remaining sequence:** simple scoped `/library` archive (fix the leak) — NEXT → service
requests (9) → marketplace (10) → Supabase Auth (real auth) → RLS. Then Phase 6.

### Phase 6 deliverable — PROVENANCE LEDGER → BLOCKCHAIN → PUBLIC VERIFICATION (in order)
1. **Provenance ownership ledger** — append-only `ownership_transfers`; an append-based transfer RPC
   replacing delete-on-transfer; backfill existing `purchases` as original-sale events; keep `purchases`
   as fast current-ownership state (**Model A**).
2. **Blockchain mirror of the ledger (Polygon)** — makes it trustless.
3. **Full `/library` provenance** — original + latest + full price history.
4. **Public anonymous ownership verification** — anyone who scans an NFC chip (no login) sees the
   verified owner on `/verify`.

**Why deferred, not dropped:** the ledger changes ownership — the most fundamental concept — touching
purchases, transfers, archive, verify, and blockchain; it is a platform evolution, not a persistence
migration. Its identity boundary (private ledger emails → anonymous public archive) is UX-only until
real auth + RLS, so building it AFTER auth + RLS makes the privacy boundary real from day one. It is
the natural blockchain foundation, best designed alongside the on-chain mirror. This is a POC on test
data — no real provenance is lost by deferring, and the `/library` leak has a simple correct fix now.

**Dependency chain (must land in this order):**
real auth (Supabase Auth) → verified ownership identities → blockchain-backed ownership proof
(or equivalent cryptographic proof) → public verification surface (a DEDICATED public view/API
exposing only approved fields, with its own RLS).

**Architecture note:** do NOT expose the private `purchases` table via a public-read RLS policy.
Ownership data (purchases/users) stays private. Public verification reads from a separate public
profile/identity layer + a public verification view/API that surfaces only approved, non-private fields.

- **Shows:** authenticated status; "owned by a verified collector"; a CHOSEN public display name/handle
  (never the login email); provenance chain (designer, sale date, current owner); cryptographic proof link.
- **Must NEVER show:** raw email addresses or any private identity. Public display uses an opt-in handle only.
- **Opt-in:** public profile is explicitly opt-in. A user may remain anonymous while still showing
  "Owned by a verified collector," OR display a public handle, OR (later) a verified brand/store profile —
  without changing the verification system.
- **Why it waits:** until real auth + cryptographic ownership proof, "verified owner" is not actually
  verified (fake auth = anyone can claim any email), so exposing owner info would leak private data and
  display unverifiable claims. The word "verified" must be true before this ships.

### Phase 5 interim — anonymous /verify copy
Once real auth lands (Phase 5), improve the anonymous `/verify` state copy — without exposing identity —
to show: ✅ Genuine registered certificate · ✅ Currently owned by a verified collector, plus non-private
fields (product name, designer, registration date). This replaces the current ambiguous "authenticated
but not purchased" for anonymous viewers.

---

## 9. KNOWN LIMITATIONS (ACCEPTED UNTIL PHASE 5)

- localStorage is per-device — no cross-device or cross-session sync
- Auth is fake — `merchant@test.com` = merchant role, enforced by convention only
- Marketplace listings are session-only — lost on page refresh
- Product images break after deletion — no snapshot taken at purchase time
- `getMockCertificate` fallback in `mock-verify.ts` remains until final cleanup after Phase 6
- `/verify` currently shows "authenticated but not purchased" to anonymous viewers. This is correct
  behavior (ownership is scoped to the logged-in user) but ambiguous UX. Public owner display is
  intentionally deferred to Phase 6 — it is unsafe under fake auth and only meaningful once ownership is
  cryptographically backed. When built, it reads from a dedicated public verification surface, NOT a
  public-read policy on the private `purchases` table.
- The auction transfer RPC currently DELETES the seller's purchase row (destroys history). This will be
  replaced by the append-only provenance ledger in **Phase 6** (see PROVENANCE MODEL). Until then,
  resales erase prior ownership — acceptable for a POC on test data.
- No provenance ledger exists yet — ownership history is not preserved across transfers until Phase 6
  (append-only ledger, then on-chain mirror for cryptographic permanence).

---

## 10. SUPABASE MIGRATION CONTRACT

### Approach
Flip `USE_SUPABASE = true` per-repository in Phase 5. Zero UI changes required.

### Planned table schemas
```sql
purchases           (id, buyer_email, product_id, product_name, certificate_id,
                     tx_hash, price, purchased_at, wallet_address)
merchant_products   (id, type, name, description, price, image, category,
                     certificate_id, created_at, merchant_email)
certificate_registry (certificate_id PK, product_name, registered_at, merchant_id)
certificate_events  (id PK, certificate_id, event_type, actor_type, actor_id,
                     timestamp, metadata JSONB)
certificate_status  (certificate_id PK, status, reported_at, reported_date,
                     reported_location, note)
service_requests    (id PK, certificate_id, type, status, requester_email,
                     created_at, metadata JSONB)
```

### Phase 7 addition (design now, build later)
```sql
designers (id PK, email, display_name, stripe_account_id, created_at)
-- certificate_registry gains designer_id FK → designers.id
-- RLS: each designer sees only their own certificates, products, requests
```
Build RLS into the Phase 5 schema from day one — it is the multi-tenancy groundwork.

---

## 11. BLOCKCHAIN CONTRACT

### Contract design
`AuthCertificate.sol` on Polygon. Hard rule: `getCertificateByCertId()` NEVER reverts —
it returns an empty struct for unknown IDs; the UI handles the "not found" case.

### NFC encoding
NFC chip encodes `certificateId` only (not the token ID).
Chip scan → `/verify?id=CERT-ID` → contract lookup → display result.

### Minting trigger
Auto-mint on purchase via Stripe webhook → Alchemy → `mintCertificate(certId, buyerWallet)`.
Buyer wallet sourced from `PurchaseRecord.walletAddress`. No user action required.
