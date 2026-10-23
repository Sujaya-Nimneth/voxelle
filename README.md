# 🌌 Voxelle — Multimodal Voice AI Assistant & Command Center

Voxelle is a voice-first multimodal AI assistant designed with a futuristic cyber-dark aesthetic. Built on **Next.js 16 (App Router)** and **React 19**, Voxelle integrates state-of-the-art Web Speech technologies, Web Audio frequency analysis, advanced LLM reasoning, multi-provider support, and function calling. It features a responsive 3-column cyber shell, portal-based telemetry modals, and full multimodal vision capabilities.

---

## ✨ Features at a Glance

### 🎙️ Speech-First Interactions
*   **Intelligent Speech-to-Text (STT):** Integrated with the browser's Web Speech API for low-latency voice recognition. Hands-free input that auto-triggers assistant pipeline actions.
*   **Live Interim Speech Preview:** View live partial transcript bubbles with pulsing aura while speaking before the final command is dispatched.
*   **High-Fidelity Text-to-Speech (TTS):** Naturally speaks responses back using prioritized high-fidelity voices (Google Natural, Samantha, Daniel, or user-selected voices), chunked into sentence-bounded utterances for reliable long-form playback.
*   **Instant Interruption & Mute:** Tap the mic or type new text to instantly interrupt and silence speaking audio with zero UI lockup.
*   **Live Response Streaming:** Replies stream token-by-token from the API route (NDJSON events) with a blinking cursor — the first words appear as they're generated instead of after the full response.

### 📊 Reactive Audio Frequency Visualizer
*   **Real Web Audio API AnalyserNode:** The Activity Rail meter connects directly to the user's microphone stream via an `AudioContext` and FFT frequency analyzer, dynamically responding to pitch and vocal intensity in real time.
*   **Composited GPU Performance:** Visualizer bars use hardware-accelerated transforms to eliminate main-thread reflows.

### 🌐 Advanced Multi-LLM Provider Engine
Equipped with a secure server-side API router (`/api/chat`) that can be hot-swapped via environment variables:
1.  **Google Gemini (Gemini 2.0 Flash):** Native support for multimodal vision input, advanced reasoning, and developer-defined tool function calling, streamed via SSE. Secured with `x-goog-api-key` header authorization.
2.  **Groq (Llama-3.3-70b-versatile):** Ultra-low-latency token streaming with function calling capability.
3.  **Frictionless Demo Mode:** A standalone mock mode that works immediately **without any API keys**, enabling full simulated demonstrations of chatbot responses and smart home/calendar tool actions — including simulated streaming.

All providers speak the same NDJSON event stream (`meta` / `delta` / `tool` / `error` / `done`). If a provider fails before streaming starts (missing key, quota, HTTP error), the route degrades to mock mode and the client's provider badge explains why; mid-stream failures surface as honest, retryable errors. Upstream calls carry a 30s server-side timeout so a hung provider can't burn the function to the platform limit.

### 🔌 Intelligent Tool Execution (Function Calling)
Voxelle doesn't just talk — it acts. Built with direct tool calling definitions, it processes instructions into structured API payloads with real-time UI logging:
*   **📅 Calendar Event Scheduler (`add_calendar_event`):** Automates scheduling, booking meetings, setting reminders, or registering calendar dates.
*   **🏠 Smart Home Device Controller (`toggle_smart_home_device`):** Toggles devices on or off (lights, AC units, fans, TVs, thermostats) with structured arguments.

### 🖼️ Multimodal Vision Integration
*   **Interactive Drag & Drop + Clipboard Paste:** Attach image files via the dropzone overlay or simply paste directly from your clipboard (`⌘V`).
*   **Client-Side Auto-Optimization:** Automatically downscales high-resolution photos in-memory to prevent browser lockup or payload overflow.
*   **Visual Reasoning:** Gemini reads, analyzes, and answers questions about attached images.

---

## 🎨 Design System & Aesthetics

Voxelle features a high-fidelity visual layout inspired by cyberpunk interfaces:

| Visual Feature | Description | Styling & Performance |
| :--- | :--- | :--- |
| **Cyber Shell** | 3-Column responsive layout (Sidebar, Command Center, Activity Rail). | CSS Grid with dynamic `100dvh` mobile support |
| **Lucide Iconography** | Crisp, lightweight, tree-shaken SVG icons across all controls. | `lucide-react` |
| **Glassmorphism** | Semi-transparent frosted panels that blend into cosmic dark space. | CSS `backdrop-filter: blur(20px)` and subtle glowing borders |
| **Portal Dialogs** | Connected Tools, Automations, and Preferences modals rendered via `createPortal`. | Accessible ARIA dialogs with focus trap, focus restoration, and `Esc` dismissal |
| **Smart Markdown** | Renders formatted bold text, inline code, and lists with cyber styling. | Custom lightweight parser without heavy dependencies, memoized per message |
| **Smart Auto-Scroll** | Automatically sticks to bottom when active, but preserves reading position if scrolled up. | Native viewport detection with floating "Latest" jump pill |

---

## 🛠️ Tech Stack

*   **Framework:** Next.js 16.4.2 (App Router, React 19)
*   **Language:** TypeScript 5
*   **Styling:** Tailwind CSS v4, custom CSS variables, `@tailwindcss/postcss`
*   **Icons:** Lucide React
*   **Motion:** Framer Motion 12
*   **APIs:** Web Speech API, Web Audio API, Google Generative Language API, Groq Cloud API
*   **Testing:** Native Node.js Test Runner (`node --test`)

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/voxelle.git
cd voxelle
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure the Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Configure your preferred LLM provider (defaults to `mock` if none is configured):
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key_here
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### 5. Run Automated Tests
```bash
npm test
```
