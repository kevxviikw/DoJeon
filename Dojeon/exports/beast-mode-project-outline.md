# Beast Mode — PIC Project A-to-Z Outline (V3, squad-first)

**Status: PIVOT, revised twice. President proposal drafted.** This supersedes VoiMo (voice-recognition note taker) as Kunwoo's PIC club a-to-z app submission. VoiMo is shelved, not deleted — see `claude/name-and-architecture-plan.md` for its plan, which this pivot reuses parts of.

Full detailed manual (interactive, checkable build items) is published as an Artifact: **Beast Mode Field Manual** — https://claude.ai/code/artifact/bc693ea8-7c52-4dfb-bcb9-b79fab774b5a

Earlier versions are superseded but not deleted, for reference: V1 (original concept) — https://claude.ai/code/artifact/9aba0932-6b56-42f2-8f8a-2eed6b79d44f

A club-president-facing proposal doc ("DoJeon - PIC Club Proposal.docx") condensing all of this into a readable, non-technical pitch was generated and sent to Kunwoo for review before he sends it on for confirmation.

## Proposed name: DoJeon

Kunwoo proposed **DoJeon** (도전, Korean for "challenge") as the public app name, tying directly to PIC's slogan "Challenge Everything, Fear Nothing." "Beast Mode" remains the internal development codename in engineering docs (this outline and the Field Manual artifact) until the name is locked in — still pending an App Store Connect uniqueness check (see Open Decisions).

## Revision history

**V1 → V2:** compared the original manual against a ChatGPT-drafted alternative. Three decisions from Kunwoo drove V2 — no punitive stakes (replaced by squad presence itself, "group challenge of individual goals," 으쌰으쌰-style), squad central / solo deliberately lesser, and bounded mission campaigns instead of open-ended habits. Also adopted the ChatGPT draft's **Adjust** stage (honest, approval-gated replanning) and mid-session blocker capture.

**V2 → V3:** a structured critique of V2 produced five changes:
1. **Push needed an actual activity, not just a status feed.** Added the real session flow (choose task/output → start timed session → squad can optionally join → submit output or record a blocker → see a summary) and explicit async support, since a 3–6 person squad won't always overlap live.
2. **"Deliberately weaker" solo was walked back.** Squad stays the strong recommendation, but solo now runs the complete plan → session → evidence → adjustment loop with nothing crippled. The idea of warning solo users they'd be "grinding alone" was removed outright.
3. **The dashboard was still miss-centric, which fought the app's own stated philosophy.** The Today screen now leads with next deliverable / milestone progress / deadline status / next session, not a streak. History stays accurate but distinguishes four event types — not completed, completed-but-unproven, planned rest, and technically interrupted — instead of one blanket "miss."
4. **Adjust needed explicit rules**, so replanning can't quietly become a way to postpone the goal: check for recovery room before proposing anything, present real tradeoffs only when the goal genuinely no longer fits, require approval, keep both versions visible. Also formalized that a goal must resolve to a checkable deliverable at Forge time, since time-spent and check-ins alone can't measure remaining work.
5. **The cross-squad leaderboard was removed from the roadmap entirely** (not deferred — it contradicted §00's own anti-leaderboard argument), and privacy was turned from an open question into defined rules: status is always visible to the squad, the underlying file is opt-in per submission, live-session visibility is opt-in per session, and leaving a squad or removing evidence never lets someone quietly rewrite what happened.

North star statement carried through V3: **"어려운 목표를 정하고, 같이 몰입하고, 결과물로 증명하고, 끝까지 완주하는 앱"** (decide on a hard goal, immerse in it together, prove it with output, finish to the end).

Kunwoo's call at the end of the V3 review: approve this as the direction, hold the outline here, and prototype one complete mission loop next rather than continuing to expand scope.

## What it is

An extreme-goal planner (극단적 계획 실행 앱), proposed public name **DoJeon**, tied to PIC's slogan "Challenge Everything, Fear Nothing." A user launches a time-boxed mission toward one concrete, checkable deliverable; the app plans it, then keeps them moving through real work sessions inside a small squad grinding on its own missions in parallel — not pure motivational content, not top-down enforcement, and not a leaderboard.

## Core mechanic: Forge → Push → Proof → Adjust

- **Forge** — user states a hard goal with a real deadline, resolved to a checkable deliverable ("publish three completed case studies," not "work on my portfolio"). Claude decomposes it into three tiers: Minimum (doable on the worst day), Target (keeps the mission on schedule), Stretch (the actual beast-mode reach).
- **Push** — squad-based by default, solo-complete when not. A session is: choose task/output → start a timer → squad can optionally join (no video call needed) → submit output or a blocker → see a short squad summary. Async participation is the default, since 3–6 people won't always overlap live.
- **Proof** — evidence per task, labeled self-reported / attached / squad-reviewed, never auto-"verified." Privacy is defined, not open: status is always visible to the squad, the file itself is opt-in per submission, live-session visibility is opt-in per session, and removing evidence later can't rewrite the honest record of what was submitted.
- **Adjust** — compares actual progress to remaining work. One miss never auto-rewrites the mission; the app checks for recovery room first, and only proposes scope/time/deadline tradeoffs — with required approval — if the goal genuinely no longer fits. Both the original commitment and any revision stay visible. Repeated Minimum-only days force a full review.

The **Today screen** leads with next deliverable, milestone progress, deadline status, and next session — not a streak count. History is accurate and one tap away, and distinguishes four event types: not completed, completed-but-evidence-not-submitted, planned rest, and session interrupted — not one blanket "miss."

Real money/punitive stakes and any cross-squad leaderboard are **ruled out entirely** (not deferred — see decision rationale above).

## What carries over from VoiMo vs. what's new

**Carries over as-is:** Apple Developer Program enrollment, Xcode project scaffold, Swift/SwiftUI/iOS 17–18 stack, AVFoundation recording engine (reused for voice proof capture), Claude API integration pattern, key-proxy-via-serverless-function approach.

**New/changed vs. V1:**
- Squad — including live sessions — is core from day one, not a phase-3 differentiator; Supabase (Postgres + Auth) is required from the first real feature.
- Build phases restructured: "Add Stakes" is gone; "Add Squad" now includes the full session flow, and a new "Add Adjust" phase follows it.
- App name still needs a fresh App Store Connect reservation — DoJeon is the proposed name (working codename Beast Mode); run the same uniqueness check that flagged VoiMo/VOMO before locking it in.
- Internal testing (invite PIC members via Users & Access) over external, since distribution is club-only.

## Build phases (paced by milestone, no fixed deadline — move fast)

0. **Carry-over & setup** — confirm reusable Apple/Xcode infra, reserve new name, stand up Supabase project (auth, squads, sessions, check-ins tables).
1. **Prove Forge + Proof, solo** — goal input → AI minimum/target/stretch plan → daily check-in w/ proof, single user, local SwiftData with the four-way event log. Fully usable solo, not just an engineering scaffold.
2. **Add Squad** (the differentiator) — squad create/join, shared check-in feed, the real timed-session flow (task/output → timer → optional squad join → submit output or blocker → summary), an async "recently active" view, and cross-member visibility into proof and miss count per the privacy rules.
3. **Add Adjust** — compare progress to remaining work, check for recovery room before proposing anything, present tradeoffs and require approval only when the goal no longer fits, keep both versions in mission history, force review after repeated Minimum-only days.
4. **TestFlight packaging** — invite PIC members as internal testers, ship first club-installable build, collect squad feedback before the pitch.
5. **Stretch (post-approval)** — push notifications, lock-screen one-tap check-in, Android. No leaderboard on this list.

## Open decisions flagged for Kunwoo

- App Store Connect uniqueness check for "DoJeon" before locking in the name.
- Squad formation: invite-only (recommended, trust-dependent) vs. auto-matched — matters more now that squad is core from day one.
- Squad size default: keep 3–6, or narrow it for a first PIC cohort test.
- Session cadence: fixed daily windows the whole squad shares, or fully flexible per-member scheduling.
- Solo/proof privacy — settled, see the manual's §01.
- Backend lock-in: Supabase over CloudKit sharing for multi-user squad queries — settled, not open.

**Next step (per Kunwoo's call):** stop expanding the outline; prototype one complete mission loop (Forge → Push → Proof → Adjust, solo) end to end. President confirmation on the DoJeon proposal is pending as of this writing.
