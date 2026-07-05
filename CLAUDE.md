# TEST Platform — CLAUDE.md

## Identity
- **Name:** TEST (luxury fashion authentication → "Shopify for designers")
- **Stack:** Next.js 16.2.6 App Router + TypeScript + Tailwind + Framer Motion + wagmi + viem
- **Live:** https://test-demo-lyart-one.vercel.app
- **GitHub:** https://github.com/kmcc92/test-demo
- **Local:** C:\Users\Kevin\test-demo
- **Shell:** Windows PowerShell (`;` for chaining, no bash here-docs, `Remove-Item -Path -Recurse -Force`)

## Commands
```
# Dev
npm run dev

# Test (Vitest, 22 tests, 7 invariants)
npm test

# Deploy
git add . ; git commit -m "msg" ; git push ; npx vercel --prod

# Kill stale servers
Get-Process node | Stop-Process -Force
```

## Current Phase
**Phase 5 — Supabase Migration (in progress)**
- Steps 1–9 ✅ (certificates, status, events, purchases, merchant products, /library, /collection, service requests)
- Step 10a ✅ Marketplace **listings** persisted (bids still session)
- Step 10b ✅ **Real Supabase Auth** (email/password identity; authz still deferred to RLS)
- **NEXT ⏳ Marketplace bids (`marketplace_bids`)**, then RLS + auth.uid scoping

## Supabase Setup
- **Region:** ca-central-1 (Canada), free tier
- **Env:** `.env.local` + Vercel Production (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- **URL format:** bare `https://<ref>.supabase.co` (not dashboard host, not `/rest/v1/`)
- **Tables:** certificates, certificate_status, certificate_events, service_requests, purchases, merchant_products, marketplace_listings, marketplace_bids
- **RPC:** `transfer_ownership` (atomic, SECURITY DEFINER, idempotent on payment_ref)
- **RLS:** OFF until auth migration
- **Realtime:** must enable per-table in Dashboard → Database → Replication
- **Flags (all true):** USE_SUPABASE_CERTIFICATES, USE_SUPABASE_STATUS, USE_SUPABASE_EVENTS, USE_SUPABASE_PURCHASES, USE_SUPABASE_MERCHANT_PRODUCTS, USE_SUPABASE_SERVICE_REQUESTS, USE_SUPABASE_MARKETPLACE; global USE_SUPABASE stays false

## Repository-Snapshot Pattern (every domain follows this)
- **Repo owns:** module-scoped snapshot + `hydrate()` + `dispose()` + `version()` + Realtime subscription + domain event emission
- **Provider:** lifecycle only (hydrate on mount, dispose on unmount)
- **Consumer:** reads snapshot synchronously via index accessors
- **Global domains** (certs, status, events, merchant products): module-scoped, no user-scoping
- **User-scoped domains** (purchases): single-user array, email-filtered hydration, epoch guard, dispose on logout

## Write Semantics
- **Authoritative persist-first:** Supabase write succeeds BEFORE snapshot/event update
- **Coupled writes** in `index.ts` (not repos): primary authoritative, secondary best-effort
- **23505 handling:** append-only domains (events/purchases) = idempotent success; CRUD (merchant products) = surface conflict unless same logical entity

## Identity Protection Boundary
- Certificate identity ≠ ownership ≠ status annotations — kept distinct
- Public surfaces (`/library`, `/verify`) NEVER expose: email, wallet_address, tx_hash
- Price IS public (core value prop)
- All privacy is UX-only until RLS + real auth (documented in code)

## Auth (REAL — Supabase GoTrue email/password, as of Step 10b)
- Authentication is REAL; **authorization is NOT** (RLS off, repos email-keyed, anon key unrestricted — do not claim user data is protected)
- Merchant role = email allowlist: `merchant@test.com` → merchant, any other email → buyer (derived on session restore, persists through refresh)
- **Demo merchant:** `merchant@test.com` / `merchant123` (pre-created, email confirmed — change pw in dashboard if desired). Customers self-register.
- Email confirmation is DISABLED in the dashboard (Auth → Providers → Email) so signup is instant; code falls back gracefully if re-enabled
- Session owned by Supabase (its own localStorage key + auto-refresh); all auth calls live in `AuthProvider` only; `USE_SUPABASE_AUTH = true`
- Password reset = TODO
- Stripe test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)

## Testing Rules
- ALWAYS test in fresh non-incognito session on canonical URL (stale bundles mask working migrations)
- Enable Realtime per-table before testing cross-device push

## Key Constraints
- `mock-verify` `getMockCertificate` fallback for legacy static IDs (TEST-GOLD-001/002)
- LWW on merchant products — no `updated_at` until Phase 7
- Product creation registers certificate first (durable identity before mutable listing); cert-fail aborts; product-fail after cert = acceptable orphan
