# Monetization Setup (RevenueCat + App Store)

One-time dashboard/console work to activate the Coach paywall. Do it in this
order — products must exist in App Store Connect before RevenueCat can import
them.

## How it works

- Coach access = signed in AND (active/trialing subscription OR
  `profiles.comp_access` from a redeemed comp code).
- Client gate: `EntitlementContext.hasCoachAccess` → `CoachGate` renders
  `SignInPrompt` (signed out) / `Paywall` (no subscription) / the Coach.
- Server enforcement: `/api/chat` returns **402 `subscription_required`** when
  unentitled and **429 `monthly_limit`** when the account reaches its monthly spend cutoff or request backstop. The default is $2 for paid, trial, and
  complimentary accounts. Budgets reset at the start of each UTC month.
- RevenueCat webhook keeps `profiles.subscription_status` /
  `subscription_expires_at` in sync; `app_user_id` = Supabase user id.
- `react-native-purchases` is a native module: real purchases work only in
  dev/EAS builds. In Expo Go the Paywall shows a disabled state but comp-code
  redemption still works.

## A. Database

- Apply the `coach_spend_budget` migration before deploying the metered backend.
  It assigns the owner's $5 budget to the matching existing Auth user ID.
  Check that the override row exists at rollout.
- The backend checks recorded spend and increments the admitted request count
  atomically. The backup is 300 monthly requests, or 750 for the owner.
  Each request can finish its last model call after crossing the spend cutoff.
  The backend writes the accumulated cost at request completion. Missing
  token usage is estimated conservatively. If the request crashes before the
  final write, the admission count remains and its claim expires.


- [ ] Run `rhythm-backend/migrations/20260715_monetization.sql` in the
      Supabase SQL editor (adds `profiles` columns, `monthly_usage` table,
      `increment_monthly_usage` function).

## B. App Store Connect

- [ ] Confirm the **Paid Apps agreement** is active (banking/tax complete).
- [ ] Enroll in the **Small Business Program** (15% commission under $1M/yr).
- [ ] Create a **Subscription Group** (e.g. "AI Coach").
- [ ] Add auto-renewable subscriptions in that group:
  - `coach_monthly` — $6.99 / 1 month
  - `coach_annual` — $54.99 / 1 year
  - Each needs display name, description, and review screenshot.
- [ ] Add an **Introductory Offer** to each: Free, 7 days, new subscribers.
- [ ] Create a **Sandbox tester** (Users and Access → Sandbox) for testing.

## C. RevenueCat dashboard

- [ ] Create project + iOS app; add the **App Store Connect shared secret**
      (and an In-App Purchase API key for reliable status).
- [ ] Import products `coach_monthly` and `coach_annual`.
- [ ] Create entitlement **`coach`**; attach both products.
- [ ] Create the **`default` offering** with Monthly + Annual packages.
- [ ] Copy the **iOS public SDK key** → `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
      (EAS env for production builds; local `.env` for dev builds).
- [ ] Add a **Webhook**: URL `https://<railway-host>/api/revenuecat-webhook`,
      Authorization header = the value of `REVENUECAT_WEBHOOK_SECRET`.

## D. Backend env (Railway + `.env.local`)

- [ ] `REVENUECAT_WEBHOOK_SECRET` — mirrors the webhook Authorization header.
- [ ] `COMP_ACCESS_CODES` — comma-separated owner-controlled codes granting
      free Coach access (redeemed via "Have a code?" on the Paywall).

## E. Verify

- [ ] Expo Go: signed out → SignInPrompt; signed in → Paywall (disabled
      purchases); redeem a comp code → Coach unlocks.
- [ ] `POST /api/chat` without entitlement → 402; after redeem/webhook → 200.
- [ ] EAS dev build + sandbox tester: purchase monthly → webhook flips
      `profiles` → Coach unlocks; Restore purchases works after reinstall;
      sandbox expiration → 402 and the UI returns to the Paywall.
