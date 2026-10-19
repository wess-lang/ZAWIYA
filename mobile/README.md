# ZAWIYA Mobile

A native Flutter client for ZAWIYA, matching the project documentation's
original architecture (Section 5.2: a Flutter app talking to a REST
API) — reusing the existing Next.js app (this repo's root) as that
API instead of standing up a separate backend. Every screen here calls
a route under `../src/app/api/**` exactly as the web app does; auth
uses the same signed, httpOnly session cookie, just persisted by a
native cookie jar instead of a browser.

## What's implemented

Feature parity with the web app (see the root README's "FR coverage"
table for what is and isn't built in ZAWIYA generally):

- Sign in / register / sign out (customer, shop owner, admin roles)
- Marketplace browse with search + category filter, and each shop's own
  page (`/shops/[id]` equivalent)
- Product detail: reviews, ratings, wishlist, add to cart
- Multi-shop cart, grouped by shop, persisted on-device
- Checkout: address book, payment method selection, automatic order
  splitting into one sub-order per shop
- Order tracking with a per-shop status timeline
- Wishlist
- AI Room-Fit: camera/gallery photo → Claude vision room analysis →
  ranked, purchasable furniture recommendations
- Shop Dashboard (shop owner): list a shop, manage products, manage
  orders / update sub-order status
- Admin: shop approvals

Not built here, matching the web app's own documented scope: content
moderation (FR-16), push notifications (FR-17), multi-language (FR-19),
and pixel-level AI furniture compositing (FR-05's "future work" half).

## Running it

You need the backend running first — from the repo root:

```bash
npm install
cp .env.local.example .env.local   # then fill in ANTHROPIC_API_KEY for Room-Fit
npm run dev                         # binds 0.0.0.0:3005, so a device/emulator can reach it
```

Then, from this `mobile/` directory:

```bash
flutter pub get
flutter run
```

### Pointing the app at your dev server

There's no fixed address for "wherever `npm run dev` happens to be
running," so the app's server address is editable at runtime from
**Account → Server**, and persisted on-device. The built-in defaults:

| Target | Default |
|---|---|
| Android emulator | `http://10.0.2.2:3005` |
| iOS simulator / macOS desktop | `http://localhost:3005` |
| Physical device (either OS) | not guessable — set your computer's LAN IP from Account → Server, e.g. `http://192.168.1.4:3005` (find yours with `ipconfig getifaddr en0` on the Mac running `npm run dev`) |

You can also set it at launch without touching the UI:

```bash
flutter run --dart-define=ZAWIYA_SERVER=http://192.168.1.4:3005
```

(Useful for a physical device, or if you've pointed `npm run dev` at a
different port.)

## Platforms

`flutter create` scaffolded iOS, Android, macOS, and web targets. This
was built and verified (this session) with:

- `flutter analyze` — clean
- `flutter test` — passing
- `flutter build macos` — succeeds
- `flutter build ios --simulator` — succeeds
- Run live against the real backend on an iOS Simulator (iPhone 17
  Pro), confirmed working end-to-end: live catalogue data, generated
  SVG product art, theme, navigation.

Android wasn't build-verified in that session because no Android SDK
was installed on the dev machine — install Android Studio (which
installs the SDK) and `flutter build apk` should work unmodified, since
it's the same Dart code and Flutter already generated the `android/`
project.

To run on a physical device: trust your Apple ID / developer
certificate in Xcode (iOS) or enable USB debugging (Android), then
`flutter devices` to confirm it's visible, then `flutter run -d
<device-id>`.

## Architecture notes

- **No new backend.** Every API call in `lib/services/services.dart`
  maps directly onto an existing route in `../src/app/api/**`. Two
  small additions were made to the backend to support a decoupled
  client (the web app doesn't need them because its pages are Next.js
  server components that call `getCurrentUser()`/`readDb()` directly):
  - `GET /api/me` — "who am I?" for session restore on cold start.
  - `GET /api/shops/mine` — the signed-in user's own shop(s) for the
    dashboard entry point, any status (including pending/rejected),
    which the public `GET /api/shops` deliberately excludes.
- **Session**: `lib/core/api_client.dart` wraps Dio with a
  `PersistCookieJar`, so the same httpOnly session cookie the web app
  gets from `/api/auth/login` is stored on-device and sent on every
  request — no separate mobile auth scheme was needed.
- **Cart**: client-side and ephemeral (`lib/providers/cart_provider.dart`),
  persisted to `SharedPreferences` — the mobile equivalent of the web
  app's `localStorage`-backed `CartContext`.
- **Product images**: the catalogue's generated illustrations are SVG
  (`src/lib/productArt.ts`), rendered via `flutter_svg`
  (`lib/widgets/product_image.dart`), which falls back to a plain
  network image for any real photography a shop owner uploads via the
  dashboard's "Image URL" field.
