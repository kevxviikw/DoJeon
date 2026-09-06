# DoJeon (dev codename: Beast Mode)

An extreme-goal execution app for PIC club members: state a hard,
time-boxed goal with a real deliverable, get an AI-generated Minimum /
Target / Stretch plan, work it inside a small squad, prove progress with
honest evidence, and replan honestly instead of quietly sliding the
deadline.

This directory is the actual implementation, built from the planning docs
in `../exports/` (`beast-mode-project-outline.md`, the Field Manual
artifact, the club proposal + its Sept 5 2026 tracked-changes addendum,
and `progress-diary.md`). Those four documents are the spec; this is a
faithful build of the current one -- V3 design **plus** the four Sept 5
club amendments (squad-scoped leaderboard, solo matching, peer-approved
check-ins with a removal threshold, and consent-gated mission-end data
collection).

## What's here vs. what's still yours

**Built: everything except the screens.** Every business rule from the
spec -- Forge's feasibility math, Push's session state machine, Proof's
privacy rules, Adjust's recovery-room check and tradeoff proposals, the
peer-approval threshold, the missed-day removal threshold, the
squad-scoped leaderboard, solo matching, and mission-end data collection
-- is implemented, and the parts that can run without Xcode (the core
engine + every Edge Function's logic) are **tested and passing right now**
(see "Verify it works" below).

**Not built, on purpose:** any SwiftUI view, screen layout, navigation
flow, or visual design. The Swift package (`ios/DojeonCore`) stops at
`ViewModels` -- `@Observable` classes exposing state and actions
(`isLoading`, `errorMessage`, `forge(...)`, `submitCheckin(...)`, etc.)
with nothing that renders. Build your screens on top of them.

**One real constraint worth knowing:** this was built on a machine with no
Xcode/Swift toolchain installed. The TypeScript engine (`supabase/functions`)
is genuinely compiled and tested here -- 49 passing tests, see below. The
Swift package was written as carefully as the TypeScript side but has
**not been compiled**. Open it in Xcode first and expect to fix a handful
of small errors (an import, an availability check) before it builds clean
-- report them back for a quick pass if you'd rather not chase them
yourself.

## Repo layout

```
app/
  supabase/
    migrations/0001_init.sql       Postgres schema + RLS policies
    functions/
      _shared/logic/               The core engine -- pure functions, zero
                                    Node/Deno-specific APIs. Runs unmodified
                                    in both the Deno Edge Functions and the
                                    Node test suite.
      _shared/logic/test/          49 tests, `npm test` runs them now
      _shared/{cors,env,gemini,supabaseAdmin}.ts
      forge-plan/                  Forge: goal -> checkable deliverable check
                                    -> Gemini decomposition -> feasibility math
      checkin-submit/, checkin-approve/    Proof + peer approval (amendment C)
      adjust-plan/, adjustment-decide/     Adjust: recovery room -> tradeoffs
                                            -> approval-gated mission change
      squad-create/, squad-join/           Push: squad formation
      session-start/, session-join/,
      session-finish/, squad-activity/     Push: the work-session flow
      squad-removal-sweep/                 Amendment C's missed-day removal
      leaderboard/                         Amendment A, squad-scoped only
      solo-match/                          Amendment B
      mission-end/                         Amendment D, consent-gated
  ios/DojeonCore/                  Swift package: models, networking,
                                    services, view models. No views.
  .env.example
  package.json                     `npm test` runs the engine's test suite
```

## Verify it works

The core engine has zero Node/Deno-specific code, so it runs as-is under
Node's built-in test runner -- no build step:

```bash
cd app
npm test
```

You should see `49 passing`. These tests are the actual spec turned into
assertions -- e.g. "75% of a 4-person squad confirms at exactly 3
approvals," "missed days exactly at one third do NOT trigger removal,"
"rest takes precedence over every other flag." If you change a business
rule, change its test in the same commit.

## Standing up the backend

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli) and a
Supabase project (free tier is fine to start).

```bash
cd app
cp .env.example .env        # fill in real values, never commit .env
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase db push            # applies migrations/0001_init.sql
supabase secrets set --env-file .env
supabase functions deploy   # deploys every function under supabase/functions
```

Schedule `squad-removal-sweep` as a periodic job (Supabase's dashboard has
a Cron section under Edge Functions, or use `pg_cron` to call it) --
that's the amendment-C missed-day check, and it's meant to run on a
schedule, not per-request.

### Why Gemini, not Claude, for the AI call

Forge's plan-decomposition step is the only place this app calls an LLM,
and it's on Gemini specifically to stay inside a free tier for as long as
possible after launch -- this is a club MVP with no revenue yet (see the
proposal's Addendum D). `GEMINI_MODEL` has **no default** in
`_shared/gemini.ts` on purpose: Google's free-tier-eligible Flash lineup
shifts every few months, so check
[ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)
and [pricing](https://ai.google.dev/gemini-api/docs/pricing) right before
you deploy and set it explicitly, rather than trusting a name baked in
months earlier.

### A known gap worth a deliberate decision before launch

`solo-match/index.ts` reads every other member's `goal_profiles` row
directly, which only works if that table's RLS is relaxed beyond
"read own row" (as currently written in the migration) or if the function
is switched to the service-role client. Neither is done here -- pick one
consciously (a `security definer` matching RPC is the cleaner option) before
shipping solo matching. The function's own comment flags this at the call
site.

## Wiring up the iOS app

1. Create a new Xcode App project (SwiftUI, iOS 17+).
2. File > Add Package Dependencies > Add Local... > select `ios/DojeonCore`.
3. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the app target's
   Info.plist (the anon key is meant to be public -- RLS is what actually
   protects data; never put the Gemini or service-role key in the app).
4. Add the **Sign in with Apple** capability to the app target (Field
   Manual §04: "Auth -- Sign in with Apple -> Supabase"), and enable the
   Apple provider in Supabase's Auth settings.
5. Wire up the composition root and SwiftData container in your `@main`:

   ```swift
   import SwiftData
   import DojeonCore

   @main
   struct DojeonApp: App {
       let environment = DojeonEnvironment(config: DojeonConfig.fromInfoPlist()!)
       let container = try! ModelContainer(for: Schema(DojeonSchema.models))

       var body: some Scene {
           WindowGroup {
               // Your views here, reading `environment` and `container`.
           }
           .modelContainer(container)
       }
   }
   ```

6. Build your screens against the `ViewModels` -- e.g.
   `TodayViewModel(modelContext:)`, `ForgeViewModel(forgeService: environment.forge, modelContext:)`.
   Every ViewModel is `@MainActor` and `@Observable`, ready for direct
   SwiftUI binding.

## Mapping back to the Field Manual's build phases

| Phase | Status |
|---|---|
| 0 — Carry-over & setup | Schema + Edge Functions stood up here; Apple Developer enrollment and app name reservation are still yours to do |
| 1 — Prove Forge + Proof, solo | Done (forge-plan, checkin-submit) |
| 2 — Add Squad | Done (squad-create/join, session-*, squad-activity, checkin-approve, leaderboard, solo-match) |
| 3 — Add Adjust | Done (adjust-plan, adjustment-decide, squad-removal-sweep) |
| 4 — TestFlight packaging | Not started -- needs the UI first |
| 5 — Stretch | Not started (push notifications, lock-screen widget, Android) |

Amendments A-D from the Sept 5 2026 club feedback are folded into the
phase-2/3 work above, not treated as a separate later phase.
