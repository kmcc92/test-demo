# TEST Platform — CLAUDE.md

## Identity
- Name: TEST
- Stack: Next.js + TypeScript + Tailwind + Framer Motion + Supabase + Stripe
- Local: C:\Users\Kevin\test-demo
- Live: https://test-demo-lyart-one.vercel.app

## Current status
- Stage 5 complete: certificates, status, events, purchases, merchant products, service requests, marketplace listings, real Supabase Auth, and RLS.
- Stage 6 underway: provenance + blockchain-backed verification + public anonymous verification.

## Agent operating rules
- Read the relevant files before editing; do not guess architecture.
- Follow the existing repo pattern: snapshot + hydrate/dispose + version + realtime + index accessors; see lib/repositories/supabase/certificateRegistryRepo.ts as the canonical example.
- Prefer the smallest reversible change that completes the requested task.
- Keep public surfaces privacy-safe; never expose email, wallet_address, or tx_hash on /library or /verify.
- Preserve legacy storage modules as fallback paths until the new repos are fully verified.
- Verify changes with the relevant command before claiming success.

## Working priorities
- Persist-first writes: succeed in Supabase before updating local snapshot or event state.
- Keep the UI synchronous through repo-backed snapshots and index accessors.
- Prefer existing providers and hooks over introducing parallel state paths.
- Avoid broad rewrites when a targeted fix will do.

## Stage 6 scope
- Stage 6: provenance + blockchain verification; see TODO.md for the breakdown.

## Schema summary
- certificates: primary certificate identity rows; referenced by status, events, purchases, listings, and requests.
- certificate_status: one status row per certificate; tracks active/flagged/lost/stolen state.
- certificate_events: append-only event ledger per certificate; used for ownership and status history.
- purchases: private, owner-scoped purchase rows; linked to certificates and payment metadata.
- merchant_products: public catalog rows; linked to merchant identity and certificate registration.
- service_requests: request workflow rows; linked to certificate_id and merchant-facing operations.
- marketplace_listings: public resale listings; linked to certificate_id and seller metadata.
- marketplace_bids: provisional bid rows for auction flow; linked to marketplace_listings.
- ownership_transfers: Stage 6 target table for append-only transfer history.

## Blockchain context
- Intended proof layer: Polygon-compatible certificate verification; keep the current mock path intact until real contracts are deployed.
- Tooling: if Solidity is introduced, start with Foundry unless the team explicitly prefers Hardhat or thirdweb.
- Wallet strategy: use the existing wagmi/viem flow in lib/wallet-config.ts and hooks; do not mix wallet auth with Supabase auth.
- Testnet: prefer Polygon Amoy for staging; keep contract addresses in env/config, not hard-coded in UI.
- Deployment config: store contract addresses in a single config file or env entry so the app can swap between mock, testnet, and mainnet cleanly.

## File map
- lib/repositories/ and lib/repositories/supabase/: repo layer, snapshots, hydration, realtime, and Supabase-backed persistence.
- components/providers/: auth, ownership, wallet, and lifecycle providers.
- hooks/: wallet, auth, marketplace, purchase, and ownership hooks.
- app/: route entry points such as /library, /verify, /auctions, and /merchant.
- supabase/: SQL policies and schema changes that must be applied in the Supabase dashboard.

## Commands
- Dev: npm run dev
- Tests: npm test
- Commit/push: git status ; git add <files> ; git commit -m "msg" ; git push
- Prod deploy: human review first; only deploy to production after explicit approval
- Shell note: this repo is used from PowerShell on Windows, so use ; between commands; bash syntax such as && may fail in some terminals

## Constraints
- Run supabase/rls_policies.sql in the Supabase SQL Editor after schema changes.
- Enable Realtime per table before testing cross-device updates.
- Marketplace bids and provenance are still being migrated; treat them as provisional until completed.
- Backlog items belong in TODO.md or GitHub issues, not in this file.
