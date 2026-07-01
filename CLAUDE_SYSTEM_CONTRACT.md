## CQRS EVOLUTION MODEL

Your system is already operating CQRS-lite without formal boundaries.

CURRENT STATE:
Write side:  repositories (command handlers)
Event side:  domain-events.ts (event bus) + certificate-events.ts (log)
Read side:   getCertificateView() is your FIRST and ONLY formal projection

CQRS IS NOT SOMETHING YOU "INSTALL" — it emerges:
UI → becomes dumb (pure render)
Projections → become central (read models)
Events → become coordination layer

==================================================
CURRENT PROJECTIONS
==================================================

FORMAL (exists now):
lib/certificate-view.ts → CertificateView ✅

IMPLICIT (NOT YET EXTRACTED — future targets only):
/library logic     → implicit UserLibraryView (NOT YET EXTRACTED)
/collection logic  → implicit UserCollectionView (NOT YET EXTRACTED)
/verify logic      → implicit VerifyView (NOT YET EXTRACTED)
market-state.ts    → implicit MarketplaceView (NOT YET EXTRACTED)

These are extraction targets for after Phase 4 — they do NOT
exist as projections yet and must NOT be treated as such.

==================================================
CQRS ENFORCEMENT RULE (CRITICAL — HARD BLOCK)
==================================================

Before Phase 4 is complete and explicitly marked STABLE:

BLOCKED:
- Creating /lib/projections/ directory
- Creating any projection module beyond certificate-view.ts
- Introducing any new "view" or "projection" abstraction
- Any refactor that moves toward formal CQRS structure

REQUIRED:
- UI reads certificates ONLY via getCertificateView()
- UI must NOT compose domain sources directly:
  ❌ getCertificateFromRegistry() + getCertificateStatus() + getCertificateTimeline() in UI
  ✅ getCertificateView() only

Any attempt to introduce projections beyond getCertificateView()
before Phase 4 is BLOCKED regardless of how it is framed.

==================================================
UI CQRS RULE
==================================================

UI must read from:
- getCertificateView() for all certificate data
- repository-provided domain selectors for other entities
- useDomainSubscription() for reactivity

UI must NEVER:
- merge registry + status + events directly in component code
- compute derived certificate state manually in components
- import getCertificateFromRegistry, getCertificateStatus, or
  getCertificateTimeline directly into UI files
  (these must only be called inside getCertificateView())

==================================================
TARGET ARCHITECTURE (FUTURE — DO NOT CREATE YET)
==================================================

FUTURE STRUCTURE (DO NOT CREATE UNTIL PHASE 4 STABLE):
lib/projections/
  certificate-view.ts      → move from lib/certificate-view.ts
  marketplace-view.ts      → replaces market-state.ts
  user-library-view.ts     → replaces /library composition
  service-request-view.ts  → replaces UI service request composition

==================================================
MIGRATION RULE
==================================================

Extract read logic into projections ONLY when the underlying
write-side logic is stable and correct.

Gating conditions (ALL must be true before /lib/projections/ created):
- Phase 3 complete: marketplace payment is Stripe-gated
- Phase 4 complete: marketplace state persists across refresh
- Both phases explicitly marked STABLE in this contract

HARD CONSTRAINTS:
- Do NOT modify any code files
- Only update CLAUDE_SYSTEM_CONTRACT.md
- Replace existing CQRS EVOLUTION MODEL section only
- Preserve all other sections unchanged
