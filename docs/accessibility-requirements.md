# Voxelle — Accessibility Requirements

> **Template**: Accessibility Requirements
> **Status**: Committed (Comprehensive Tier)
> **Platform Target**: Web · Keyboard/Mouse + Touch + Voice
> **Last Updated**: 2026-11-12

## 1. Committed Accessibility Tier

**Tier:** **Comprehensive** (Standard WCAG 2.1 AA baseline + voice-first state announcements and screen-reader parity).

## 2. Core Requirements

1. **No Color-Only Indicators**
   - Voice states (`idle`, `listening`, `processing`, `speaking`) are always communicated with explicit visible text labels and distinct icon/shape cues (`Ready`, `Listening`, `Thinking`, `Speaking`), never color alone.
   - Tool execution outcomes (`completed`, `executing`, `simulated`, `.ics` available) pair icons and explicit descriptive text (`Simulated. No device connected.`).
   - Degraded / demo mode status is communicated with explicit text labels (`Demo mode · fallback`), not color alone.

2. **Live Regions & Screen-Reader Announcements (Comprehensive Tier)**
   - **Voice & assistant status changes**: A polite `aria-live="polite"` region announces key transitions (`Listening started`, `Listening paused`, `Thinking`, `Speaking`, `Ready`, `Speech muted`).
   - **Finalized replies**: Complete assistant replies are announced politely once streaming completes (streaming tokens are never announced character-by-character; `ChatMessageList` sets `isStreaming` / `aria-busy` while streaming).
   - **Errors, warnings, and tool results**: Permission/browser capability warnings (`Banner`) and system errors (`ChatSystemMessage` / `role="alert"`) announce appropriately without stealing focus; transient feedback (copy confirmation, speech error) uses accessible `Toast` / polite live regions.
   - **Truncated / interrupted replies**: Clearly flagged visually and semantically (`Response interrupted. Partial reply only.`) and never spoken aloud automatically.

3. **Keyboard Operation & Focus Management**
   - **Documented Tab Order**: Skip link (`Skip to message input`) → `TopNav` controls (mobile menu, activity drawer toggle, theme/settings, command palette trigger) → `SideNav` threads & actions → `ChatMessageList` message actions (Speak, Copy, Retry) → `ChatComposer` (Attach, Input, Dictation, Mute/Stop, Send) → `Drawer` / `Dialog` / `Popover` when open.
   - **Keyboard Shortcuts**:
     - `/`: Focus message composer (when not typing in an input/textarea and no modal dialog is open).
     - `Enter`: Send message; `Shift+Enter`: Newline.
     - `⌘K` / `Ctrl+K`: Open Command Palette (thread search, new thread, quick actions).
     - `⌘I` / `Ctrl+I`: Toggle Session Activity drawer/sheet.
     - `⌘,` / `Ctrl+,`: Open Assistant Settings popover/dialog.
     - `Esc`: Interrupt playback / close topmost overlay (`Dialog`, `AlertDialog`, `Drawer`, `BottomSheet`, `Popover`, `CommandPalette`) and return focus to the trigger.
   - **Focus Containment & Return**: Owned by Astryx `AppShell` mobile nav, `Dialog`, `AlertDialog`, `Drawer`, `BottomSheet`, `Popover`, and `CommandPalette`. Destructive delete confirmation (`AlertDialog`) places initial focus on Cancel.

4. **Contrast, Typography & Target Size**
   - Text and UI control contrast ≥ 4.5:1 (light mode `#111111` / `#1a6fb0` on `#ffffff` & `#fafafa`; dark mode `#ffffff` / `#4cb3f0` on `#0c0d0f` & `#141517`, with dark ink `#0c0d0f` on `#4cb3f0` accent fills).
   - Interactive controls meet minimum touch target sizing (`>= 36px`–`44px` hit areas on mobile/touch) and safe-area insets (`env(safe-area-inset-bottom)`).
   - Explicit `<label>` / accessible `label` props on composer input, attachments, voice rate slider, voice selector, and auto-speak / theme switches.

5. **Motion & Voice Captions**
   - `prefers-reduced-motion`: Disables decorative animations and snaps streaming reveal (`speed: 'instant'`).
   - Live interim speech transcript and finalized text serve as the visual transcript/caption for the voice channel.
   - Waveform / `AudioMeter` / `SignalStrip` are decorative or carry concise `role="img"` labels without per-frame screen-reader chatter.
