# AI-OS — AI Operating System Framework

Single-user business OS powered by Cloudflare Workers, Durable Objects, and Gemini AI.

## Architecture

```
Browser → Cloudflare Pages (React SPA) → Worker (API) → Durable Object (SQLite) → Gemini API
```

- **Cloudflare Pages** — Serves the React SPA
- **Cloudflare Worker** — API gateway + auth + static asset serving
- **Durable Object** — Single DO with embedded SQLite (all state: tasks, notes, contacts, conversations, messages, file refs)
- **Gemini API** — AI chat with per-session File API for RAG

## Quick Start

```bash
# Install dependencies
npm install

# Set your Gemini API key
echo "GEMINI_API_KEY=your-key-here" > .dev.vars

# Run locally
npm run dev:worker    # Worker on :8787
npm run dev:client    # Vite on :5173 (proxies /api to worker)
```

## Deploy

```bash
npm run deploy
```

Set `GEMINI_API_KEY` via `wrangler secret put GEMINI_API_KEY`.

## Environment

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Gemini API key |
| `CF_ACCESS_JWT_ASSERTION` | No | Cloudflare Access team domain for auth |

## Project Structure

```
freelanceos/
├── src/
│   ├── client/             # React SPA
│   │   ├── components/     # Layout, UI
│   │   ├── lib/            # API client, Zustand store
│   │   ├── pages/          # 16 pages: Dashboard, Clients, ClientDetail, Leads, Projects, ProjectDetail, Tasks, Proposals, NewProposal, ProposalEditor, Invoices, InvoiceDetail, Pricing, Analytics, Settings, Ai
│   │   ├── App.tsx         # Router
│   │   ├── main.tsx        # Entry
│   │   ├── style.css       # Tailwind v4 dark theme
│   │   └── index.html
│   └── worker/             # Cloudflare Worker + DO
│       ├── index.ts        # Worker entry (routing, auth, SPA assets)
│       └── do.ts           # Durable Object (SQLite schema, CRUD, Gemini AI)
├── wrangler.toml
└── package.json
```

## API Routes

| Method | Path | Description |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/clients` | Client CRUD |
| GET/POST/PUT/DELETE | `/api/leads` | Lead CRUD |
| GET/POST/PUT/DELETE | `/api/projects` | Project CRUD |
| GET/POST/PUT/DELETE | `/api/tasks` | Task CRUD |
| GET/POST/PUT/DELETE | `/api/proposals` | Proposal CRUD |
| GET/POST/PUT/DELETE | `/api/invoices` | Invoice CRUD |
| GET | `/api/dashboard` | Dashboard summary |
| GET/PUT | `/api/config` | App config (pricing_config) |
| POST | `/api/ai/chat` | AI chat with context |
| POST | `/api/pricing/analyze-scope` | Scope-to-price AI analysis |
| POST | `/api/proposals/generate` | AI proposal generation
