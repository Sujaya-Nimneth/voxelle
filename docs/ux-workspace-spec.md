# Voxelle UX Workspace Specification & Review

- **Feature**: Full UI/UX redesign of Voxelle on `@astryxdesign/core` (`0.7.13`) + custom `voxelle` theme (`src/themes/voxelle/`).
- **Accessibility Target**: **Comprehensive** — see `docs/accessibility-requirements.md`.
- **Architecture Rule**: Presentation-layer migration only. NDJSON `/api/chat` protocol, tool allow-list (`add_calendar_event`, `toggle_smart_home_device`), `src/hooks/*`, `src/lib/*`, and all 47 unit tests remain untouched.

## 1. Information Architecture & Spatial Layout

1. **Shell (`AppShell`)**:
   - Uses Astryx `AppShell` (`variant="section"`, `height="fill"`) owning `<main>`, the skip link, responsive mobile sidebar drawer (`breakpoint: 'md'`), and top `banner` slot (`PermissionWarning`).
   - Top header (`TopNav`) contains `TopNavHeading` (brand aperture + active thread title), live `StatusBadge` + 5-band `SignalStrip` telemetry, `⌘K` Command Palette trigger, adaptive `SettingsPopover` (`⌘,`), and `Activity` toggle `Button` (`⌘I`) with active tool counter `Badge`.
2. **Thread Navigation (`Sidebar`)**:
   - Built on Astryx `SideNav` with `SideNavHeading`, primary `New conversation` & `Search & commands (⌘K)` actions, scrollable `SideNavSection` (`SideNavItem` per thread + `MoreMenu` delete trigger), runtime/model disclosure footer, and `Capabilities` / `Settings` icon actions.
   - Destructive thread removal opens Astryx `AlertDialog` with explicit thread title and focus anchored on `Cancel`.
3. **Conversation Stage (`ChatLog` + `Composer`)**:
   - Empty state renders Astryx `EmptyState` (`WelcomeSignal` emblem + honest mode notice for live provider vs local demo fallback) above a responsive 2-column `Grid` of 4 `ClickableCard` starter prompts.
   - Messages stream smoothly inside `ChatLayout` + `ChatMessageList` (`isStreaming` sets `aria-busy` until finalized), rendering user text inside filled bubbles and assistant Markdown via Astryx `Markdown` with `http(s):`-only `onLinkClick` link sanitization.
   - Truncated or interrupted replies display an inline `Banner` warning, exclude broken fragments from TTS playback, and expose a `Retry` action on the latest message.
   - Active `ToolEvent` outputs (`ToolEventList` / `ChatToolCalls`) render inline below the latest turn so calendar `.ics` downloads and simulated smart-home disclosures require **zero extra panel clicks**.
   - Docked `Composer` composes `ChatComposer`, `ChatComposerInput`, `ChatComposerDrawer` (image preview `Token` + `FileInput` dropzone + `⌘V` global paste + 4 MB validation), attach/auto-speak `IconButton`s, `Mute` `Button` while speaking, `Mic` toggle, and `ChatSendButton`.
4. **On-Demand Telemetry (`ActivityRail`)**:
   - Desktop renders `Drawer` (`side="end"`, `380px`); mobile (`<=767px`) renders `BottomSheet` (`height="tall"`).
   - Displays runtime provider/model card, 12-band SVG `AudioMeter` (`useSyncExternalStore` on `audioLevelsStore`), tool outputs (`ToolEventList`), `List` / `ListItem` session event timeline, and explicit browser-only mic privacy card.
5. **Overlays & URL Sync**:
   - `WorkspaceCommandPalette` (`CommandPalette` + `createStaticSource`) and `CapabilitiesDialog` (`Dialog` + `toolDefinitions`) are lazy-loaded via `next/dynamic`.
   - `?thread=<id>` and `?panel=activity` reflect workspace state via `useSearchParams` wrapped in `<Suspense>`.

## 2. Interaction Pattern Decisions

- **No color-only status**: `StatusBadge` pairs distinct Lucide icons (`Circle`, `Mic`, `Loader2`, `Volume2`) with explicit labels; `AudioMeter` pairs bars with `STANDBY` / `MIC %` / `STREAMING` / `TTS ACTIVE` text.
- **Audio DSP isolation**: Only `SignalStrip` and `AudioMeter` subscribe to `audioLevelsStore`, isolating 60fps audio frames from React workspace re-renders.
- **Scale & motion guardrails**: Long lists (`>50` messages, threads, or session events) apply `.vox-cv-auto` (`content-visibility: auto; contain-intrinsic-size: 0 120px`), and `globals.css` honors `prefers-reduced-motion: reduce`.
- **Keyboard map**: `/` focuses composer input, `⌘K` toggles Command Palette, `⌘I` toggles Activity Drawer/Sheet, `⌘,` toggles Settings Popover, `Esc` dismisses open overlays or mutes active speech when no overlay is open.

## 3. UX Review Gate (`ux-review`)

- **Accessibility alignment vs `docs/accessibility-requirements.md`**:
  - Comprehensive polite live region (`VisuallyHidden` in `src/app/page.tsx`) announces status transitions (`Ready`, `Listening started`, `Thinking`, `Speaking reply`), `Speech muted`, and finalized assistant replies without interrupting `aria-busy` token streams.
  - All controls use native interactive semantics (`Button`, `IconButton`, `SideNavItem`, `Switch`, `Slider`, `Selector`, `Dialog`, `AlertDialog`, `Drawer`, `BottomSheet`, `CommandPalette`).
  - Zero raw inline styles or hard-coded hex values inside UI components; token contract checked via `npx astryx doctor`.
- **Verdict**: **APPROVED** for implementation QA & visual verification.
