# TEST — Project Spec (Demo)
# Load every session alongside PROJECT_STATE.md.
# This file never changes during the build.

---

## WHAT THIS IS

A live presentation demo of TEST — a luxury fashion brand with blockchain authentication.
The goal is a single scripted path through the product that works perfectly every time in front of an audience.

Priority order: **scripted path reliability → UI quality → brand consistency → everything else**

The scripted path must be bulletproof. Everything off the path can be navigable but imperfect.
Infrastructure that isn't visible during the presentation doesn't need to be real.

---

## PRESENTATION SCRIPT (The Critical Path)

This is the exact flow that must work flawlessly. Build and test every step of this before anything else.

```
1. Homepage
   → TEST wordmark loads with gold shimmer (fires reliably, every time)
   → Auctions preview visible below fold with live countdown timers
   → Timers are set minimum 48 hours ahead — never hit zero during a presentation

2. Click EXCLUSIVE (nav or hero CTA)
   → Dark mode page loads with smooth transition
   → Limited edition grid visible, "AUTHENTICATED" stamp on each card
   → Click one item → quick-view drawer slides in
   → Edition number, price, authenticated badge all visible

3. Click AUCTIONS (nav)
   → Auction grid with 3 items, live countdowns, current bids
   → Click the featured auction card
   → Auction detail page: image gallery, bid history, bid input
   → Type a bid amount → click "PLACE BID"
   → Confirmation state: bid appears at top of history, "BID PLACED" toast
   → Current price updates on screen

4. Click VERIFY (nav)
   → Clean input page
   → Type: TEST-GOLD-001 → click VERIFY
   → 800ms loading animation (feels like a real lookup)
   → Gold animated checkmark → AUTHENTICATED result
   → Shows: owner address, mint date, edition, provenance chain
   → Clear input
   → Type: TEST-STOLEN-001 → click VERIFY
   → Red warning state → FLAGGED / REPORTED STOLEN result
   → Demonstrates the security layer

5. Wallet Connect (optional closer)
   → Click "CONNECT" in navbar
   → RainbowKit modal opens cleanly
   → Looks real — no need to actually connect
   → Close modal
```

**Every step above must work in this order, without hesitation, on the first try.**
Build the scripted path first. Add other pages after.

---

## PRESENTATION SAFETY RULES

- Countdown timers: always set end dates at least 48 hours from any possible presentation date. Use a config constant in `lib/mock-data.ts` so they're easy to update.
- Bid state: persists in React state for the session — placing a bid must visually update the page immediately
- Verify flow: the 800ms delay must feel deliberate, not broken — use a smooth loading spinner, not a blank screen
- Page transitions: must fire on every navigation — test the scripted path as a continuous click-through
- Gold shimmer: must fire on every homepage load — not just first load. Use `key` prop or animation controls if needed.
- Never demo on a slow connection without testing first — pre-warm the Vercel deployment before presenting

---

## SYSTEM ROLE

You are the lead engineer and design engineer for TEST.

Build fast. Build clean. Maintain the aesthetic at all times.
When uncertain between a perfect implementation and a working one — ship the working one and note it in PROJECT_STATE.md.

---

## BRAND IDENTITY (Non-Negotiable)

TEST is a luxury fashion brand. The technology is invisible infrastructure.

**Feels like:** Farfetch, Fear of God, Maison Margiela, Acne Studios, Apple
**Never feels like:** a crypto app, a SaaS dashboard, a web3 startup

**Users see:** "AUTHENTICATED" / "CERTIFIED" / "VERIFIED OWNERSHIP"
**Users never see:** "mint NFT" / "connect wallet to proceed" / "web3 asset"

**Never generate:**
- cyberpunk aesthetics or neon gradients
- gamer UI or crypto-first UX
- bouncy animations or excessive motion
- dashboard-heavy layouts
- generic Tailwind templates

---

## DEMO STACK

| Concern | Solution |
|---------|----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS variables |
| Animation | Framer Motion |
| Data | Static mock data in `lib/mock-data.ts` |
| Blockchain | Mocked — fake certificate IDs, simulated verification |
| Auctions | Client-side simulation — countdown timers, hardcoded bids |
| Auth | RainbowKit wallet connect UI only — no SIWE, no session |
| Payments | Skip or Stripe test mode for checkout only |
| CMS | Static JSON / MDX — no Sanity needed |
| Database | None — all data from mock files |
| Deployment | Vercel |

**Do not add:** Supabase, Hardhat, Pinata, Edge Functions, Upstash, SIWE, RLS, real smart contracts.
These are for the production build, not the demo.

---

## DESIGN SYSTEM

### Colors
```css
:root {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8F6F1;
  --bg-dark: #080808;
  --bg-dark-secondary: #111111;
  --gold: #C9A84C;
  --gold-light: #E8C96A;
  --gold-dark: #8B6914;
  --gold-gradient: linear-gradient(135deg, #B8922A 0%, #E8C96A 40%, #C9A84C 70%, #8B6914 100%);
  --text-primary: #080808;
  --text-secondary: #3A3A3A;
  --text-muted: #8A8A8A;
  --border: rgba(0,0,0,0.08);
  --border-gold: rgba(201,168,76,0.35);
  --shadow-gold: 0 0 40px rgba(201,168,76,0.12);
}
```

No hardcoded hex values outside `globals.css`. Always use CSS variable references.

### Typography
- **Display / Wordmark**: `Cormorant Garamond` — weight 300, generous tracking, never bold
- **UI / Body**: `DM Sans`
- **Data / Monospace**: `IBM Plex Mono` — prices, certificate IDs, countdowns, edition numbers

Load via `next/font/google`. Zero layout shift.

### Motion
Cinematic and slow. Never bouncy.

- Page transitions: crossfade 400ms ease-out
- Product reveals: translateY 20px → 0 with fade on scroll
- Text reveals: staggered word/character entrance, 800ms total
- Gold shimmer: single linear-gradient sweep across TEST wordmark on load, 3s, once
- Hover: scale 1.00 → 1.02, 300ms ease — cards and buttons only
- Countdowns: smooth digit flip via CSS transform

**All Framer Motion variants must include `initial`, `animate`, `exit`.**
**All animations must check `useReducedMotion()`.**

### Reference Component
```tsx
"use client";
import { motion, useReducedMotion } from "framer-motion";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const GoldButton = forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ variant = "primary", size = "md", loading = false, className, children, ...props }, ref) => {
    const reduced = useReducedMotion();
    const base = "relative inline-flex items-center justify-center font-['DM_Sans'] tracking-widest uppercase text-xs transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-[--gold] text-[--bg-dark] hover:bg-[--gold-light]",
      ghost:   "bg-transparent text-[--gold] border border-[--border-gold] hover:bg-[--gold]/5",
      outline: "bg-transparent text-[--text-primary] border border-[--border] hover:border-[--gold]",
    };
    const sizes = { sm: "h-9 px-4 text-[10px]", md: "h-11 px-6", lg: "h-14 px-10 text-sm" };
    return (
      <motion.button
        ref={ref}
        whileHover={reduced ? {} : { scale: 1.02 }}
        whileTap={reduced ? {} : { scale: 0.99 }}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading
          ? <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
          : children}
      </motion.button>
    );
  }
);
GoldButton.displayName = "GoldButton";
export default GoldButton;
```

All components: named interface, `forwardRef` where applicable, `cn()`, no inline styles, no `any`.

---

## FILE ORGANIZATION

```
/
├── app/
│   ├── page.tsx                  ← Homepage
│   ├── layout.tsx
│   ├── shop/page.tsx
│   ├── exclusive/page.tsx
│   ├── auctions/page.tsx
│   ├── auctions/[id]/page.tsx
│   ├── verify/page.tsx
│   ├── lookbook/page.tsx
│   └── journal/page.tsx
├── components/
│   ├── ui/                       ← GoldButton, CountdownTimer, AuthBadge, LoadingShimmer
│   ├── layout/                   ← Navbar, Footer
│   ├── shop/                     ← ProductGrid, ProductCard, FilterSidebar, QuickViewDrawer
│   ├── auctions/                 ← AuctionGrid, AuctionCard, BidHistory (mock)
│   ├── verify/                   ← VerifyInput, CertificateResult (all 5 states)
│   └── editorial/                ← CampaignHero, LookbookGrid
├── lib/
│   ├── mock-data.ts              ← ALL demo data lives here
│   ├── mock-verify.ts            ← Certificate lookup simulation
│   └── utils.ts                  ← cn(), formatters
├── styles/
│   └── globals.css
└── public/
    └── images/
```

---

## STATE AUTHORITY (Even in Demo)

Keep these boundaries even with mock data — it prevents spaghetti:

- **`lib/mock-data.ts`** owns all product, auction, and editorial data
- **`lib/mock-verify.ts`** owns all certificate verification logic
- **Components** only display — never contain data logic
- **No data defined inside components** — always imported from `lib/`

---

## FORBIDDEN PATTERNS

```typescript
// ❌ Data defined inside components
// ❌ Hardcoded hex colors outside globals.css
// ❌ any type
// ❌ useEffect for data that can be static
// ❌ Blockchain/wallet jargon visible to users
// ❌ Spring physics or bounce animations
// ❌ Hover-only interactions (no mobile equivalent)
// ❌ next/image skipped in favor of <img>
// ❌ Framer Motion variants without initial/animate/exit
```

---

## MOCK DATA STRATEGY

### `lib/mock-data.ts`
```typescript
// Products — 6–8 items, mix of regular and exclusive
// Auctions — 3 active, varied types (reserve, dutch, buy-now)
// Editorial — 2 campaigns, 1 lookbook, 2 journal entries
// Each item has: id, name, price, images[], category, stock_type, edition (if exclusive)
```

### `lib/mock-verify.ts`
```typescript
// Simulate all 5 certificate states:
// "TEST-GOLD-001" → authentic (active owner, mint date, history)
// "TEST-GOLD-002" → transferred (previous owner shown)
// "TEST-REVOKED-001" → revoked (reason shown)
// "TEST-STOLEN-001" → stolen (warning state)
// anything unrecognized → invalid
// Short delay (800ms) to simulate a real lookup
```

---

## DEMO PAGES

### Homepage
- Full-viewport hero: TEST wordmark, gold shimmer on load, two CTA cards (SHOP / EXCLUSIVE)
- Authentication strip: "Every piece is serialized." / "Every certificate is permanent." / "Every owner is verified."
- Live auctions preview: 3 cards with real countdown timers
- Editorial strip: 2 campaign image cards
- Generous whitespace throughout

### `/shop`
- 3-column product grid (mock data)
- Category filter sidebar (client-side filter, no API)
- Quick-view slide drawer on card click
- "ADD TO CART" — visual only or Stripe test if checkout needed

### `/exclusive`
- Dark mode (`--bg-dark` canvas)
- Same grid as shop, exclusive items only
- "AUTHENTICATED" gold stamp on each card
- Edition numbers (e.g. "003 / 010")

### `/auctions`
- Grid of 3 mock auctions
- Each card: image, current bid, live countdown timer, bid count
- One card is designated the "FEATURED" auction — this is the one used in the presentation script

### `/auctions/[id]` — MUST BE FULLY INTERACTIVE
- Large image gallery (swipeable)
- AUTHENTICATED badge linking to verify page
- Live countdown timer (never hits zero — set 48h+ ahead)
- Bid history list: 4–5 pre-seeded mock bids (wallet addresses, amounts, timestamps)
- Current bid displayed prominently in IBM Plex Mono
- Bid input field with validation (must exceed current bid)
- "PLACE BID" button → triggers:
  1. Button loading state (400ms)
  2. New bid appears at top of history with animated entrance
  3. Current price updates to new amount
  4. "BID PLACED" toast notification (gold, bottom of screen, auto-dismisses 3s)
- All bid state managed in React useState — no backend needed
- Minimum bid increment enforced client-side (current + 5%)

### `/verify` — MUST BE FULLY INTERACTIVE
- Clean single-input page — no clutter
- Input field, VERIFY button, nothing else above fold
- On submit:
  1. Input locks, button shows loading spinner
  2. Exactly 800ms delay (feels like a real blockchain lookup)
  3. Result animates in below input
- Result states (all must work):
  - `TEST-GOLD-001` → AUTHENTICATED — gold checkmark, animated entrance, owner address, mint date, edition "001 / 010", provenance history (2–3 transfers)
  - `TEST-GOLD-002` → TRANSFERRED — softer gold, shows previous + current owner
  - `TEST-REVOKED-001` → REVOKED — amber warning, reason shown
  - `TEST-STOLEN-001` → FLAGGED / REPORTED STOLEN — red warning state, "Contact support" CTA
  - Any other input → CERTIFICATE NOT FOUND — neutral state
- "VERIFY ANOTHER" button resets state cleanly
- The gold checkmark on AUTHENTICATED must be the most satisfying moment in the demo — animate it carefully

### `/lookbook` + `/journal`
- Static editorial content from mock data
- Full-bleed images, cinematic scroll reveals
- Product-linked cards within lookbook

---

## DEMO BUILD PHASES

### Phase 1 — Shell
- Next.js + Tailwind + fonts + CSS variables + globals.css
- `lib/utils.ts`, `lib/mock-data.ts` scaffold (with presentation-safe countdown dates)
- Navbar, Footer, GoldButton, PageTransition
- Homepage hero with gold shimmer

### Phase 2 — Scripted Path (build this before anything else)
The four stops on the presentation script, fully interactive:
- Homepage hero complete
- `/exclusive` page with quick-view drawer
- `/auctions/[id]` with working bid flow (useState, toast, history update)
- `/verify` with all 5 states, 800ms delay, gold checkmark animation
- Test the full script end-to-end before moving to Phase 3

### Phase 3 — Supporting Pages
- `/shop` with product grid, filter sidebar, quick-view
- `/auctions` grid page
- `/lookbook` + `/journal` editorial pages

### Phase 4 — Polish & Harden
- Wallet connect button (RainbowKit, UI only)
- Run the full presentation script 3 times without touching keyboard — fix anything that hesitates
- Mobile QA (in case someone grabs the phone)
- Animation timing pass — every transition should feel inevitable
- Set all countdown dates 48h+ past your earliest possible presentation date

### Phase 5 — Deploy & Pre-Warm
- `vercel deploy --prod`
- Open every page in the scripted path on the live URL
- Run the full script on the deployed version — not just localhost
- Bookmark the starting URL

---

## EXECUTION RULES

1. Work one phase at a time
2. Produce complete files — no pseudo-code
3. After completing each phase, update PROJECT_STATE.md
4. If uncertain about an implementation, pick the simpler working option and note it
5. Never add production infrastructure (Supabase, Hardhat, Edge Functions) — note in PROJECT_STATE.md if something would need it in production
