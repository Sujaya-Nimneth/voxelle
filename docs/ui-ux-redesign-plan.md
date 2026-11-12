# Voxelle — Complete UI/UX Redesign Plan (Astryx)

**Status:** Plan saved, **not implemented**. Ready to be continued by another agent.
**Date:** 2026-11-12
**Target:** [voxelle](../) — Next.js 16 App Router · React 19 · TS strict · Tailwind v4
**Design system:** Astryx Core/CLI `0.7.13` (project install pending). A newer `0.7.14` exists — pin the same version for `@astryxdesign/core`, `@astryxdesign/cli`, and `@astryxdesign/theme-neutral`.

---

## HANDOFF BRIEF (read this first — no prior conversation context needed)

**What this is:** a complete, evidence-based UI/UX redesign plan for Voxelle using Astryx. It is a *plan*, not an implementation. **No `src/` file, `package.json`, or dependency was changed** while producing it. The only repo change is this document at `docs/ui-ux-redesign-plan.md`.

**Start here for the continuation:**
1. Read this whole document. It is self-contained: baseline audit, skill ownership, Astryx migration recipe, UX spec, quality gates, QA plan, perf guardrails, phases P0–P7, and open decisions.
2. Load the **astryx** skill in your session first (it owns all visual/component/token decisions). Then load the other five skills on their non-overlapping axes only (see §0). **Do not load** the visual skills listed as excluded in §0 — they collide with Astryx.
3. **Resolve the 4 open decisions in §10 with the user before P0** (accessibility tier, telemetry-rail treatment, Astryx version pin, and whether implementation is authorized). Do not assume them.
4. Follow §3 in order — it is the authoritative Astryx sequence (install/init → CSS layers → Theme → smoke test → frame → components → cleanup/verify). Every CLI command and component name in it was verified against Astryx `0.7.13` on 2026-11-12; re-run `astryx build`/`astryx component <Name>` if the installed version differs.
5. **Before writing any code**, read the Next.js 16 guide in `node_modules/next/dist/docs/` (per [AGENTS.md](../AGENTS.md)) and the Astryx agent-docs block that `astryx init --features agents` writes.

**Hard constraints to preserve:**
- This is a **presentation-layer migration**. Do not change the NDJSON protocol, `/api/chat` route, tool allow-list, the 6 hooks' responsibilities, or the 47 tests in [tests/](../tests).
- Preserve the `audioLevelsStore` external-store pattern in [src/lib/audioLevels.ts](../src/lib/audioLevels.ts) (per-frame audio must not re-render the tree) — see §8.
- Preserve product honesty: demo/degraded mode labels, simulated-tool labeling, truncation honesty (never spoken), real `.ics` download, privacy note.
- Keep theme light/dark + no-flash script behavior working throughout.

**Validation expected at the end of P7:** `npm test` (47), `npm run lint`, `npx tsc --noEmit`, `npm run build`, plus light/dark/mobile screenshot pass.

**Known gate:** `ux-review` will return `Accessibility: NOT ASSESSED` until the accessibility tier is committed (§5/§6). That is a blocking input, not a pass — don't report it as approved.

**Context that is NOT in this repo:** the game-studio skill scaffolding (`project.yaml`, `design/gdd/`, `production/sprints/`) does not exist here. §4–§7 use those skills for their *method* (section structure, verdicts, test-type classification), not their default file paths. Where a skill expects those paths, either create them or adapt in place — flag this to the user rather than silently skipping a gate.

---

## 0. Skill ownership (no overlap)

Astryx is the single authority for **visual/layout/component/token decisions**. The other skills are applied only on axes Astryx does not decide. Their game-studio scaffolding (GDDs, sprints, `project.yaml`) does not exist in this repo, so each is used for its **method**, not its file paths.

| Skill | Owns (exclusive) | Explicitly does NOT touch |
|---|---|---|
| **astryx** | Component selection, templates/blocks, tokens, theme, page frame, spacing, visual direction, CSS layering, `astryx build/template/component` workflow | — |
| **ux-design** | Information architecture, user flows, states & variants, interaction map, data/ownership, localization, acceptance criteria (wireframe + bullets, `docs.density: terse`) | Colors, radii, component choice, "how it looks" (deferred to Astryx) |
| **ux-review** | Read-only quality gate: completeness, state coverage, input-method coverage, accessibility tier, pattern consistency, AC quality → APPROVED / NEEDS REVISION | Any visual styling verdict |
| **web-design-guidelines** | Accessibility, focus, forms, typography (`…`, curly quotes), content handling, images, navigation/URL state, touch, safe areas, i18n, hydration, anti-patterns | Which component renders the control (Astryx) |
| **qa-plan** | Test-type classification (Logic / Integration / Visual-Feel / UI / Config), automated vs manual split, smoke scope, Definition of Done | Aesthetic sign-off criteria |
| **vercel-react-best-practices** | Re-render, bundle, hydration and rendering performance of the refactor | Visual design |

Deliberately **excluded** to avoid overlapping Astryx: `design-taste-frontend`, `frontend-design`, `ui-styling`, `ui-ux-pro-max`, `design-system`, `design`, `slides`. (All are visual/token/design-system skills.) `team-ui` was not used because this is a single continuous plan, not a multi-agent pipeline.

---

## 1. Current-state baseline (verified against source)

### What exists
- One route: [src/app/page.tsx](../src/app/page.tsx) — a hand-built 3-column grid (`Sidebar` 232px · `main` 1fr · `ActivityRail` 300px) with a custom header, mobile drawers, and modals.
- 3-layer tokens in [src/app/globals.css](../src/app/globals.css) (primitive → semantic → component), true-neutral dark + explicit light via `[data-theme]`, no-flash init script in [src/app/layout.tsx](../src/app/layout.tsx).
- 11 bespoke components + 3 `design/` primitives: `Sidebar`, `ActivityRail`, `ChatLog`, `Composer`, `ImageDropzone`, `Modal`, `MarkdownMessage`, `AudioMeter`, `StatusBadge`, `PermissionWarning`, `BrandMark`, `StatusText`, `ThemeToggle`.
- 6 hooks; logic-heavy: `useChatPipeline` (NDJSON stream, generation token), `useConversations` (localStorage threads), `useSpeechRecognition` / `useSpeechSynthesis`, `useSessionEvents`, `useAssistant` (composition).
- Honest product behaviors worth preserving: real `.ics` download, simulated-tool labeling, truncation honesty, provider-degradation chip, per-frame audio via external store ([src/lib/audioLevels.ts](../src/lib/audioLevels.ts)).
- 47 Node-native tests in [tests/](../tests); lint `eslint`; `npx tsc --noEmit`.

### Baseline audit — `web-design-guidelines` (checked against fetched rules)
Strong existing compliance: `30` `aria-label`s, semantic `<button>`s, skip link, `aria-live` regions, `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat`, `tabular-nums`, `text-wrap: balance`, `color-scheme`, `theme-color`, `maximumScale: 5`, `overscroll-behavior`, `env(safe-area-inset-bottom)`, `prefers-reduced-motion`, explicit `<img>` dimensions + lazy loading, `outline-none` always paired with `:focus-within`/`focus-visible` replacement, no `transition: all`, no `autoFocus`, no raw hex in TSX, no `onPaste`+`preventDefault` blocking.

Genuine findings to fix during the refactor:
- [src/components/Composer.tsx:142](../src/components/Composer.tsx:142), [src/components/Sidebar.tsx:347](../src/components/Sidebar.tsx:347), [src/components/Modal.tsx:126](../src/components/Modal.tsx:126) — `outline-none` on the textarea/select/modal: replacement exists (`:focus-within:border-accent` on the composer, `focus-visible:border-accent` on the select) but a bare `outline-none` is still flagged; Astryx `ChatComposerInput` / `Selector` / `Dialog` own their focus rings.
- [src/app/page.tsx](../src/app/page.tsx) — mobile sidebar/rail open state, theme, panels and dropzone are all `useState` and **not reflected in the URL** → not deep-linkable, no back-button behavior.
- [src/components/ChatLog.tsx:234](../src/components/ChatLog.tsx:234), [src/components/ActivityRail.tsx:183](../src/components/ActivityRail.tsx:183), [src/components/Sidebar.tsx:174](../src/components/Sidebar.tsx:174) — unbounded `.map()` lists; add `content-visibility: auto` (or virtualize) once threads/event logs grow past 50 rows.
- [src/components/ChatLog.tsx:44](../src/components/ChatLog.tsx:44) — `WelcomeSignal` SVG is fine, but the empty state is hand-built; replace with Astryx `EmptyState` + the waveform as its `icon`.
- Typos/typography: keep `…` (already used), curly quotes, `&` where constrained; audit copy during migration.
- [src/components/Sidebar.tsx:110](../src/components/Sidebar.tsx:110) — destructive delete already uses a confirm `Modal`; preserve the confirmation (Astryx `AlertDialog`).

### Baseline audit — `vercel-react-best-practices` (relevant rules)
- `rerender-use-ref-transient-values` ✅ already applied (audio store keeps per-frame values out of React state) — **preserve this**; do not route audio levels through Astryx component state.
- `rerender-memo` / `rerender-derived-state` — `ChatLog`, `Composer`, `Sidebar`, `ActivityRail` are already `memo`'d; keep memo boundaries when swapping internals to Astryx.
- `rendering-content-visibility` — apply to long message/event lists.
- `bundle-barrel-imports` / `bundle-dynamic-imports` — import from `@astryxdesign/core/<Module>` (per-component paths, as the CLI docs show), and lazy-load the settings/command-palette surfaces.
- `client-localstorage-schema` — keep `useConversations` migration/versioning intact.
- `rendering-hydration-no-flicker` — keep the theme-init inline script during the Theme migration (see §3, Step 2).

---

## 2. Redesign goals (ux-design: Purpose & Player Need)

> "A person arrives wanting to talk (or type) to an assistant and to trust what it actually did — without hunting for state across three panels."

Goals, in priority order:
1. **One clear primary flow** — voice or text → streamed answer → visible tool result. The conversation is the screen's one question.
2. **Honesty stays visible** — demo mode, degraded provider, simulated tools, truncated replies and the privacy note must remain first-class, never buried.
3. **The telemetry rail becomes demand-driven** — a permanent 300px column competes with the conversation; collapse to a compact status surface and open detail on demand.
4. **Voice is a first-class, accessible state** — listening / processing / speaking / idle must be perceivable without color alone (screen-reader text + shape + label), and interruption must stay one tap/keystroke.
5. **Keyboard + touch parity** — every action reachable by keyboard; mobile drawers are real dialogs with focus return; all stateful surfaces deep-linkable.
6. **Preserve the waveform** — the product's signature element and single accent color survive as a *brand motif*, re-expressed through Astryx tokens (Astryx owns how).

Non-goals: no backend/auth/session changes, no new providers, no changes to the NDJSON protocol, tool allow-list, or the 47 tests' subject matter.

---

## 3. Astryx foundation & migration (Astryx — exclusive)

Verified via `astryx build`, `astryx template ai-chat`, `astryx docs migration*`, `astryx docs styling-libraries/tailwind`.

### Step 1 — Install & initialize
```bash
npm install @astryxdesign/core@<pin> @astryxdesign/cli@<pin> \
            @astryxdesign/theme-neutral@<pin> @stylexjs/stylex
npx astryx init --features agents --agent codex     # project agent docs into AGENTS.md
npx astryx doctor
```
`astryx init` writes an Astryx-managed block into [AGENTS.md](../AGENTS.md); the existing Next.js 16 rule block stays. Read the generated block before writing any component code. Per the skill: **start every page from a template**, keep its frame/gap/padding, replace content; read `astryx component <Name>` before using a component; before delivery re-read each file and replace raw `<div>/<span>`, `.css`/`@apply`, and hardcoded `#hex`/px with a component or token.

### Step 2 — CSS coexistence (Tailwind v4, exact recipe)
Keep the app's own `@import "tailwindcss"`, `@theme`, and `:root` rules. Add **one** `@layer` line above it and the Astryx stylesheets below it, in [src/app/globals.css](../src/app/globals.css):
```css
@layer reset, theme, base, astryx-base, astryx-theme, components, utilities;

@import "tailwindcss";                       /* unchanged */
@import "@astryxdesign/core/reset.css";
@import "@astryxdesign/core/astryx.css";
@import "@astryxdesign/theme-neutral/theme.css";
/* app @theme + :root rules stay below, unchanged */
```
Do **not** add `tailwind-theme.css` (it remaps the app's own `rounded-*`/`shadow-*` names). `globals.css` must remain the **first** import in [src/app/layout.tsx](../src/app/layout.tsx) (it already is), otherwise layer order inverts silently.

**Token collision check (required):** the app's `:root` variables (`--ground`, `--surface`, `--text`, `--accent`, `--radius-*`, `--gap`, `--fs-*` …) must be audited against Astryx's token names. Any app token sharing an Astryx name must be **renamed** (an app `:root` variable would otherwise change Astryx components). Where the two systems intentionally meet, map app semantic vars → Astryx tokens in one place; delete app component-layer vars (`--radius-*`, `--card-pad`, `--sidebar-w`, `--rail-w`) once Astryx owns layout. This mapping is an Astryx decision.

### Step 3 — Theme
Wrap the app root in `Theme` (`@astryxdesign/core/theme` + `neutralTheme`), with `mode` in app state. Replace the `data-theme` + MutationObserver mechanism in [ThemeToggle.tsx](../src/components/design/ThemeToggle.tsx) with a `Switch`/`Selector` in a settings `Popover` that sets `mode` on `Theme` (not body classes). Keep the no-flash inline script during the transition, scoped so it does not fight `Theme`; verify light + dark + system before any surface migration.

### Step 4 — Foundation smoke test
Render the Astryx foundation smoke page, confirm primitives keep their padding and focus rings in both modes. Only then migrate surfaces.

### Step 5 — Frame first
`astryx build "<idea>"` returned **`ai-chat`** as the matching page template (with `ai-chat-landing` for the zero-state and `shell-side-nav` as the alternative frame). Scaffold from it, keep its frame/gap/padding, replace content:
- `AppShell` (owns skip link, `<main>`, mobile nav drawer, focus return) → replaces the hand-built `.app-shell` grid and the two custom mobile drawers.
- `SideNav` → conversation threads; `TopNav` → brand, provider/status chip, theme/settings trigger.
- `Layout` / `LayoutPanel` → the three zones. The **right telemetry zone becomes an Astryx `Drawer`/`BottomSheet`** on demand (Astryx decides which), with a compact status surface always visible.
- `CommandPalette` → thread search + "New conversation" + quick actions (replaces ad-hoc global `/` handler scope, keeps `/` focus for the composer).

### Step 6 — Component replacement map (Astryx owns all rows)

| Current | Astryx | Notes |
|---|---|---|
| `Composer` (textarea + 4 icon buttons) | `ChatComposer`, `ChatComposerInput`, `ChatComposerDrawer`, `ChatSendButton`, `ChatDictationButton`, `IconButton` | `onSubmit`/`onStop`/`isStopShown`/`value`/`onChange`/`placeholder`/`status`/`drawer`/`footerActions`/`sendActions`; attachment dropzone → `drawer` slot; mic → `ChatDictationButton` / `IconButton`; keep Enter-to-send, Shift+Enter, `/`-to-focus via `useChatComposerContext()` |
| `ChatLog` (messages) | `ChatLayout`, `ChatMessageList`, `ChatMessage`, `ChatMessageBubble` (`filled`/`ghost`), `ChatMessageMetadata`, `ChatSystemMessage`, `Markdown` (`isStreaming`), `useStreamingText` | Keep the existing NDJSON pipeline; feed accumulated text to `useStreamingText`, `isStreaming` from `message.isStreaming`; `Markdown` replaces the zero-dependency `MarkdownMessage` (keep http(s)-only link behavior via `onLinkClick`); truncation + retry → `ChatSystemMessage`/`Banner` with an `aria-live` label |
| `ChatLog` empty state (welcome + waveform + suggestions) | `ai-chat-landing` template + `EmptyState` | Waveform becomes the `icon` (decorative, `aria-hidden`); 4 suggestions → `EmptyState.actions` / `ClickableCard` grid; keep the honest demo/live mode line |
| `ChatLog` "Latest" button | `ChatLayoutScrollButton` | Replaces the fixed-position custom button |
| `ActivityRail` tool cards | `ChatToolCalls` + `Card` + `Badge` + `Button` | Map `ToolEvent` → `calls[]` (`name`, `status`, `target`, `duration`, `resultDetail`); **preserve** the `.ics` download action and the "simulated" label |
| `ActivityRail` event log | `ListItem` / `MetadataList` + `Timestamp` | Humanize subtitles at the data layer, not in JSX |
| `StatusBadge` / `StatusText` | `Badge` + `Text` + `Icon` | Keep provider / degraded-reason honesty |
| `PermissionWarning` | `Banner` (dismissible) + `Toast` for transient STT/TTS errors | `aria-live="polite"` |
| `Sidebar` conversation rows | `SideNav` + `ListItem` + `MoreMenu` | Selection driven by `activeConversationId`; delete → `MoreMenu` → `AlertDialog` (keep confirmation) |
| `Sidebar` capabilities/settings modals | `Dialog` + `Popover` + `Switch` + `Selector` + `Slider`/`RadioList` | TTS voice, rate, pitch, auto-speak |
| `Modal` | `Dialog` / `AlertDialog` | Delete the hand-rolled focus trap/portal; Astryx owns it |
| `ImageDropzone` | `FileInput` + `ChatComposerDrawer` + `Token` (attachment chip) | Keep client downscaling + server re-validation; keep paste (`⌘V`) |
| `BrandMark`, `SignalStrip`, `AudioMeter` | `Icon`/`Avatar` for the mark; **custom waveform stays** | Only `audioLevelsStore` subscribers re-render per frame — do not lift into Astryx state |
| `ThemeToggle` | `Switch` in settings `Popover` | See Step 3 |

### Step 7 — Blocks to scaffold for gaps
`astryx template <Block>` for: `ChatComposerFullFeatured` / `ChatComposerAttachments` / `ChatComposerStreaming`, `ChatMessageListFullFeatured`, `ChatToolCallsToolCallsWithNodes`, `EmptyStateActions`, `AppShellTopNavWithSideNav`, `PopoverSettingsPanel`, `CommandPaletteAsyncSearch`. Read `astryx component <Name>` for every component used.

### Step 8 — Cleanup & verification (Astryx)
After each surface: remove leftover Tailwind color/px classes, arbitrary hex and one-off hover colors; run `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`; at least one light + dark browser screenshot pass per migrated surface; verify command palette focus return, `SideNav` collapsed/expanded/mobile, dialogs in a real browser (Popover/dialog APIs may need test shims). **Read the Next.js 16 guide in `node_modules/next/dist/docs/` before writing code** (per [AGENTS.md](../AGENTS.md)) — this version has breaking changes.

---

## 4. UX specification (ux-design — `docs.density: terse`)

### Screens / flows in scope
`workspace` (main chat), `empty-workspace` (zero state), `settings` (voice + theme), `capabilities`, `confirm-delete`, `session-activity` (detail panel), `mobile-navigation`.

### Information architecture
```
AppShell
├─ TopNav        brand · provider/degraded status · theme/settings · activity toggle
├─ SideNav       new conversation · thread list (grouped by recency) · workspace footer
├─ Main          (empty state | transcript) + persistent ChatComposer
└─ Detail drawer session signal · tool activity · event log · privacy note (on demand)
```

### Layout Specification (zones only — visual treatment is Astryx's)
| Zone | Content | Priority |
|---|---|---|
| A · Header | identity, honest status, global controls | secondary |
| B · Left nav | threads, create, capabilities/settings entry | secondary |
| C · Center | the conversation (one question), composer | **primary** |
| D · Right | live signal summary; detail on demand | tertiary / demand |

### States & variants (per screen)
- **Empty:** waveform invitation + 4 real flows + demo/live line. No broken UI for `messages=[]`, `conversations=[]`, `events=[]`.
- **Populated:** alternating turns, grouped assistant bubbles, metadata (timestamp / "You" / provider), streaming caret, tool cards.
- **Loading:** `processing` placeholder at real text size (no shimmer); `ChatComposer` `status`/disabled while a request is in flight (send stays enabled until the request starts).
- **Streaming:** `useStreamingText` + `Markdown isStreaming`; caret; "Stop"/interrupt always available.
- **Truncated / interrupted:** explicit partial-reply banner + Retry; **never spoken aloud**.
- **Degraded / demo:** header chip states the reason; empty-state mode line; no fictional "Live" claims.
- **Voice:** idle / listening (interim transcript) / processing / speaking; each has a **non-color** cue (label + shape) and a screen-reader announcement.
- **Error:** STT permission error → `Banner` with the fix/next step; TTS unsupported → visible notice; network error → retry.
- **Unsupported browser (Firefox):** text-only mode with visible notice; mic disabled with a reason.
- **Empty tool/event log:** "No actions currently running" / "Awaiting input" (already honest — keep).
- **Mobile:** SideNav → mobile drawer; detail → `BottomSheet`; composer stays reachable with safe-area padding and no covered focus.

### Interaction map
| Action | Keyboard | Touch / voice | Result |
|---|---|---|---|
| Focus composer | `/` | tap | caret in input |
| Send | `Enter` | Send button | request starts, playback silenced |
| New line | `Shift+Enter` | — | newline |
| Interrupt speech / stream | `Esc` or Mute | tap mic / Mute | TTS + stream stop immediately |
| Start/stop dictation | `⌘⇧.` (or a documented shortcut) | mic button | STT toggles, interim transcript |
| Switch thread | `⌘K` → type | tap row | conversation swaps, focus to composer |
| New conversation | `⌘K` → "New" | `+` button | empty state |
| Delete thread | `⌘K`/MoreMenu → confirm | long-press/menu → confirm | `AlertDialog` → delete (undo window if feasible) |
| Open activity | `⌘I` | Activity button | detail drawer, focus moves in, `Esc` returns focus |
| Open settings | `⌘,` | gear | `Popover`, theme/voice controls |
| Copy / read aloud | hover-reveal actions, keyboard-focusable | tap | `Toast` feedback / TTS |

### Data requirements (owner ≠ UI)
| Displayed element | Source / owner | Null handling |
|---|---|---|
| `messages[]`, `toolEvents[]`, `sessionEvents[]` | `useChatPipeline` / `useSessionEvents` (hooks own state) | empty-state copy |
| `conversations[]`, `activeConversationId` | `useConversations` (localStorage, versioned) | "New conversation" placeholder |
| `status`, `interimTranscript` | `useAssistant` from STT/TTS hooks | idle labels |
| `activeProvider`, `model`, `isDegraded`, `degradedReason` | `/api/chat` `meta` event | demo-mode line |
| Audio levels | `audioLevelsStore` (external store) | `IDLE_LEVELS` |
| Waveform | presentational, decorative | static idle bars |
| `.ics` payload | `ToolEvent.ics` (server) | hide download action |

### Transitions & animations
Enter/exit for messages, drawer, dialogs, banner and bottom sheet — all via Astryx motion tokens; `prefers-reduced-motion` disables decorative loops and travel (already in globals.css — keep). Autoplay waveform >5s must have a pause/stop control. Every animation interruptible by user input.

### Localization considerations
All labels externalizable; budget **+40% expansion** for header chip, suggestions, tool-card labels and the privacy note; use `Intl.*` for timestamps/durations (already done); brand `Voxelle`, tool names and `.ics` wrapped `translate="no"`; RTL leaves the waveform mirrored-safe.

### Acceptance criteria (workspace)
1. A first-time visitor can start talking or send the "Schedule an event" suggestion and see a downloadable `.ics` result without scrolling or opening a panel.
2. Every one of idle/listening/processing/speaking is identifiable with color disabled and announced to a screen reader.
3. Keyboard-only: focus composer, send, interrupt, switch thread, open/close activity and settings, confirm delete — all without a mouse; focus always visible and returns from dialogs/drawers.
4. Demo/degraded/simulated/truncated states are labeled in the UI and truncated replies are never spoken.
5. Mobile (375px): no horizontal scroll, composer visible above the keyboard with safe-area padding, both panels reachable and closable.
6. Light + dark render without token collisions; no raw hex/px remains in migrated TSX.
7. Long threads (100+ messages) stay responsive (no per-keystroke re-render of the transcript; audio meter isolated).
8. `npm test` (47), `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass; screenshots retained for empty, streaming, tool-result and mobile states.

---

## 5. Accessibility requirements (`ux-design accessibility` — project-wide; tier: **Standard**, to be committed)

Proposed tier **Standard** (user to confirm via `/ux-design accessibility`): no color-only indicators; documented focus order (header → side nav → transcript → composer → activity trigger); text contrast ≥ 4.5:1 (checked against the Astryx theme, not invented hex); `aria-live` for streaming status, final reply, errors and tool results; full keyboard operation; `prefers-reduced-motion`; captions/transcripts for the voice channel (the interim transcript + final text are the transcript); explicit `<label>` for the composer and every settings control; `Dialog`/`Drawer` focus trap and return owned by Astryx. Comprehensive-tier screen-reader announcements for key state changes are recommended given voice-first interaction.

> `ux-review` will report `Accessibility: NOT ASSESSED` until this tier is committed at `design/accessibility-requirements.md`. That is a **blocking gate input**, not a pass.

---

## 6. Quality gate (ux-review — read-only, run before implementation)

Apply Phase 3A to the §4 spec once written to `design/ux/workspace.md`, and 3C to `design/ux/interaction-patterns.md`. Expected pre-handoff gaps to close:
- Commit the accessibility tier (§5).
- Author the interaction pattern library (button/dictation/streaming/tool-card/drawer/banner patterns with When to Use / Not to Use / states / a11y / notes).
- Add focus-order + contrast figures (from Astryx tokens) and the performance/resolution criteria to ACs.
- Add `> **Template**: UX Spec` header + Status/Author/Platform Target (`Web · keyboard/mouse + touch + voice`).

Then re-run → target verdict **APPROVED**. Verdict is advisory; do not auto-fix.

---

## 7. QA plan (qa-plan — `qa.level: standard`)

Work items are the 8 surfaces in §3/§4. Classification (per the skill's table):

| Story | Type | Automated | Manual |
|---|---|---|---|
| Theme/CSS layering + token collision | Integration | Build + a token-collision regression check (no app `:root` name equals an Astryx token) | Light/dark screenshot, focus rings |
| AppShell/SideNav/TopNav frame | UI | Smoke: skip link, `<main>`, mobile drawer focus return | Screenshot each nav state (collapsed/expanded/active/hover/nested/mobile) |
| Composer + dictation + attachments | Integration | Existing `messageSanitizer` / stream tests unchanged; new: Enter/Shift+Enter/`/`, stop, paste-image | Voice + keyboard walkthrough, mobile keyboard |
| Transcript (streaming, markdown, truncation, tool calls) | Integration + Visual/Feel | NDJSON/stream/truncation tests unchanged; new: `useStreamingText` snap on `done` | Streaming screenshot, truncated reply not spoken, `.ics` download |
| Empty state + suggestions | UI | — | Retained screenshot, demo/live line accuracy |
| Settings / capabilities / confirm-delete | UI + Logic | Confirmation always precedes delete | Dialog focus, destructive-action check |
| Activity detail (drawer/sheet) | UI | — | Screenshot, `Esc` focus return, event-log empty state |
| Perf: long lists, audio isolation, bundle | Logic | `content-visibility`/virtualization check, no audio-state re-render, bundle size diff | 100+ message thread responsiveness |

**Manual QA** (every story): retained screenshot in `production/qa/evidence/`; designer sign-off for Visual/Feel; every AC translated to a falsifiable checklist item; subjective "feels" criteria replaced with a benchmark.
**Smoke scope** before QA hand-off: app loads (demo mode) → new conversation → voice or text send → streamed reply → tool result with `.ics` → thread switch → theme toggle → mobile drawer → no console errors → build/lint/tsc/tests green.
**Definition of Done:** ACs verified (test OR evidence) · test files exist for Logic/Integration · screenshots for UI/Visual · evidence doc for Visual · smoke passes · no regressions · code reviewed · status Complete.

---

## 8. Performance guardrails (vercel-react-best-practices)

- Preserve the `audioLevelsStore` external-store pattern (`rerender-use-ref-transient-values`); only `AudioMeter` subscribes per frame.
- Keep `memo` boundaries on `ChatLog`, `Composer`, `Sidebar`, `ActivityRail`; derive booleans (`isEmpty`, `isDemoMode`) during render, not in effects.
- `content-visibility: auto` / virtualization for `messages`, `sessionEvents`, `conversations` beyond 50 rows (`rendering-content-visibility`).
- Direct per-module imports (`@astryxdesign/core/Chat`, …) — no barrel imports; `next/dynamic` for settings + command palette (`bundle-dynamic-imports`, `bundle-conditional`).
- `client-passive-event-listeners` for the transcript scroll handler; dedupe the global keydown listener (`client-event-listeners`).
- Keep the no-flash theme script (`rendering-hydration-no-flicker`) and `getServerSnapshot` patterns for SSR-safe client-only values.
- Keep `localStorage` schema versioned/minimized and images stripped (`client-localstorage-schema`).
- Measure bundle before/after; Astryx Core + StyleX is a real cost — justify with the deleted bespoke CSS/components.

---

## 9. Phased execution & dependencies

```
P0  Align versions + approve this plan + commit accessibility tier
P1  Install Astryx, init agents, CSS layers, Theme, foundation smoke        [blocks all]
P2  Frame: AppShell + SideNav + TopNav + CommandPalette + mobile nav         [P1]
P3  Composer + empty state + transcript + streaming + tool cards             [P2]
P4  Detail drawer/sheet, settings, capabilities, confirm-delete             [P2]
P5  ux-review gate → APPROVED                                                [P3,P4 + §5 + patterns]
P6  qa-plan execution, web-guidelines re-audit, perf guardrails, cleanup     [P5]
P7  Build + 47 tests + lint + tsc + screenshot pass (light/dark/mobile)      [P6]
```

Each phase keeps the existing hooks/lib/API untouched; the redesign is a **presentation-layer migration**. Roll back surface-by-surface (Tailwind coexists during migration).

---

## 10. Decisions to confirm (ask_user candidates)

1. **Accessibility tier** — Standard (proposed) vs Comprehensive (recommended for voice-first). Blocking for `ux-review`.
2. **Right telemetry rail** — collapse to a compact status + on-demand `Drawer` (proposed, frees center space) vs keep a docked resizable panel.
3. **Astryx version** — pin `0.7.13` (CLI currently installed) vs upgrade to `0.7.14` project-wide.
4. **Scope of this turn** — plan only (this document) vs proceed into P1 implementation.

---

## 11. Sources (verified this session)
- `astryx build / search / template ai-chat, ai-chat-landing, shell-nav` · `astryx component` (174 components, names verified) · `astryx hook useStreamingText` · `astryx docs migration{,/migration-setup,/component-migration,/migration-verification}`, `use-a-theme`, `styling-libraries/tailwind`, `working-with-ai`.
- Vercel Web Interface Guidelines (`command.md`, fetched 2026-11-12).
- Repo reads: [README.md](../README.md), [package.json](../package.json), [src/app/page.tsx](../src/app/page.tsx), [src/app/globals.css](../src/app/globals.css), [src/app/layout.tsx](../src/app/layout.tsx), [ChatLog.tsx](../src/components/ChatLog.tsx), [Composer.tsx](../src/components/Composer.tsx), [Sidebar.tsx](../src/components/Sidebar.tsx), [ActivityRail.tsx](../src/components/ActivityRail.tsx), [Modal.tsx](../src/components/Modal.tsx), [ThemeToggle.tsx](../src/components/design/ThemeToggle.tsx), [audioLevels.ts](../src/lib/audioLevels.ts), screenshots.
