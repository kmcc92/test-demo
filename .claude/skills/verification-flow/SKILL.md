---
name: verification-flow
description: Use when working on certificates, provenance, ownership transfers, or public verification in this repo.
---

Follow the existing verification path used by the app and the Stage 6 extension plan.

Current flow:
- Certificate identity is created and stored in the certificate registry, then surfaced through the verify and library views.
- Ownership and status are kept separate from certificate identity; public surfaces should never expose email, wallet_address, or tx_hash.
- The public archive path uses [lib/repositories/supabase/archiveRepo.ts](lib/repositories/supabase/archiveRepo.ts) and the SECURITY DEFINER RPC in [supabase/rls_policies.sql](supabase/rls_policies.sql), not direct purchase rows.
- The public routes are [app/verify/page.tsx](app/verify/page.tsx) and [app/library/page.tsx](app/library/page.tsx); the privacy boundary is enforced by the repo and RLS policy layer.

Stage 6 rules:
- ownership_transfers must remain append-only.
- Keep public anonymous verification separate from private ownership data.
- The attestation model is product hash -> on-chain proof -> tx reference stored in Supabase.
- Keep contract addresses and chain config in env/config rather than hard-coding them into UI.

Relevant files:
- [lib/repositories/supabase/archiveRepo.ts](lib/repositories/supabase/archiveRepo.ts)
- [lib/repositories/supabase/purchaseRepo.ts](lib/repositories/supabase/purchaseRepo.ts)
- [supabase/rls_policies.sql](supabase/rls_policies.sql)
- [app/verify/page.tsx](app/verify/page.tsx)
- [components/library/LibraryContent.tsx](components/library/LibraryContent.tsx)
