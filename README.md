# counsellor.ai — TGEAPCET 2025 AI Admission Counsellor

A chat-based AI counsellor that helps students find eligible colleges based on their TGEAPCET 2025 rank, category, and gender. Built with Next.js, ChromaDB, and Gemini.

## Quick Start

### First-time setup

```bash
# 1. Install dependencies
npm install

# 2. Install ChromaDB (Python required)
pip install chromadb

# 3. Add your Gemini API key to .env
GEMINI_API_KEY=your_key_here

# 4. Ingest the TGEAPCET 2025 data into ChromaDB (run once)
npm run ingest
```

### Start the app

```bash
npm run dev:all
```

This starts both ChromaDB and the Next.js dev server together. Open [http://localhost:3000](http://localhost:3000).

To stop everything: `Ctrl+C`

---

## Architecture

```
XLSX data (2820 rows)
    ↓  npm run ingest
ChromaDB (local vector DB, 384-dim embeddings)
    ↓  on each chat message
Gemini 2.5-flash-lite (param extraction + response generation)
    ↓  streaming
Next.js chat UI
```

**Conversation flow:** bot collects exam → rank → category → gender, then searches ChromaDB for eligible colleges and streams a response grounded in the official last rank data.

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev:all` | Start ChromaDB + Next.js together |
| `npm run dev` | Start Next.js only (ChromaDB must already be running) |
| `npm run ingest` | Embed XLSX data and load into ChromaDB (run once) |
| `npm run test:e2e` | Run Puppeteer end-to-end tests |
| `npm run build` | Production build |

## Environment Variables

```bash
# .env
GEMINI_API_KEY=        # Google AI Studio key (aistudio.google.com)
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=tgeapcet-2025
```

## Data

Three XLSX files in `public/data/tgeamcet/` covering First Phase, Second Phase, and Final Phase of TGEAPCET 2025 counselling (2820 college × branch combinations). Re-ingest after updating files — `npm run ingest` is idempotent.

## Stack

- **Next.js 16** — App Router, streaming API routes
- **Gemini 2.5-flash-lite** — semantic param extraction + LLM responses
- **ChromaDB** — self-hosted vector DB with cosine similarity search
- **@chroma-core/default-embed** — local MiniLM embeddings (no API quota)
- **react-markdown + remark-gfm** — markdown + table rendering in chat
