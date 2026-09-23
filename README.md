# Gujarat AGMARKNET MCP Server

**AI-Powered Gujarat Agricultural Market Intelligence MCP Server**

A production-style Model Context Protocol (MCP) server — plus a matching REST
API — that collects, permanently stores, searches (via RAG), and analyzes
agricultural market price and arrival data for Gujarat from
[AGMARKNET](https://agmarknet.gov.in/home) (Government of India).

> **Read this first — one important, honest limitation:** This project was
> built in a sandboxed environment with no network access to
> `agmarknet.gov.in`, so the Playwright scraper's CSS selectors
> (`src/services/agmarknet/selectors.ts`) are documented best-effort
> placeholders, **not verified against the live site**. Everything else —
> MongoDB storage, permanent historical data, duplicate prevention, RAG,
> embeddings, vector search, all 11 MCP tools, 5 resources, 3 prompts, the
> REST API, the scheduler, and the test suite — is fully implemented and
> genuinely runs end-to-end today using the bundled **sample dataset**
> (`source="SAMPLE"`, never presented as real government data). See
> [Step 4: Connecting to the real AGMARKNET site](#step-4-connecting-to-the-real-agmarknet-site-required-before-live-scraping)
> before attempting live scraping.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Key design decisions](#key-design-decisions)
3. [Project structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Installation (Windows)](#installation-windows)
6. [Configuration](#configuration)
7. [Running the project](#running-the-project)
8. [The permanent historical data model](#the-permanent-historical-data-model)
9. [RAG, embeddings, and vector search](#rag-embeddings-and-vector-search)
10. [MCP server & MCP Inspector](#mcp-server--mcp-inspector)
11. [MCP tools reference](#mcp-tools-reference)
12. [MCP resources & prompts](#mcp-resources--prompts)
13. [REST API reference](#rest-api-reference)
14. [Testing](#testing)
15. [Example questions to try](#example-questions-to-try)
16. [Troubleshooting](#troubleshooting)
17. [Limitations](#limitations)
18. [Future scope](#future-scope)

---

## Architecture

```
                         AI CLIENT
                             |
                             v
                      MCP CLIENT / Inspector
                             |
                             v
                    +----------------+
                    |   MCP SERVER   |  (src/server/mcpServer.ts, stdio)
                    +----------------+
                      |      |      |
                    Tools Resources Prompts
                      |
                      v
                 Service Layer (src/services/*)
                      |
          +-----------+-----------+
          |                       |
          v                       v
      MongoDB                 RAG Layer
   (repositories/*)      (ragService, embeddingService,
          |                vectorSearchService)
          |                       |
          |               +-------+-------+
          |               |               |
          |               v               v
          |          Embeddings     Vector Search
          |          (local hash /   (local cosine /
          |           external API)  Atlas $vectorSearch)
          +---------------+---------------+
                          |
                          v
                  AGMARKNET Service
              (Playwright, selectors.ts)
                          |
                          v
                  Official AGMARKNET
           https://agmarknet.gov.in/home
```

REST and MCP never duplicate business logic — both call the same service
layer:

```
MCP Tool  ─┐                      REST Route
           ├─> Service Layer <────┤
Ingestion  ─┘        │            Controller
   Job               v
              Repository Layer
                     │
                     v
                  MongoDB
```

## Key design decisions

- **Corrected package name.** The brief referenced `@modelcontextprotocol/server`,
  which does not exist. The current official package is
  **`@modelcontextprotocol/sdk`** (v1.30.0 at the time of writing), used here
  with `McpServer`, `registerTool`, `registerResource`, `registerPrompt`, and
  `StdioServerTransport` — the current recommended APIs per
  `https://ts.sdk.modelcontextprotocol.io/v2/`.
- **`MarketDataSource` abstraction.** `AgmarknetService` (real Playwright
  scraping) and `SampleMarketDataService` (CSV-backed) both implement the same
  interface. Every ingestion entry point (initial import, daily sync, manual
  sync, backfill, REST ingestion endpoints) is written against this interface
  and is source-agnostic — production and development sources are never
  mixed, and every stored record is tagged `source: "AGMARKNET"` or
  `source: "SAMPLE"` so nothing fake is ever presented as live data.
- **One shared ingestion pipeline.** `src/services/ingestionService.ts` is the
  single place that validates, normalizes, deduplicates, inserts, and
  triggers RAG/embedding generation. The daily cron job, manual sync script,
  backfill script, and initial import script are thin wrappers around it —
  there is no duplicated ingestion logic anywhere.
- **Append-only by construction.** There is **no TTL index**, **no
  `DATA_RETENTION_DAYS`**, and **no deletion logic** anywhere in the
  codebase. `INITIAL_HISTORY_YEARS` is used exactly once, only to compute the
  starting point of the one-time historical import. Grep the codebase for
  `deleteMany`/`drop`/TTL on `market_data` — you will not find any.
- **Deterministic duplicate prevention.** `buildRecordKey()` hashes
  `state+district+market+commodityGroup+commodity+variety+grade+arrivalDate`
  (normalized) into a SHA-256 key with a unique MongoDB index. Re-running any
  ingestion is provably idempotent (see `tests/ingestion.test.ts`).
- **Offline-runnable RAG.** The default embedding provider is a deterministic,
  dependency-free local hashing embedding (`LocalHashEmbeddingService`) so the
  full RAG pipeline — document generation, embeddings, cosine-similarity
  search — works with zero external API keys. Swapping in a real neural
  embedding model later (Ollama, Hugging Face, OpenAI-compatible endpoint) is
  a one-line `.env` change (`EMBEDDING_PROVIDER=external`) with no code
  changes to any caller.
- **Hybrid RAG + MongoDB.** Exact numeric questions ("average wheat price in
  Anand in August") should be answered by calling the structured tools
  (`get_commodity_price`, `get_district_market_data`, etc.), which run
  MongoDB aggregations directly. Open-ended/semantic questions should use
  `search_market_knowledge` (RAG). The `ask_agmarknet_rag` MCP prompt encodes
  this guidance for an AI client.

## Project structure

```
gujarat-agmarknet-mcp/
├── src/
│   ├── index.ts                  # Default entry point (starts REST server)
│   ├── server/
│   │   ├── mcpServer.ts          # MCP server (stdio transport)
│   │   └── restServer.ts         # Express REST server + scheduler bootstrap
│   ├── tools/                    # 11 MCP tools + shared response helpers
│   ├── resources/                # 5 MCP resources (index.ts registers all)
│   ├── prompts/                  # 3 MCP prompts (index.ts registers all)
│   ├── services/
│   │   ├── mongodb.ts            # Connection + index creation (no TTL!)
│   │   ├── agmarknet/
│   │   │   ├── selectors.ts      # Centralized, documented CSS selectors
│   │   │   ├── marketDataSource.ts
│   │   │   ├── agmarknetService.ts       # Real Playwright scraper
│   │   │   └── sampleMarketDataService.ts # CSV-backed dev/test source
│   │   ├── marketDataService.ts  # Shared business/statistics logic
│   │   ├── ingestionService.ts   # The one shared ingestion pipeline
│   │   ├── embeddingService.ts   # Local + external embedding providers
│   │   ├── ragService.ts         # RAG document generation + search
│   │   └── vectorSearchService.ts # Local cosine / Atlas $vectorSearch
│   ├── models/                   # TypeScript interfaces for all 5 collections
│   ├── repositories/             # All MongoDB access, one file per collection
│   ├── jobs/dailySyncJob.ts      # node-cron scheduler
│   ├── routes/, controllers/, middleware/   # REST API layer
│   └── utils/                    # logger, dateUtils, validation (Zod), csv,
│                                  # normalization, recordKey
├── scripts/
│   ├── initialImport.ts          # npm run initial-import
│   ├── sync.ts                   # npm run sync
│   ├── importData.ts             # npm run import-data
│   ├── backfill.ts               # npm run backfill -- --start=... --end=...
│   └── rebuildEmbeddings.ts      # npm run rebuild-embeddings
├── data/agmarknet_sample.csv     # Realistic SAMPLE dataset (Aug 2026)
├── tests/                        # Vitest unit + integration tests
├── .env.example
├── package.json
└── tsconfig.json
```

## Prerequisites

- **Node.js 20+** (tested with Node.js 22)
- **MongoDB 6+** running locally or via Atlas
- **Windows 10/11** (commands below are Windows `cmd`/PowerShell-friendly;
  they also work unmodified on macOS/Linux)
- Internet access from your machine to `agmarknet.gov.in` (only needed for
  live scraping — not needed for the sample-data path)

## Installation (Windows)

```bat
:: 1. Extract the project zip, then open a terminal in the project folder
cd gujarat-agmarknet-mcp

:: 2. Install dependencies
npm install

:: 3. Install Playwright's browser binaries (needed only for live scraping)
npx playwright install chromium

:: 4. Copy the environment template and edit it
copy .env.example .env
notepad .env
```

At minimum, confirm `MONGODB_URI` points at a MongoDB instance you control,
and set `ADMIN_API_KEY` to a real random string.

## Configuration

All configuration lives in `.env` (see `.env.example` for the full,
commented list). The most important variables:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` / `MONGODB_DATABASE` | Where permanent historical data is stored |
| `AGMARKNET_STATE` / `_COMMODITY_GROUP` / `_COMMODITY` / `_VARIETY` / `_GRADE` | Default AGMARKNET filters (Gujarat / Cereals / All Commodity / Individual / FAQ) |
| `INITIAL_HISTORY_YEARS` | **One-time** historical import lookback (default `1`). **Never** a retention/deletion setting. |
| `DATA_SYNC_CRON` | Cron expression for the daily sync job (default `0 18 * * *`) |
| `ADMIN_API_KEY` | Required header (`x-admin-api-key`) to call `/api/ingestion/*` |
| `EMBEDDING_PROVIDER` | `local` (default, offline) or `external` |
| `VECTOR_SEARCH_MODE` | `local` (default, brute-force cosine) or `atlas` |
| `ALLOW_SAMPLE_DATA` | Must be `true` to use the sample CSV / `SampleMarketDataService` |

## Running the project

### Step 1: Start MongoDB

Make sure your MongoDB instance (local `mongod` or Atlas) is running and
reachable at the `MONGODB_URI` you configured.

### Step 2: Try the full pipeline with sample data (recommended first run)

This exercises **the entire system** — MongoDB storage, deduplication, RAG
document generation, embeddings, and vector search — without needing the
live AGMARKNET site:

```bat
npm run import-data
```

You should see log output reporting records inserted, duplicates skipped,
and RAG documents/embeddings created. All these records are stored with
`source: "SAMPLE"`.

### Step 3: Run the REST API

```bat
npm run dev
```

Then, in another terminal:

```bat
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/market-data/district/Anand?startDate=2026-08-01&endDate=2026-08-31"
curl "http://localhost:3000/api/rag/search?query=wheat%20price%20Anand"
```

### Step 4: Connecting to the real AGMARKNET site (required before live scraping)

1. Open `https://agmarknet.gov.in/home` in a normal browser and navigate to
   **"Market Wise Price & Arrival"**.
2. Use DevTools (right-click → Inspect) on the State dropdown, District
   dropdown, Commodity Group/Commodity/Variety/Grade dropdowns, the
   submit/"Go" button, the results table, and the "Next Page" control.
3. Open `src/services/agmarknet/selectors.ts` and update each selector to
   match what you found (the file has detailed comments on what each
   selector is for).
4. Test with a **small, recent date range** first:
   ```bat
   npm run backfill -- --start=2026-08-25 --end=2026-08-31
   ```
5. Once verified, run the full one-year initial import:
   ```bat
   npm run initial-import
   ```
6. Start the REST server (which also starts the daily scheduler) or the MCP
   server for ongoing use.

If scraping fails, the service raises a clear
`AgmarknetStructureChangedError` and logs *"AGMARKNET page structure may
have changed"* — it will never insert fabricated data.

### Other commands

```bat
npm run build              :: compile TypeScript to dist/
npm start                  :: run the compiled REST server
npm run mcp                :: run the MCP server (stdio) for MCP Inspector/clients
npm run sync                :: manually run the same job the daily scheduler runs
npm run backfill -- --start=2025-09-01 --end=2026-09-01   :: arbitrary historical range
npm run backfill -- --start=2026-08-01 --end=2026-08-31 --source=sample  :: backfill from sample CSV
npm run rebuild-embeddings :: regenerate all RAG embeddings (e.g. after changing EMBEDDING_MODEL)
npm test                   :: run the test suite
npm run lint               :: type-check without emitting
```

## The permanent historical data model

This is the most important rule in the whole project:

```
INITIAL:  today - INITIAL_HISTORY_YEARS  →  today        (one-time import)
AFTER:    every new day's data is permanently APPENDED
NEVER:    delete old data — there is no rolling 365-day retention
```

- `market_data` has a **unique index on `recordKey`** and **no TTL index**.
- The daily sync job (`src/jobs/dailySyncJob.ts`) always computes
  `startDate = lastStoredDate + 1 day`, `endDate = today`, and **inserts**
  whatever is new. It never touches existing records.
- If AGMARKNET has no new data for a given run, the system logs
  `"No new data available."` and does nothing else — it never fabricates a
  record to fill the gap.
- `system_metadata` tracks `initialImportStartDate/EndDate`,
  `lastSuccessfulDataDate`, and `totalRecords` so every component knows
  exactly where the dataset currently stands.

## RAG, embeddings, and vector search

```
AGMARKNET/SAMPLE → normalize → MongoDB (market_data)
                                     │
                                     v
                          RAG document generation
                        (ragService.buildRagContent)
                                     │
                                     v
                       Embedding generation (embeddingService)
                                     │
                                     v
                        rag_documents (MongoDB, with embedding[])
                                     │
                                     v
                  Semantic retrieval (vectorSearchService)
                     local cosine similarity  OR  Atlas $vectorSearch
                                     │
                                     v
                         search_market_knowledge tool / /api/rag/search
```

**Hybrid rule (enforced by prompt guidance, not automatically by code):**
use the structured tools (`get_commodity_price`, `get_district_market_data`,
`get_market_comparison`, etc.) for exact numeric/aggregation questions, and
`search_market_knowledge` for open-ended/contextual questions. The
`ask_agmarknet_rag` MCP prompt tells an AI client exactly this.

To use a real neural embedding model instead of the bundled local hashing
embedding, set in `.env`:

```
EMBEDDING_PROVIDER=external
EMBEDDING_API_URL=https://your-embedding-endpoint/v1/embeddings
EMBEDDING_API_KEY=your-key-here
EMBEDDING_DIMENSIONS=1536
```

`ExternalEmbeddingService` expects an OpenAI-compatible
`{ data: [{ embedding: number[] }, ...] }` response shape; adapt it if your
provider differs. After switching providers, run
`npm run rebuild-embeddings` to regenerate all vectors.

To use MongoDB Atlas Vector Search instead of local cosine similarity, set
`VECTOR_SEARCH_MODE=atlas` and `MONGODB_VECTOR_INDEX=<your index name>`, and
create a vector search index on `rag_documents.embedding` in Atlas with the
matching `EMBEDDING_DIMENSIONS`.

## MCP server & MCP Inspector

Start the MCP server (stdio transport) directly with MCP Inspector:

```bat
npx @modelcontextprotocol/inspector npx tsx src/server/mcpServer.ts
```

This launches both the Inspector UI (a local web page) and the MCP server as
a child process communicating over stdio, per the official
`@modelcontextprotocol/inspector` usage. In the Inspector UI:

1. **Connect** — the Inspector auto-connects to the launched server.
2. **List Tools** — you should see all 11 tools listed below.
3. **List Resources** — you should see the 5 `agmarknet://gujarat/*` resources.
4. **List Prompts** — you should see the 3 prompts.
5. **Execute a tool** — e.g. select `get_market_list`, leave `district` empty,
   click Run. With sample data imported, you should get a populated list.
6. **Test invalid input** — call `get_daily_market_data` with
   `date: "not-a-date"` and confirm you get a structured
   `{"success": false, "error": {...}}` response, not a crash.

If you built the project first (`npm run build`), you can instead point the
Inspector at the compiled server:

```bat
npx @modelcontextprotocol/inspector node dist/src/server/mcpServer.js
```

To connect a real MCP client (e.g. Claude Desktop) instead of the Inspector,
point it at the same command (`npx tsx src/server/mcpServer.ts` or
`node dist/src/server/mcpServer.js`) with working directory set to this
project folder so `.env` is picked up.

## MCP tools reference

| Tool | Purpose |
|---|---|
| `get_daily_market_data` | Prices/arrivals for one district on one date |
| `get_district_market_data` | District data over a date range + statistics |
| `get_state_market_data` | Gujarat-wide totals over a date range |
| `get_market_data` | Data for one specific market |
| `get_commodity_price` | Min/max/average/modal price stats + trend for a commodity |
| `get_price_trend` | Day-by-day historical trend over the last N days |
| `get_market_list` | Markets actually stored in MongoDB |
| `search_market_knowledge` | RAG/semantic search over market knowledge |
| `get_market_summary` | 30-day structured summary for a district |
| `get_data_source_status` | Sync status, record counts, RAG status |
| `get_market_comparison` | Compare a commodity across 2+ markets |

Every tool validates input with Zod and returns a structured
`{success, data, metadata}` or `{success: false, error}` payload (see
`src/tools/toolResponse.ts`).

## MCP resources & prompts

**Resources** (read-only, never trigger scraping):
`agmarknet://gujarat/market-data`, `agmarknet://gujarat/markets`,
`agmarknet://gujarat/commodities`, `agmarknet://gujarat/data-status`,
`agmarknet://gujarat/rag-knowledge`.

**Prompts:** `analyze_market_trend(district, commodity, days)`,
`generate_market_report(district, startDate, endDate)`,
`ask_agmarknet_rag(question)`.

## REST API reference

All responses follow `{ success, data, metadata }` (or
`{ success: false, error }`). Base path: `/api`.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness check |
| GET | `/market-data/daily?district=&date=` | |
| GET | `/market-data/district/:district?startDate=&endDate=` | |
| GET | `/market-data/state?startDate=&endDate=` | |
| GET | `/market-data/market/:market?startDate=&endDate=&commodity=` | |
| GET | `/market-data/commodity/:commodity?startDate=&endDate=&district=&market=` | |
| GET | `/market-data/trend/:commodity?days=&district=&market=` | |
| GET | `/markets?district=` | |
| GET | `/data-status` | |
| GET | `/rag/search?query=&district=&market=&commodity=&topK=` | |
| POST | `/ingestion/run` | **Admin-protected.** Header `x-admin-api-key`. Optional `?source=sample`. |
| POST | `/ingestion/backfill` | **Admin-protected.** Body `{startDate, endDate}`. Disabled for live AGMARKNET in production — use the CLI script instead. |

Example:

```bat
curl -H "x-admin-api-key: %ADMIN_API_KEY%" -X POST "http://localhost:3000/api/ingestion/run?source=sample"
```

## Testing

```bat
npm test
```

- **Unit tests** (`tests/validation.test.ts`, `dateUtils.test.ts`,
  `normalization.test.ts`, `rag.test.ts`, `csv.test.ts`, `marketData.test.ts`,
  `ingestion.test.ts`) run with no external dependencies and mock the
  AGMARKNET response shape rather than calling the live site, per project
  requirements.
- **Integration test** (`tests/repositories.test.ts`) exercises a real
  MongoDB connection and the duplicate-prevention guarantee end-to-end. It
  **automatically skips** if `MONGODB_URI` isn't reachable, so `npm test`
  passes in any environment; start MongoDB locally to actually run it.
- **Manual live-scraping test procedure:** after updating
  `selectors.ts` (see Step 4 above), run
  `npm run backfill -- --start=<yesterday> --end=<today>` and inspect the
  `ingestion_logs` collection / console output for `recordsInserted`,
  `pagesProcessed`, and any `errors`.

## Example questions to try

1. "Show me today's market data for Anand." → `get_daily_market_data`
2. "What were the market prices in Anand yesterday?" → `get_daily_market_data`
3. "Show Gujarat Cereals market data for the last 7 days." → `get_state_market_data`
4. "What is the modal price of wheat in Anand?" → `get_commodity_price`
5. "Compare wheat prices in Anand and Ahmedabad." → `get_market_comparison`
6. "Which market had the highest modal price for wheat?" → `get_market_comparison`
7. "What was the average wheat price in Gujarat during August 2026?" → `get_commodity_price` / `get_state_market_data`
8. "Show me the wheat price trend in Anand for the last 30 days." → `get_price_trend`
9. "What commodities are available in Anand market?" → `get_market_summary`
10. "Find historical information about wheat prices in Anand." → `search_market_knowledge` (RAG)
11. "Which Gujarat markets had the highest wheat prices?" → `get_market_comparison`
12. "Generate a market report for Anand for the last 30 days." → `generate_market_report` prompt

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `MONGODB_URI is not set` | Copy `.env.example` to `.env` |
| `Database not connected` | MongoDB isn't running or `MONGODB_URI` is wrong |
| `AGMARKNET page structure may have changed` | Update `src/services/agmarknet/selectors.ts` against the live page (see Step 4) |
| `Sample data is disabled` | Set `ALLOW_SAMPLE_DATA=true` in `.env` |
| `Unauthorized: missing or invalid x-admin-api-key` | Set `ADMIN_API_KEY` in `.env` and pass it as a header |
| Inspector shows no tools | Confirm `npm install` succeeded and MongoDB is reachable before Inspector connects |
| `EMBEDDING_PROVIDER=external requires EMBEDDING_API_URL` | Set both `EMBEDDING_API_URL` and `EMBEDDING_API_KEY`, or switch back to `EMBEDDING_PROVIDER=local` |

## Limitations

- Live AGMARKNET selectors are unverified placeholders (see the notice at
  the top of this README and in `selectors.ts`) and must be confirmed/updated
  against the real site before production use.
- The local embedding model is a hashing-trick bag-of-words representation,
  not a neural embedding — it supports genuine semantic search over this
  project's short, structured sentences, but is not comparable in quality to
  a transformer-based embedding model for open-ended natural language.
  `EMBEDDING_PROVIDER=external` is provided for exactly this reason.
  reason.
- Local vector search is brute-force cosine similarity, sized for a
  college-project-scale dataset; large-scale production use should switch to
  `VECTOR_SEARCH_MODE=atlas`.
- AGMARKNET may not publish a complete year of historical data for every
  market/commodity combination; the system logs what's unavailable rather
  than inventing it (see `errors` in `ingestion_logs`).

## Future scope

- Verified, production-hardened Playwright selectors with automated
  self-healing/alerting on structural changes.
- A proper neural embedding model wired in by default (e.g. a local
  sentence-transformers server) once network access allows model downloads.
- Price forecasting (explicitly out of scope here — this project only
  reports historical observations, never predictions).
- A lightweight admin dashboard over the REST API for ingestion monitoring.
- Multi-state support beyond Gujarat by generalizing `AGMARKNET_STATE`
  handling already present in the filter configuration.
