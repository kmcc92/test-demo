---
name: supabase-conventions
description: Use when changing schema, RLS policies, or auth-scoped queries in this repo.
---

Follow the Supabase conventions already encoded in [supabase/rls_policies.sql](supabase/rls_policies.sql) and the repo modules under [lib/repositories/supabase](lib/repositories/supabase).

Rules:
- Re-run [supabase/rls_policies.sql](supabase/rls_policies.sql) after schema changes; RLS is a database-side change and the app cannot enable it for you.
- Realtime must be enabled per table in Supabase before expecting cross-device updates.
- Current policy pattern is: public/global read for storefront and verify flows, owner-scoped access for purchases, authenticated writes for status/events, and merchant-scoped writes for merchant_products.
- The codebase is still moving away from email-based scoping toward auth.uid-based scoping; treat email-based logic as transitional and avoid introducing new email-only patterns.
- Provisional areas per [CLAUDE.md](CLAUDE.md): marketplace bids and provenance are still in migration and should be treated as incomplete until fully wired.

Relevant references:
- [supabase/rls_policies.sql](supabase/rls_policies.sql)
- [lib/repositories/supabase/purchaseRepo.ts](lib/repositories/supabase/purchaseRepo.ts)
- [lib/repositories/supabase/marketplaceRepo.ts](lib/repositories/supabase/marketplaceRepo.ts)
- [components/providers/AuthProvider.tsx](components/providers/AuthProvider.tsx)
