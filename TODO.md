# TODO

## Stage 6
- Add an append-only ownership_transfers table and wire it into purchase/transfer flows.
- Implement blockchain-backed verification for certificate provenance.
- Add a public anonymous verification view that does not expose private identity fields.
- Move remaining repo scoping from email-based logic to auth.uid where appropriate.
- Finish marketplace bids persistence in Supabase and remove the session-only overlay.
- Tighten service request ownership and role metadata.

## Security follow-ups (from uid-migration audit, 2026-07-05)
- [MED] user_id (auth uid) is anon-SELECTable on public-read tables (marketplace_listings, merchant_products) — move storefront reads behind column-scoped SECURITY DEFINER views/RPCs (archive_public pattern); same pass should stop exposing seller_email/seller_wallet to anon (pre-existing).
- After two-account verification passes: run the CLEANUP block in supabase/rls_policies.sql to drop the DEPRECATED email policies; then consider NOT NULL on purchases.user_id.

## Product hardening
- Add updated_at and optimistic concurrency to merchant_products.
- Add hydration-aware guards for deep links and async loading states.
- Add structured analytics and audit logging for bids, purchases, and transfers.
- Improve test coverage around RLS, transfer ownership, and marketplace bid persistence.

## Ops
- Review and document contract address management for mock/testnet/mainnet environments.
- Add a lightweight admin console for provenance and dispute review if needed.
