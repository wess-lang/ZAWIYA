# ZAWIYA — Design Your Space

A working build of the ZAWIYA graduation-project concept: an AI-powered
multi-vendor furniture marketplace for Jordan. Customers browse furniture
from independent partner shops in one cart, or photograph a room and get
AI-ranked furniture suggestions sized and styled for it. Shop owners get
a dashboard to manage their catalogue and orders; an admin approves new
shops before they go live.

This is placeholder data, not a real retail integration — see
"Placeholder data" below.

Each shop is its own page with its own menu: `/shops` lists every
partner shop, and tapping one opens `/shops/[id]`, which shows only that
shop's categories as a filter menu and only that shop's products — not
the combined marketplace view.

## Why Next.js instead of Flutter + microservices

The project documentation (section 5.2) specifies a Flutter mobile app
talking to a Node/Express REST API backed by PostgreSQL, with a
separately-deployed AI service. That's the right shape for a four-person
team building toward a graduation deliverable over a semester. For a
single working build produced in one sitting, a Next.js app (App Router,
TypeScript, Tailwind) keeps the same architecture *in spirit* — a
REST-ish API layer (`src/app/api/**/route.ts`) sitting in front of a
data layer that a real database could swap into — without the overhead
of standing up four independently-deployed services and a mobile
toolchain. It also runs as a responsive web app on a phone today, which
a Flutter build wouldn't without a separate build/signing step.

Every functional requirement in the documentation is implemented against
that simpler stack; see "FR coverage" below for the mapping.

## Placeholder data

The four seeded partner shops (Ashley Furniture HomeStore, IKEA,
Shahwan Furniture, Midas Home & Office Furniture — reduced from an
original seven; Marina Home Interiors, Decoration One, and Home Centre
were removed at the requester's direction) use the names of real furniture
retailers that operate in Amman, at the requester's explicit direction
— an earlier version of this seed data used original fictional shop
names specifically to avoid this. **None of these businesses have
actually partnered with this app or reviewed/endorsed it**, and using
a real company's name for an unaffiliated "partner shop" risks
implying a partnership that doesn't exist (a trademark/passing-off
concern, not just a style choice) if this is ever shown to anyone
outside your own testing. Most products under each shop are still
original placeholders — not real product names, prices, or catalogues
from any of these retailers — except Ashley Furniture HomeStore's own
real-photo products (see below).

**`public/brand-logos/` holds actual logo artwork for these four
retailers** (see `mobile/lib/widgets/shop_logo.dart` for the
mapping), included in this repo at the requester's explicit direction
after being flagged as a materially bigger risk than the names alone:
a real company's copyrighted logo, shown next to an unaffiliated
"partner shop" page, reads as an implied endorsement. Any shop whose
logo file goes missing falls back to a plain colour badge instead.

If this app is meant to go beyond local demo use, swap `src/lib/seed.ts`
back to invented shop names (see git history for the prior version),
drop `public/brand-logos/`, or secure an actual partnership first.
Swapping in a real catalogue later — once there's an actual partnership
— is a seed-data change (`src/lib/seed.ts`), not a rebuild; the rest of
the app keeps working against whatever is in `data/db.json`.

**Most product photos are generated illustrations, not photographs**
(`src/lib/productArt.ts`), for the same reason: taking real retailers'
actual product photography and presenting it as this app's own catalogue
would be a copyright problem, and no reliable, properly-licensed source
of *generic* modern furniture photography was available when this was
built (Unsplash's keyword photo API is discontinued, LoremFlickr was
returning server errors, and Wikimedia Commons' furniture search results
are almost entirely antique museum pieces). Each such product instead
gets a small, original, category-accurate flat illustration,
colour-matched to its `colorTags`, written to `/public/products/<id>.svg`
the first time the database seeds.

**105 products carry a real photo instead** (`public/products/real/`,
referenced via a `realImage` field in `src/lib/seed.ts`'s product
definitions — 25 for Ashley Furniture HomeStore, 28 for IKEA, 23 for
Shahwan Furniture, and 25 for Midas Home & Office Furniture), sourced
and supplied by the requester (Ashley) or fetched directly from each
retailer's own live storefront at their explicit direction (IKEA from
ikea.com/jo/en across eight categories; Shahwan Furniture from
shahwan.net across seven categories; Midas from midasfurniture.com
across eight categories, via its public GraphQL product-search
endpoint once its category pages turned out to be JS-rendered) — the
same mechanism this README already anticipated ("Swapping in real
photography once a shop has some to upload is a matter of setting that
product's `image` field to the real URL"), now actually exercised.
**These carry the same risk already flagged above for
`public/brand-logos/`**: they read as real product photography from
real retailers shown on an unaffiliated marketplace, which can imply a
partnership that doesn't exist, if this is ever shown to anyone outside
your own testing. Swap `realImage` back to `undefined` on those entries
(falling back to a generated illustration) or drop `public/products/real/`
before any wider use, same as the brand-logos guidance.

## Mobile app

`mobile/` is a native Flutter client — the Flutter app the project
documentation (Section 5.2) originally specified, built against this
app's existing API (`src/app/api/**`) instead of a separate backend.
See `mobile/README.md` for what's implemented and how to run it
alongside `npm run dev`.

By default the mobile app talks to the Next.js dev server's own API
routes (`http://localhost:3005` — see `mobile/lib/config.dart`). `server/`
is an alternative: a standalone Dart/shelf port of the same REST
contract (`GET/POST /api/products`, `/api/orders`, `/api/rooms`, etc.),
reading and writing the same `data/db.json` the Next.js app seeds —
either backend is a drop-in for the mobile app, with no migration step.
This is closer to the documentation's originally-specified separate
backend process; it exists as an option, not a replacement — the
Next.js API routes remain the one the web app itself uses. Run it with:

```bash
cd server
dart pub get
dart run bin/server.dart   # listens on :3005 by default; PORT=... to change
```

It implements the two newer, Gemini-backed AI routes below
(`/api/rooms/analyze-v2`, `/api/rooms/compose[/refine]`) but not the
original Claude-backed `/api/rooms/analyze`.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Data layer**: a JSON-file-backed store (`src/lib/db.ts`,
  `data/db.json`, gitignored and seeded fresh on first run) standing in
  for PostgreSQL. Read/modify/write happens through `mutateDb()`, so
  swapping in real Postgres queries later touches `src/lib/db.ts` and
  nothing else — the route handlers that call it don't change shape.
- **Auth**: email/password with `bcryptjs` hashing and a signed,
  httpOnly JWT session cookie (`jose`). Three roles: `customer`,
  `shop_owner`, `admin`.
- **AI Room-Fit**: the original route (`src/app/api/rooms/analyze/route.ts`)
  calls the Anthropic API directly with Claude's vision input to read
  the room photo, then runs the documentation's own weighted-match
  formula (Section 5.2.3) against the live product catalogue in
  `src/lib/recommend.ts`. See that route's file comment for exactly what
  this does and doesn't do relative to the documented pipeline. A newer
  pair of routes, `/api/rooms/analyze-v2` and `/api/rooms/compose[/refine]`
  (`src/services/ai-vision/RoomVisionService.ts` and
  `RoomCompositingService.ts`), run on Google's Gemini models instead:
  analysis on Gemini's free tier, and actual pixel-level compositing of
  the matched products into the room photo (image generation, not a
  flat sticker overlay) — see those files' own header comments for
  provider/cost/verification notes, including the one path
  (multi-product compose) that's implemented and type-checked but not
  yet confirmed against a live call.
- **Cart**: client-side (`localStorage`) via `CartContext`, since it's
  pre-purchase, ephemeral, per-browser state — same as it would be in a
  real app before checkout.

## Running it

```bash
npm install
cp .env.local.example .env.local   # then fill in at least one AI key below
npm run dev
```

Open http://localhost:3000 (Next picks the next free port if 3000 is
taken — check the terminal output). The first request creates and seeds
`data/db.json` automatically.

Everything works without any API key **except** AI Room-Fit
(`/room-fit`), which needs one of: `GEMINI_API_KEY` (free tier, powers
the default `/api/rooms/analyze-v2` route and get one at
https://aistudio.google.com/apikey) or `ANTHROPIC_API_KEY` (paid, powers
the original `/api/rooms/analyze` route, get one at
https://console.anthropic.com/) — see `.env.local.example` for all four
variables and what each enables. `JWT_SECRET` should be set to a long
random string before any real deployment; it falls back to an insecure
default for local dev.

### Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Customer | `customer@zawiya.jo` | `customer123` |
| Shop owner (Ashley Furniture HomeStore) | `ashley@zawiya.jo` | `shopowner123` |
| Shop owner (pending approval) | `pendingshop@zawiya.jo` | `shopowner123` |
| Admin | `admin@zawiya.jo` | `admin123` |

Sign in as the pending shop owner to see what a shop looks like before
approval; sign in as admin (`/admin/shops`) to approve or reject it.

## FR coverage (documentation Section 3.3)

| FR | Feature | Status |
|---|---|---|
| FR-01 | Registration & auth | ✅ `/register`, `/login`, bcrypt + JWT session |
| FR-02 | Profile & addresses | ✅ `/profile` |
| FR-03 | Room photo upload | ✅ `/room-fit` |
| FR-04 | AI room analysis | ✅ via Claude vision, see route comment |
| FR-05 | AI furniture placement | ✅ `/api/rooms/compose` generates an edited room photo with matched products placed into it (Gemini image generation), on top of the original route's ranked, purchasable match-score list — see Known limitations for the one unverified path |
| FR-06 | Multi-shop catalogue | ✅ `/shop`, `/shops` |
| FR-07 | Search & filter | ✅ `/shop?q=&category=&shop=` |
| FR-08 | Multi-shop cart | ✅ `CartContext`, grouped by shop |
| FR-09 | Checkout & payment | ✅ card/CliQ/COD selection (not wired to a real gateway, same as the documentation's own contingency plan) |
| FR-10 | Order splitting | ✅ one sub-order per shop at checkout |
| FR-11 | Order tracking | ✅ `/orders`, per-sub-order status timeline |
| FR-12 | Ratings & reviews | ✅ on product pages |
| FR-13 | Shop product management | ✅ `/dashboard/[shopId]/products` |
| FR-14 | Shop order management | ✅ `/dashboard/[shopId]/orders` |
| FR-15 | Admin shop approval | ✅ `/admin/shops` |
| FR-16 | Admin content moderation | ❌ not built — future work |
| FR-17 | Push notifications | ❌ not built — future work (web app; would need a service-worker push setup) |
| FR-18 | Wishlist | ✅ `/wishlist` |
| FR-19 | Multi-language (AR/EN) | ❌ not built — future work, as the documentation itself scoped this to Increment 2 |

## Known limitations

- **Single-process JSON store, not Postgres.** `mutateDb()` does a full
  read-modify-write and isn't safe against truly concurrent writers.
  Fine for a local demo; a real deployment needs the Postgres swap
  described above.
- **AI Room-Fit's pixel compositing (`/api/rooms/compose`) needs a
  billed Google Cloud project**, not just a free Gemini API key — image
  generation has no free tier at all (`RoomCompositingService.ts`
  confirms this directly). Without that, Room-Fit still works end to
  end via the ranked match-score list; only the "see it placed in your
  actual photo" step is unavailable.
- **The multi-product compose call is unverified live.** Compositing
  more than one matched product into the room in a single call is
  implemented and type-checked against the Gemini SDK, but — per that
  file's own header comment — hasn't been exercised against a real API
  call yet; only the single-product path has been confirmed working.
- **Payments are a selection, not an integration.** Card/CliQ/COD is
  recorded on the order; no real payment gateway is called, matching
  the documentation's own stated contingency ("a simulated payment
  confirmation can stand in for live CliQ integration").
- **Reviews aren't gated to "purchased and delivered."** Any signed-in
  user can review any product, to keep the demo simple. The
  documentation ties this to order status (FR-12); wiring that check in
  is a small addition to `src/app/api/reviews/route.ts`.
