# DoJeon — mobile (Expo)

The active client, replacing the native Swift/SwiftUI plan in `../ios/`
(kept for reference, not deleted — see the note at the bottom). Same
backend, same design system, same v0 scope: sign in with Apple → Forge a
mission → Push a session → log Proof → see it on Today.

Built and type-checked in this session — `npx tsc --noEmit` passes clean
and `npx expo export --platform ios` bundles all 1,334 modules with no
errors. That's real verification (unlike the Swift package, this
compiles). It has **not** been run on a device or simulator — that still
needs your first `eas build` or a local dev client.

## Why Expo over native Swift

EAS Build compiles the iOS binary in the cloud and `eas submit` pushes it
to TestFlight directly — no Mac required to get a build onto a phone. The
backend doesn't change at all: every Supabase Edge Function is a plain
HTTPS endpoint, and this app calls the exact same ones the Swift package
was going to.

## Setup

```bash
cd mobile
cp .env.example .env   # fill in your Supabase project URL + anon key
npm install
npx expo start          # scan the QR with Expo Go for a quick look —
                         # Sign in with Apple won't work in Expo Go itself,
                         # it needs a real build (see below)
```

## Testing right now, for free, no Apple account

`npx expo start`, scan the QR with the free **Expo Go** app on your own
iPhone. No build, no signing, no payment. Sign in with **email code**
(not Apple) on the sign-in screen — Sign in with Apple's native module
doesn't run inside Expo Go at all, regardless of whether you've paid
Apple anything; it needs a real custom build. The email flow uses
Supabase's own OTP email delivery, works out of the box once the backend
is deployed, and exercises everything downstream (Today/Forge/Push/Proof)
for real. Sign in with Apple stays in the app and shows itself
automatically once it's actually available (a real dev/production build).

**On the $99/year Apple Developer Program**: verified directly against
Expo's own docs rather than assumed — "All builds that run on an iPhone
device require a paid Apple Developer account for build signing." That's
Apple's rule, applies identically whether the build comes from Xcode or
EAS, and covers every real-device case (a dev-client build, an ad-hoc
build, TestFlight, all of it). The only build type that skips it is an
iOS **Simulator** build — which needs a Mac to run at all, so it doesn't
help here. There's no way around the fee for testing on an actual iPhone
beyond Expo Go; there just wasn't a reason to hit that wall before you
had something worth testing.

## Getting to TestFlight

```bash
npm install -g eas-cli
eas login                          # your Expo account
eas init                           # links this project, writes an EAS project ID into app.json
eas build:configure                # sanity-checks eas.json (I wrote a starting version — let this command validate/fix it)
eas build --platform ios --profile preview
eas submit --platform ios --latest # needs Apple Developer enrollment + an App Store Connect app record first
```

Then in App Store Connect: TestFlight → Internal Testing → add PIC
members by email. No Beta App Review wait for internal testers.

## What's stubbed, on purpose

- **Evidence file upload**: Proof's photo/voice/count picker is UI-only —
  no file actually uploads. Supabase Storage isn't set up in the current
  migration, and neither is `expo-image-picker`/`expo-av`. The check-in
  still submits for real and drives the real evidence-labeling and
  peer-approval logic; only the literal binary attachment is missing.
- **Bundle identifiers** (`com.pic.dojeon` in `app.json`) are placeholders
  — set them to whatever you reserve in App Store Connect.
- **Squad, Adjust, leaderboard, solo-match, mission-end screens** don't
  exist yet — same v0 scope as the design mockup, not a new gap.

## The superseded `../ios/` Swift package

Not deleted, in case native ever comes back into scope, but nothing here
depends on it and it's now dead weight for this build — it was never
compiled, and this Expo app replaces everything it was going to do.
