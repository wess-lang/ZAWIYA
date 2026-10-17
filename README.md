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

The six seeded partner shops (Olive & Oak, Nordic Nook, Terra & Thread,
Aurum House, Qasr Heritage, Rawabi Home) and their ~27 products are
original placeholders, not real furniture retailers. None of them have
actually partnered with this app, and none use a real retailer's name,
branding, or product photos — Olive & Oak, Nordic Nook, and Rawabi Home
are deliberately styled after three common real-world positions
(mainstream family upholstery, Scandinavian flat-pack, and a big-box
wide-selection retailer) without copying any specific real company's
identity, for the same copyright/trademark reason furnish-jo's README
gives. Swapping in a real catalogue later — once there's an actual
partnership — is a seed-data change (`src/lib/seed.ts`), not a rebuild;
the rest of the app keeps working against whatever is in `data/db.json`.

**Product photos are generated illustrations, not photographs**
(`src/lib/productArt.ts`), for the same reason: taking real retailers'
actual product photography and presenting it as this app's own catalogue
would be a copyright problem, and no reliable, properly-licensed source
of *generic* modern furniture photography was available when this was
built (Unsplash's keyword photo API is discontinued, LoremFlickr was
returning server errors, and Wikimedia Commons' furniture search results
are almost entirely antique museum pieces). Each product instead gets a
small, original, category-accurate flat illustration, colour-matched to
its `colorTags`, written to `/public/products/<id>.svg` the first time
the database seeds. Swapping in real photography once a shop has some to
upload is a matter of setting that product's `image` field to the real
URL — the "Image URL" field on the dashboard's add/edit product form
already does this (leave it blank and a generated illustration is used
instead).

## Mobile app

`mobile/` is a native Flutter client — the Flutter app the project
documentation (Section 5.2) originally specified, built against this
app's existing API (`src/app/api/**`) instead of a separate backend.
See `mobile/README.md` for what's implemented and how to run it
alongside `npm run dev`.

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
- **AI Room-Fit**: calls the Anthropic API directly
  (`src/app/api/rooms/analyze/route.ts`) with Claude's vision input to
  read the room photo, then runs the documentation's own weighted-match
  formula (Section 5.2.3) against the live product catalogue in
  `src/lib/recommend.ts`. See that route's file comment for exactly what
  this does and doesn't do relative to the documented pipeline.
- **Cart**: client-side (`localStorage`) via `CartContext`, since it's
  pre-purchase, ephemeral, per-browser state — same as it would be in a
  real app before checkout.

## Running it

```bash
npm install
cp .env.local.example .env.local   # then fill in ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000 (Next picks the next free port if 3000 is
taken — check the terminal output). The first request creates and seeds
`data/db.json` automatically.

Everything works without an API key **except** AI Room-Fit
(`/room-fit`), which needs `ANTHROPIC_API_KEY` in `.env.local` — get one
at https://console.anthropic.com/. `JWT_SECRET` in that same file should
be set to a long random string before any real deployment; it falls
back to an insecure default for local dev.

### Demo accounts (seeded)

| Role | Email | Password |
|---|---|---|
| Customer | `customer@zawiya.jo` | `customer123` |
| Shop owner (Olive & Oak) | `oliveoak@zawiya.jo` | `shopowner123` |
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
| FR-05 | AI furniture placement | ⚠️ ranked, purchasable recommendations with match scores — not pixel compositing into the photo (future work, see below) |
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
- **AI Room-Fit doesn't composite products into the photo.** It reads
  the room photo and returns a ranked, purchasable product list with
  per-item match scores and reasons — the substance of "pick furniture
  that fits this room," but not the pixel-level placement-into-the-photo
  step the documentation describes (which needs real image segmentation
  and perspective warping). This is called out explicitly as future
  work in the documentation's own "Future Work" section (live AR
  placement).
- **Payments are a selection, not an integration.** Card/CliQ/COD is
  recorded on the order; no real payment gateway is called, matching
  the documentation's own stated contingency ("a simulated payment
  confirmation can stand in for live CliQ integration").
- **Reviews aren't gated to "purchased and delivered."** Any signed-in
  user can review any product, to keep the demo simple. The
  documentation ties this to order status (FR-12); wiring that check in
  is a small addition to `src/app/api/reviews/route.ts`.
