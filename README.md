# KeyClash ⌨️

A fast, minimal typing speed test — a Monkeytype-inspired SPA built with **React + Vite + TypeScript + Tailwind CSS + Zustand + Framer Motion**.

---

## ✨ Features

- **Real-time character feedback** — each character highlighted green (correct) or red (incorrect) as you type
- **Blinking caret** that follows your current position
- **Live metrics** — WPM, raw WPM, and accuracy update every second
- **Configurable timer** — 15s / 30s / 60s / 120s
- **Three word sets** — English 200, English 1k, Common words
- **Results screen** — WPM, raw WPM, accuracy, correct/incorrect/total chars, words typed
- **Restart anywhere** — press `Tab` at any point to start a new test
- **Scroll-tracking** — the word area auto-scrolls so the current line always stays at the top
- **Dark, minimal UI** — JetBrains Mono font, gold accent, no clutter

---

## 📁 Project Structure

```
keyclash/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── LiveStats.tsx
│   │   ├── RestartButton.tsx
│   │   ├── Results.tsx
│   │   ├── Settings.tsx
│   │   ├── Timer.tsx
│   │   └── WordDisplay.tsx
│   ├── data/
│   │   └── words.ts          # Static word lists
│   ├── hooks/
│   │   ├── useKeyboardCapture.ts  # Global input handler
│   │   └── useTimer.ts            # Countdown interval
│   ├── store/
│   │   └── useTypingStore.ts  # Zustand global state
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   ├── utils/
│   │   └── typing.ts          # Word gen + metrics math
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or later
- **npm** v9 or later (comes with Node)

### 1. Install dependencies

```bash
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The page hot-reloads on every save.

### 3. Build for production

```bash
npm run build
```

Output is in the `dist/` folder — ready to deploy to any static host (Vercel, Netlify, GitHub Pages, etc.).

### 4. Preview the production build locally

```bash
npm run preview
```

---

## 🎮 How to use

| Action | Key |
|--------|-----|
| Start test | Just start typing |
| Advance to next word | `Space` |
| Delete a character | `Backspace` |
| Go back to previous word | `Backspace` on empty input |
| Restart | `Tab` (anywhere) |

---

## 🏗 Architecture

### State management — Zustand (`src/store/useTypingStore.ts`)

All test state lives in a single Zustand store:

- `phase` — `idle` → `running` → `finished`
- `words` — array of `WordData` with per-character state
- `currentWordIndex` + `currentInput` — current position in the test
- `timeLeft` + `startTime` — timer state
- `metrics` — live WPM / accuracy snapshot

### Typing logic (`src/utils/typing.ts`)

- `generateWords` — Fisher-Yates shuffle of the word pool, no repeats
- `computeWordChars` — per-character diff between expected and typed
- `finalizeWord` — marks a word correct/incorrect when space is pressed
- `computeMetrics` — WPM = correct words / minutes; rawWpm = keystrokes / 5 / minutes

### Input capture (`src/hooks/useKeyboardCapture.ts`)

A visually hidden `<input>` receives focus on mount and on any page click. This gives native browser keyboard/IME support while rendering our own custom word display.

### Timer (`src/hooks/useTimer.ts`)

A `setInterval` fires every 1 s while `phase === 'running'`, calling `tick()` in the store, which decrements `timeLeft` and calls `finishTest()` at zero.

---

## 🎨 Design tokens

| Token | Value | Use |
|-------|-------|-----|
| `bg-primary` | `#0f1117` | Page background |
| `bg-secondary` | `#191c26` | Cards / panels |
| `accent-primary` | `#e2b714` | Timer (urgent), active pill, caret |
| `word-correct` | `#9ca3af` | Correctly typed characters |
| `word-incorrect` | `#ef4444` | Incorrectly typed characters |
| `word-pending` | `#4b5563` | Not yet typed |
| Font | JetBrains Mono | All typing / metric text |

---

## 📄 License

MIT — do whatever you like with it.
