# TEST Platform — Reference
> Paste only the relevant sections when working on a specific area.

## Vision
TEST is a multi-designer marketplace for blockchain-verified fashion pieces. Designers can sell, service, and prove ownership over time; buyers receive permanent certificates and public verification.

## Current state
- Stage 5 is complete.
- Stage 6 has begun.

## What Stage 5 delivered
- Certificate domain: registry, status, events, and public-safe library views.
- Purchases: user-scoped ownership snapshots, epoch guards, and atomic transfer ownership RPC.
- Merchant products: CRUD-backed catalog with certificate coupling and global catalog reads.
- Service requests: migrated to Supabase with workflow-driven CRUD.
- Marketplace: listings persist to Supabase; bids remain the last session-only layer.
- Auth and authorization: real Supabase Auth plus RLS, with policy enforcement via supabase/rls_policies.sql.

## Architecture conventions
- Repos own snapshot state, hydration, versioning, realtime subscriptions, and event emission.
- Providers handle lifecycle only; consumers read through index accessors.
- Writes are persist-first and should only update local state after Supabase confirms success.
- Public surfaces must never expose email, wallet_address, or tx_hash.

## Stage 6 roadmap
1. Provenance ledger
   - Create an append-only ownership_transfers table.
   - Record every sale, transfer, and repair-related ownership event.
   - Make history queryable from /library, /verify, and merchant dashboards.
2. Blockchain verification
   - Connect certificate ownership to verifiable on-chain proof.
   - Distinguish private ownership state from public proof visibility.
3. Anonymous public verification
   - Offer a public read-only verification endpoint for buyers and third parties.
   - Keep private identity fields out of public responses.
4. Auth and repo hardening
   - Move repo scoping from email-based logic to auth.uid-based logic.
   - Close the remaining service request ownership gap.
5. Marketplace completion
   - Move marketplace bids to Supabase and remove the session-only overlay.
   - Keep auction settlement and bid rules unchanged while making the history durable.
6. Product and operations maturity
   - Add updated_at and optimistic concurrency for merchant_products.
   - Add analytics and audit logging around transfers, bids, and certificate issuance.

## Suggested improvements
- Add server-side role checks and owner metadata to service_requests.
- Add a hydration-aware route guard for auction and library deep links.
- Add structured event logging for purchase, transfer, and verification actions.
- Add a lightweight admin console for provenance and dispute review.
- Improve test coverage around RLS, transfer ownership, and marketplace bid persistence.

## Known limitations
- Marketplace bids are still session-backed until the Supabase migration is completed.
- Service requests remain broader than ideal until ownership and role metadata are tightened.
- Provenance is durable in the database but not yet trustless until blockchain proof is fully wired.
