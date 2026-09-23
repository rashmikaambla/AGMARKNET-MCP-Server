# College Project Documentation
## AI-Powered Gujarat Agricultural Market Intelligence MCP Server

---

## 1. Project Abstract

Farmers, traders, and policy analysts in Gujarat rely on daily market price
and arrival information published by AGMARKNET (Agricultural Marketing
Information Network, Government of India) to make informed decisions.
However, AGMARKNET's website only exposes point-in-time, filter-driven
reports — there is no persistent historical database, no programmatic
semantic search, and no way for an AI assistant to answer natural-language
questions grounded in this data. This project builds a production-style
**Model Context Protocol (MCP) server**, backed by a **REST API** and a
**permanent MongoDB historical data store**, that collects Gujarat cereal
market data from AGMARKNET, stores it indefinitely (never deleting old
records), and exposes it through 11 MCP tools, 5 MCP resources, and 3 MCP
prompts, as well as a parallel REST API. A **Retrieval-Augmented Generation
(RAG)** subsystem converts stored records into AI-readable documents,
generates vector embeddings, and supports semantic search, while exact
numeric questions are answered directly through MongoDB aggregations — a
hybrid architecture that plays to the strengths of both approaches. The
system performs an initial one-year historical import, then runs a daily
scheduled synchronization that permanently appends new data, guaranteeing an
ever-growing, duplicate-free historical dataset suitable for long-term trend
analysis.

## 2. Problem Statement

AGMARKNET publishes daily agricultural market data but does not provide: (a)
a persistent, queryable historical database beyond its own report filters;
(b) any AI/LLM-consumable interface; (c) semantic search over historical
observations; or (d) automated, duplicate-safe daily data collection. Users
who want to track price trends over months or years, compare markets, or ask
natural-language questions about Gujarat's agricultural markets have no
existing tool to do so.

## 3. Existing System

Currently, users must manually visit `agmarknet.gov.in`, select filters
(state, district, market, commodity, variety, grade, date), and read a
paginated HTML report for a single day or short range at a time. There is no
persistent storage, no API, no aggregation across dates, and no AI
integration.

## 4. Limitations of Existing System

- No historical database — each query is a fresh, ephemeral report.
- No programmatic access (no public API).
- No semantic/natural-language search capability.
- No automated daily data collection or change tracking.
- No cross-market or cross-time comparison tools.
- Not consumable by AI assistants or MCP-compatible clients.

## 5. Proposed System

A Node.js/TypeScript MCP server with:
- A Playwright-based scraping service (`AgmarknetService`) abstracted behind
  a common `MarketDataSource` interface, alongside a CSV-based
  `SampleMarketDataService` for development/testing.
- A permanent, append-only MongoDB historical dataset with deterministic
  duplicate prevention.
- A one-time one-year initial historical import, followed by daily automated
  synchronization via `node-cron`.
- A RAG subsystem: document generation, embeddings (local or external
  provider), and vector search (local cosine similarity or MongoDB Atlas
  Vector Search).
- 11 MCP tools, 5 MCP resources, and 3 MCP prompts exposing this data to any
  MCP-compatible AI client.
- A parallel REST API exposing the same underlying service layer.
- Full input validation (Zod), structured logging, error handling, and a
  Vitest test suite (unit + integration).

## 6. Objectives

1. Collect and permanently store Gujarat AGMARKNET cereal market data.
2. Guarantee zero data loss — no deletion, no rolling retention window.
3. Prevent duplicate records via a deterministic composite key.
4. Automate daily data collection without manual intervention.
5. Provide both structured (MongoDB aggregation) and semantic (RAG) query
   capabilities.
6. Expose all functionality through the Model Context Protocol for AI
   assistant consumption, and through REST for conventional clients.
7. Ensure full traceability: every answer must cite its source, date,
   district, market, and commodity.
8. Build a genuinely testable, runnable, and maintainable codebase suitable
   for a final-year submission.

## 7. Scope

**In scope:** Gujarat state, Cereals commodity group (configurable),
"Market Wise Price & Arrival" data, historical storage, RAG search, MCP/REST
interfaces, scheduling, CSV import, backfill.

**Out of scope:** Weather/rainfall/IMD data, price prediction/forecasting,
states other than Gujarat (though the architecture supports extension),
commodity groups other than Cereals by default (configurable via `.env`).

## 8. System Architecture

```
                         AI CLIENT
                             |
                      MCP CLIENT / Inspector
                             |
                    +----------------+
                    |   MCP SERVER   |
                    +----------------+
                      |      |      |
                    Tools Resources Prompts
                      |
                 Service Layer
                      |
          +-----------+-----------+
          |                       |
      MongoDB                 RAG Layer
          |                       |
          |               +-------+-------+
          |               |               |
          |          Embeddings     Vector Search
          |               |               |
          +---------------+---------------+
                          |
                  AGMARKNET Service (Playwright)
                          |
                  Official AGMARKNET Website
```

Automatic ingestion pipeline:

```
AGMARKNET → Scheduler (node-cron) → Scraper (Playwright) → Parser →
Validation (Zod) → Normalization → Duplicate Detection (recordKey) →
MongoDB (append-only) → RAG Document Generation → Embedding → Vector Store
```

## 9. Module Description

- **AGMARKNET Data Collection Module** (`src/services/agmarknet/*`) —
  Playwright automation, centralized selectors, pagination handling.
- **Historical Data Import Module** (`scripts/initialImport.ts`) — one-time
  one-year backfill on first setup.
- **Daily Synchronization Module** (`src/jobs/dailySyncJob.ts`) — cron-driven
  incremental append.
- **Data Validation Module** (`src/utils/validation.ts`,
  `src/utils/normalization.ts`) — Zod schemas and field normalization.
- **MongoDB Storage Module** (`src/services/mongodb.ts`,
  `src/repositories/*`) — connection, indexing, CRUD.
- **REST API Module** (`src/routes`, `src/controllers`, `src/middleware`).
- **MCP Server Module** (`src/server/mcpServer.ts`, `src/tools`,
  `src/resources`, `src/prompts`).
- **RAG Module** (`src/services/ragService.ts`) — document generation and
  retrieval orchestration.
- **Embedding Module** (`src/services/embeddingService.ts`) — pluggable
  local/external embedding providers.
- **Vector Search Module** (`src/services/vectorSearchService.ts`) — local
  cosine similarity and MongoDB Atlas Vector Search.
- **Market Analysis Module** (`src/services/marketDataService.ts`) —
  statistics, trends, comparisons.
- **Logging and Monitoring Module** (`src/utils/logger.ts`,
  `ingestion_logs` collection).

## 10. Functional Requirements

| ID | Requirement |
|---|---|
| FR1 | Collect AGMARKNET market data |
| FR2 | Collect Gujarat market data using configured filters |
| FR3 | Perform initial one-year historical import |
| FR4 | Store historical data permanently |
| FR5 | Automatically collect newly available daily data |
| FR6 | Prevent duplicate records |
| FR7 | Provide market-wise queries |
| FR8 | Provide district-wise queries |
| FR9 | Provide state-wise queries |
| FR10 | Provide commodity-wise price analysis |
| FR11 | Provide price trends |
| FR12 | Provide market comparisons |
| FR13 | Provide RAG semantic search |
| FR14 | Expose MCP tools |
| FR15 | Expose MCP resources |
| FR16 | Expose MCP prompts |
| FR17 | Expose REST APIs |
| FR18 | Provide ingestion status |
| FR19 | Provide source traceability |
| FR20 | Allow CSV import |
| FR21 | Allow historical backfill |

## 11. Non-Functional Requirements

| ID | Requirement | How it's addressed |
|---|---|---|
| NFR1 | Reliability | Structured error handling; ingestion never crashes the process |
| NFR2 | Maintainability | Layered architecture (tools/routes → services → repositories) |
| NFR3 | Scalability | Indexed MongoDB queries; Atlas Vector Search option for scale |
| NFR4 | Security | Admin API key, Helmet, CORS, no hard-coded secrets |
| NFR5 | Performance | Compound indexes on all frequent query patterns |
| NFR6 | Data integrity | Unique `recordKey` index; idempotent ingestion |
| NFR7 | Type safety | Strict TypeScript throughout, zero `any` in domain logic |
| NFR8 | Error handling | Centralized REST error handler; structured MCP error responses |
| NFR9 | Logging | Structured JSON logs with secret redaction |
| NFR10 | Testability | 51+ automated unit tests; skip-safe integration tests |

## 12. Database Design

**`market_data`** — permanent historical records. Unique index on
`recordKey`; additional indexes on `state`, `district`, `market`,
`commodity`, `commodityGroup`, `arrivalDate`, and compound indexes for
common query patterns (`district+commodity+arrivalDate`,
`market+commodity+arrivalDate`, `state+arrivalDate`). **No TTL index.**

**`markets`** — distinct markets discovered from real or sample data.
Unique compound index on `(state, district, market)`.

**`ingestion_logs`** — one document per ingestion run, recording mode,
date range, pages processed, records found/inserted/duplicated/failed, RAG
documents created, embeddings created, errors, and duration.

**`rag_documents`** — one document per `market_data` record, storing
generated natural-language content, its embedding vector, the embedding
model name, and metadata for filtered retrieval. Unique index on
`marketDataRecordKey` (so re-running embedding generation upserts rather
than duplicates).

**`system_metadata`** — a singleton document tracking initial import
range/completion, last successful sync time/date, last sync status, total
record count, and RAG index status.

## 13. ER Diagram Description

- `market_data` is the central entity; `markets` is a derived/summary entity
  (one row per distinct state+district+market combination seen in
  `market_data`).
- `rag_documents` has a one-to-one relationship with `market_data` via
  `marketDataRecordKey` (each stored record produces exactly one RAG
  document).
- `ingestion_logs` records the history of ingestion *runs*, not individual
  records — a one-to-many relationship exists conceptually between an
  `ingestion_logs` entry and the `market_data` records it inserted (not
  stored as a foreign key, since MongoDB documents already carry
  `scrapedAt`/`createdAt` timestamps sufficient to correlate them).
- `system_metadata` is a singleton summarizing the overall state of the
  other four collections; it has no foreign keys, only cached/derived values
  updated after each ingestion run.

## 14. DFD Level 0 Description

A single external entity, **AGMARKNET (Government Website)**, provides raw
data to the **Gujarat AGMARKNET MCP Server** process, which in turn serves
two external entities: **AI Client (via MCP)** and **REST API Consumer**.
Data at rest is the **MongoDB Historical Store**.

## 15. DFD Level 1 Description

The main process decomposes into: **1. Data Collection** (Playwright
scraping or CSV import) → **2. Validation & Normalization** (Zod, field
normalization) → **3. Duplicate Detection & Storage** (recordKey hashing,
MongoDB insert) → **4. RAG Document & Embedding Generation** → **5. Query
Processing** (structured MongoDB aggregation queries and RAG semantic
search, both reachable via MCP tools or REST endpoints) → **6. Response
Formatting** (structured JSON with source/date/district/market/commodity
metadata for traceability).

## 16. Use Case Description

- **Farmer/Trader** queries current or recent prices for a commodity in
  their district (`get_daily_market_data`, `get_district_market_data`).
- **Analyst** compares prices across markets or analyzes a trend over time
  (`get_market_comparison`, `get_price_trend`).
- **AI Assistant (via MCP client)** answers an open-ended natural-language
  question by invoking `search_market_knowledge` and the `ask_agmarknet_rag`
  prompt, grounding its answer in retrieved, cited data.
- **System Administrator** triggers a manual sync or historical backfill via
  the admin-protected REST ingestion endpoints, or inspects
  `get_data_source_status` / `/api/data-status` to monitor system health.
- **Developer/Grader** runs the test suite, imports sample data, and
  exercises every MCP tool via MCP Inspector to verify functionality without
  needing live internet access to AGMARKNET.

## 17. Future Scope

See the "Future scope" section of `README.md` — production-verified
scraping selectors, a neural embedding model, an admin dashboard, and
multi-state generalization.

## 18. Limitations

See the "Limitations" section of `README.md` — unverified live selectors,
hashing-based local embeddings, brute-force local vector search sizing, and
AGMARKNET's own historical data availability constraints.
