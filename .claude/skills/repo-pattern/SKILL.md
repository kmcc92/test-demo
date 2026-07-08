---
name: repo-pattern
description: Use when creating or modifying data modules, providers, or hooks in this repo.
---

Use the existing repository pattern from [lib/repositories/supabase/certificateRegistryRepo.ts](lib/repositories/supabase/certificateRegistryRepo.ts) and [lib/repositories/index.ts](lib/repositories/index.ts).

Rules:
- Repo owns the module-scoped snapshot, version counter, hydrate/dispose lifecycle, realtime subscription, and domain-event emission.
- Consumers should read through index accessors, not import a repo directly unless the task explicitly requires it.
- Persist-first writes: a Supabase write must succeed before local snapshot or event state is updated.
- Realtime is set up per table inside the repo; see the certificate, status, events, purchase, and marketplace repo modules for the pattern.
- Keep the legacy storage modules as fallback paths until the new Supabase-backed repos are fully verified.
- Providers should handle lifecycle only; hooks and UI should consume snapshot state through the existing providers/index accessors.

Reference implementation:
- [lib/repositories/supabase/certificateRegistryRepo.ts](lib/repositories/supabase/certificateRegistryRepo.ts)
- [lib/repositories/index.ts](lib/repositories/index.ts)
- [lib/repositories/supabase/purchaseRepo.ts](lib/repositories/supabase/purchaseRepo.ts)
