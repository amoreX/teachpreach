# TeachPreach

An AI-powered visual teaching tool. Chat with an AI that draws on an infinite canvas to explain concepts — like a tutor at a whiteboard.

Built with React, Tailwind CSS v4, HTML5 Canvas, and OpenRouter.

## Features

- **Infinite canvas** with zoom, pan, and element selection
- **AI drawing** — the AI uses tool calls to draw shapes, text, paths, and diagrams
- **Agentic loop** — AI iterates autonomously: draws a bit, explains, draws more (up to 50 rounds)
- **Pen annotations** — circle or point at canvas elements, then ask the AI about them
- **Multi-model support** — pick any model from OpenRouter (Claude, GPT, Gemini, DeepSeek, etc.)
- **Reasoning display** — live streaming of model reasoning tokens
- **Conversation history** — multiple chats persisted to localStorage via Zustand
- **Properties panel** — select any element to inspect and edit its properties
- **Dark & light mode** — Nothing-inspired design system with OLED black and warm paper themes
- **Canvas grid toggle** — dot grid, line grid, or blank

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_IS_PROD=false
```

In dev mode, you'll enter your OpenRouter API key in the settings panel.

## Deploy to Vercel

1. Push to GitHub and connect the repo to Vercel
2. Add environment variables in Vercel dashboard (Settings > Environment Variables):
   - `OPENROUTER_KEY` — your OpenRouter API key (kept server-side)
   - `VITE_IS_PROD` — set to `true`
3. Deploy

In production, the API key is proxied through a Vercel Edge Function at `/api/chat` — never exposed to the browser. The settings panel and model selector are hidden.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select tool |
| `P` | Pen tool |
| `Space` (hold) | Pan mode |
| `Escape` | Deselect all, switch to select |
| `Cmd/Ctrl + Z` | Undo annotation |
| `Cmd/Ctrl + Shift + Z` | Redo annotation |

## Tech Stack

- **Frontend** — React 19, Vite, Tailwind CSS v4
- **Canvas** — HTML5 Canvas 2D with retained element model, DPR-aware rendering
- **State** — Zustand with localStorage persistence
- **AI** — OpenRouter API with SSE streaming
- **Deployment** — Vercel (static + Edge Functions)

## License

MIT
