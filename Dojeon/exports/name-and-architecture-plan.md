# Voice-Recognition Note Taker — Name & Architecture Plan

Platform decision: **iOS first**, using Kunwoo's iPhone as the primary device. Android to follow later once the iOS version is working.

Distribution plan: **TestFlight only for now** — no public App Store launch yet.

## Name

**Decided: VoiMo** — from "Voice" + "Memo."

**Naming risk to flag before locking this in:** a web search found no exact "VoiMo" match on the App Store, but it did surface **VOMO** ("VOMO: Transcribe Audio to Text" / "AI Voice Memos") — an existing app that's phonetically almost identical to VoiMo and in the exact same category (AI-powered voice memo transcription). There's also **Vomemo** ("Voice To Memo"), a more distant but still adjacent-sounding name. Worth weighing before committing: user confusion when searching, and sitting one letter off a direct competitor. As before, this is a web-search check, not an authoritative registry lookup — the real test is attempting to reserve the name in App Store Connect (Apple checks global uniqueness there), worth doing early since you need that record even for TestFlight-only testing.

### History: earlier name (superseded)

The original front-runner was **Sotongue** — from 소통 (sotong, "communication") + "tongue," bilingual and tied to the Korean PIC club, with runners-up Susurrus, Purl, and Rustle, and a ruled-out list covering the "calm quiet-speech word" and "Vo- + short word" naming patterns. Scrapped in favor of VoiMo.

## Distribution: what TestFlight actually requires

Testing via TestFlight (rather than just running the app from Xcode onto your own phone) means:

- **Apple Developer Program enrollment** ($99/year) — required for TestFlight, even for internal-only testing.
- **An App Store Connect app record**, which means reserving your app name at that point — this is where the name has to be globally unique, even though the app itself stays private and never appears in App Store search.
- **Internal testing** (you + up to 100 people on your developer team) doesn't require Apple's Beta App Review — builds are available shortly after processing. This is probably the right tier for solo/early club testing.
- **External testing** (a public TestFlight link, up to 10,000 testers) requires your first build to pass a lightweight Beta App Review (usually ~24–48h) and a filled-out "what to test" note. Only needed once you're ready to share it beyond a small circle.

(FYI, for just your own phone, Xcode can also install debug builds directly without any of this — free with a regular Apple ID, though the app then needs rebuilding every 7 days. TestFlight is the better call as soon as you want other club members to try it or want builds that don't expire weekly, so your plan to use it makes sense.)

## Build philosophy

Ship in phases so there's always a demoable version, rather than trying to build the full pipeline (lock-screen capture + cloud transcription + AI filing) all at once:

- **Phase 0 — project setup.** Enroll in the Apple Developer Program, create the App Store Connect record (locks in the app name), set up the Xcode project and TestFlight internal testing pipeline.
- **Phase 1 — prove the core loop.** In-app record button (not lock screen yet) → on-device transcription (Apple's Speech framework) → manual folder picker. No AI classification yet.
- **Phase 2 — add the AI filing.** Send the transcript to Claude to auto-suggest (or auto-file into) a folder/subfolder, with a confirm step if confidence is low.
- **Phase 3 — add one-touch lock-screen capture.** WidgetKit Lock Screen widget that deep-links straight into the recording screen.
- **Phase 4 — upgrade transcription quality.** Swap in a cloud STT with built-in filler-word removal (AssemblyAI) for cleaner "uhhh/ummm"-free transcripts; polish accessibility.
- **Phase 5 (stretch) — true one-touch without opening the app UI.** iOS 18 Control Center/Lock Screen Controls + App Intents; add CloudKit sync across devices.

Each phase ships as a new TestFlight internal build, so there's always something installable on your phone to check against the requirements.

## Architecture by component

**Capture (lock screen, one-touch)**
Two viable approaches, in order of build effort:
- *Simple (Phase 3):* A WidgetKit Lock Screen widget acts as a deep link — tapping it opens the app directly into an already-armed recording screen, skipping any navigation. Requires device unlock (Face ID/passcode), which is an iOS privacy requirement for microphone access, not something any app can bypass.
- *Advanced (Phase 5):* iOS 18's Control Center/Lock Screen "Controls" API (`ControlWidget` + `AppIntent`) gets closer to true one-touch. Worth designing the "start recording" logic as a single App Intent from day one so this upgrade is a small change later, not a rewrite.

**Audio engine**
AVFoundation / `AVAudioRecorder`, recording to `.m4a` (AAC). Minimal recording screen: big waveform or level meter, one large Stop button, VoiceOver labels, Dynamic Type support, haptic feedback on start/stop.

**Transcription (accurate, filler-words removed)**
- MVP: Apple's `SFSpeechRecognizer` (Speech framework) — free, on-device/offline-capable, private. Decent accuracy, weaker automatic filler-word stripping.
- Upgrade: **AssemblyAI** — has an explicit filler-word/disfluency removal option plus auto-punctuation, and a generous free tier. Good fit for the "leave out uhhh, ummm" requirement specifically.
- Cleanup pass: feed the raw transcript through **Claude API** (Haiku for cost/speed) to tighten grammar, drop any remaining filler, and produce a clean final message plus a short title.

**AI auto-filing into folders/hierarchy**
Maintain the note folder tree as structured data (folder names, short descriptions, a few recent note titles per folder). For each new note, call the Claude API with the cleaned transcript plus a compact JSON representation of that tree, asking it to return a structured choice: an existing folder path, or a proposed new folder/subfolder, with a confidence score. Below a confidence threshold, show the user a one-tap confirmation instead of silently filing — keeps the "AI magic" trustworthy.

**Storage & sync**
- **SwiftData** (or Core Data) for local-first storage of notes and folders — fastest to build, fully offline.
- **CloudKit** for syncing across the user's own devices — no backend server needed, integrates natively with SwiftData.
- Any API keys (AssemblyAI, Anthropic) should be proxied through a small serverless function (Cloudflare Worker or Supabase Edge Function) rather than embedded in the iOS app bundle, even for a club demo.
- If a real backend becomes useful later (Android support, key management, shared team access), **Supabase** (Postgres + Storage + Edge Functions) is a lightweight next step — keep the note/folder schema simple so migrating is easy.

**UI/UX & accessibility**
SwiftUI throughout. Screens: lock-screen capture → recording screen → transcript review/edit (doubles as the folder-confirmation screen) → folder tree browser. VoiceOver labels on every control, Dynamic Type support, sufficient contrast, haptics confirming key actions (recording started/stopped, note filed).

## Suggested stack summary

- Language/UI: Swift + SwiftUI, Xcode 16+, targeting iOS 17/18
- Capture: AVFoundation + WidgetKit (Phase 3) → App Intents + Control Widgets (Phase 5)
- Local storage/sync: SwiftData + CloudKit
- Transcription: Apple Speech framework (MVP) → AssemblyAI (upgrade)
- Cleanup + auto-filing intelligence: Anthropic Claude API (Haiku, escalate to Sonnet if needed)
- Thin backend for API keys: Cloudflare Workers or Supabase Edge Functions
- Distribution: Apple Developer Program + App Store Connect → TestFlight (internal, then external if needed)
