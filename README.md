# Gujarat AGMARKNET MCP Server

### AI-Powered Agricultural Market Price Intelligence using MCP, MongoDB, RAG and Playwright

The **Gujarat AGMARKNET MCP Server** is an AI-enabled agricultural market intelligence system that collects, stores, searches, and analyzes agricultural market price and arrival data from **AGMARKNET** for Gujarat.

The project uses the **Model Context Protocol (MCP)** to make agricultural market data available to AI applications such as Claude through structured tools. It also provides a **REST API**, **MongoDB-based permanent storage**, **RAG-based semantic search**, **vector embeddings**, and **automatic daily data synchronization**.

---

## 🚀 Key Features

* 🌾 Gujarat agricultural market price and arrival data
* 🤖 AI integration using Model Context Protocol (MCP)
* 🔎 Natural-language market data queries
* 🗄️ Permanent MongoDB data storage
* 📊 Commodity price and market analysis
* 📈 Historical price trend analysis
* 🧠 RAG-based semantic search
* 🔢 Vector embeddings and similarity search
* 🔄 Automatic daily data synchronization
* 🛡️ Duplicate record prevention
* 🌐 REST API support
* 🧪 Unit and integration testing
* 🖥️ MCP Inspector support
* 🔌 Claude/MCP client integration

---

# 📌 Problem Statement

Agricultural market price information is available through government portals such as AGMARKNET, but accessing and analyzing this information manually can be difficult.

Users may want to ask questions such as:

* What is the wheat price in Anand?
* What was the modal price of wheat yesterday?
* Compare wheat prices between Anand and Ahmedabad.
* What is the average wheat price during a particular period?
* Show the historical price trend.
* Which market has a higher wheat price?

Traditional web interfaces require users to manually select filters and search through tables.

This project solves this problem by providing a backend system that collects agricultural market data and exposes it through **MCP tools and REST APIs**, allowing AI applications to answer such questions using structured data.

---

# 🎯 Objectives

The main objectives of this project are:

1. Collect agricultural market data from AGMARKNET.
2. Store historical market data permanently.
3. Automatically synchronize new market data.
4. Prevent duplicate records.
5. Provide structured APIs for market data.
6. Provide MCP tools for AI applications.
7. Implement RAG-based semantic search.
8. Analyze commodity prices and market trends.
9. Allow natural-language interaction through MCP-compatible AI clients.
10. Provide a scalable architecture for future agricultural intelligence applications.

---

# 🏗️ System Architecture

```text
                     ┌──────────────────────┐
                     │      AI Client       │
                     │  Claude / MCP Client │
                     └──────────┬───────────┘
                                │
                                │ MCP Protocol
                                ▼
                     ┌──────────────────────┐
                     │     MCP Server       │
                     │   TypeScript / Node  │
                     └──────────┬───────────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
                 ▼              ▼              ▼
             MCP Tools      Resources       Prompts
                 │
                 ▼
          ┌─────────────────┐
          │  Service Layer  │
          └────────┬────────┘
                   │
          ┌────────┴─────────┐
          │                  │
          ▼                  ▼
   ┌──────────────┐   ┌───────────────┐
   │   MongoDB    │   │   RAG Layer   │
   │              │   │               │
   │ Market Data  │   │ Embeddings    │
   │ Markets      │   │ Vector Search │
   │ Logs         │   │ RAG Documents │
   └──────────────┘   └───────────────┘
          ▲
          │
          │
   ┌──────┴─────────┐
   │  Ingestion     │
   │    Service     │
   └──────┬─────────┘
          │
          ▼
   ┌────────────────┐
   │   Playwright   │
   │ Web Automation │
   └───────┬────────┘
           │
           ▼
   ┌──────────────────────┐
   │      AGMARKNET       │
   │ Government Data Site │
   └──────────────────────┘
```

---

# 🛠️ Technologies Used

| Technology                       | Purpose                            |
| -------------------------------- | ---------------------------------- |
| **TypeScript**                   | Main programming language          |
| **Node.js**                      | Backend runtime                    |
| **Express.js**                   | REST API server                    |
| **MongoDB**                      | Permanent data storage             |
| **Mongoose / MongoDB Driver**    | Database interaction               |
| **Playwright**                   | Web automation and data collection |
| **Model Context Protocol (MCP)** | AI-client integration              |
| **RAG**                          | Semantic information retrieval     |
| **Embeddings**                   | Convert text into vectors          |
| **Vector Search**                | Semantic similarity search         |
| **Zod**                          | Input validation                   |
| **node-cron**                    | Scheduled daily synchronization    |
| **Vitest**                       | Testing                            |
| **CSV**                          | Historical/sample data import      |

---

# 🔌 Protocols and Communication

## 1. Model Context Protocol (MCP)

The project uses **Model Context Protocol** to connect AI applications with the agricultural market data system.

MCP allows an AI client to discover and use predefined tools provided by the server.

Example:

```text
User
 │
 │ "What is the wheat price in Anand?"
 ▼
AI Client
 │
 │ MCP
 ▼
AGMARKNET MCP Server
 │
 │ get_commodity_price()
 ▼
MongoDB
 │
 ▼
Price Data
 │
 ▼
AI-generated Answer
```

---

## 2. HTTP / REST

The project also provides REST APIs using HTTP.

Example:

```http
GET /api/market-data/district/Anand
```

REST APIs are useful for applications that do not directly use MCP.

---

## 3. stdio Transport

The MCP server communicates with MCP clients using **stdio transport**.

This allows MCP-compatible applications such as MCP Inspector and Claude Desktop to launch the server as a local process.

---

# 📂 Project Structure

```text
gujarat-agmarknet-mcp/
│
├── src/
│   ├── index.ts
│   │
│   ├── server/
│   │   ├── mcpServer.ts
│   │   └── restServer.ts
│   │
│   ├── tools/
│   │   └── MCP tools
│   │
│   ├── resources/
│   │   └── MCP resources
│   │
│   ├── prompts/
│   │   └── MCP prompts
│   │
│   ├── services/
│   │   ├── mongodb.ts
│   │   ├── ingestionService.ts
│   │   ├── marketDataService.ts
│   │   ├── embeddingService.ts
│   │   ├── ragService.ts
│   │   ├── vectorSearchService.ts
│   │   │
│   │   └── agmarknet/
│   │       ├── agmarknetService.ts
│   │       ├── marketDataSource.ts
│   │       └── selectors.ts
│   │
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── jobs/
│   └── utils/
│
├── scripts/
│   ├── initialImport.ts
│   ├── importData.ts
│   ├── sync.ts
│   ├── backfill.ts
│   └── rebuildEmbeddings.ts
│
├── data/
│   └── historical/
│
├── tests/
│
├── .env.example
├── package.json
├── tsconfig.json
├── LICENSE
└── README.md
```

---

# 🗄️ Database

MongoDB is used as the primary database.

The system stores agricultural market information including:

```text
State
District
Market
Commodity Group
Commodity
Variety
Grade
Arrival Date
Minimum Price
Maximum Price
Modal Price
Arrival Quantity
Unit
Source
Scraped Date
```

Important collections include:

```text
market_data
markets
rag_documents
ingestion_logs
system_metadata
```

---

# 🔐 Duplicate Prevention

The system prevents duplicate records using a deterministic `recordKey`.

The key is generated using important fields such as:

```text
State
+
District
+
Market
+
Commodity
+
Variety
+
Grade
+
Arrival Date
```

These values are normalized and hashed using **SHA-256**.

MongoDB maintains a unique index on `recordKey`.

Therefore, if the same data is imported again:

```text
Existing Record
      │
      ▼
Same recordKey
      │
      ▼
Duplicate Detected
      │
      ▼
Record Skipped
```

This makes the ingestion process **idempotent**.

---

# 📥 Data Ingestion

The project supports multiple ingestion methods.

### Historical Data

Historical agricultural data can be imported from CSV files.

```text
CSV Files
   ↓
Validation
   ↓
Normalization
   ↓
Duplicate Check
   ↓
MongoDB
   ↓
RAG Documents
   ↓
Embeddings
```

### Daily Data

New market data can be collected using Playwright.

The daily synchronization process:

```text
Scheduled Job
     ↓
Determine New Date
     ↓
Open AGMARKNET
     ↓
Apply Filters
     ↓
Collect Market Data
     ↓
Validate & Normalize
     ↓
Duplicate Check
     ↓
Store in MongoDB
     ↓
Generate RAG Documents
     ↓
Generate Embeddings
```

---

# ⏰ Automatic Daily Synchronization

The project uses **node-cron** for scheduled data synchronization.

The scheduler can run the synchronization process automatically at a configured time.

Example:

```env
DATA_SYNC_CRON=0 21 * * *
```

This represents a daily scheduled execution at **9:00 PM**.

If new data is available, it is inserted into MongoDB.

If no new data is available, the system skips the operation instead of generating fake records.

---

# 🧠 RAG Implementation

The project uses **Retrieval-Augmented Generation (RAG)** for semantic search.

The process is:

```text
Market Data
     ↓
RAG Document
     ↓
Embedding Generation
     ↓
Vector Storage
     ↓
User Question
     ↓
Question Embedding
     ↓
Similarity Search
     ↓
Relevant Documents
     ↓
AI Response
```

RAG is mainly useful for open-ended questions and contextual searches.

For exact numerical questions, structured MongoDB queries are preferred.

---

# 🔢 Embeddings

Embeddings represent textual information as numerical vectors.

Example:

```text
"Wheat price in Anand"
          ↓
   Embedding Model
          ↓
[0.12, 0.45, 0.21, ...]
```

The project supports local embedding generation and can also be configured to use an external embedding provider.

---

# 🔎 Vector Search

The system can perform semantic similarity search using vector embeddings.

Two modes are supported:

```text
Local Cosine Similarity
        OR
MongoDB Atlas Vector Search
```

This allows questions with different wording to retrieve related agricultural information.

---

# 🤖 MCP Tools

The MCP server provides tools such as:

| Tool                       | Purpose                                 |
| -------------------------- | --------------------------------------- |
| `get_daily_market_data`    | Get market data for a particular date   |
| `get_district_market_data` | Get district-level data                 |
| `get_state_market_data`    | Get Gujarat-wide data                   |
| `get_market_data`          | Get data for a particular market        |
| `get_commodity_price`      | Get commodity price statistics          |
| `get_price_trend`          | Get historical price trends             |
| `get_market_list`          | Get available markets                   |
| `search_market_knowledge`  | Perform RAG-based semantic search       |
| `get_market_summary`       | Generate market summary                 |
| `get_data_source_status`   | Check data synchronization status       |
| `get_market_comparison`    | Compare commodity prices across markets |

All tools validate their input and return structured responses.

---

# 📚 MCP Resources

The server provides read-only MCP resources such as:

```text
agmarknet://gujarat/market-data
agmarknet://gujarat/markets
agmarknet://gujarat/commodities
agmarknet://gujarat/data-status
agmarknet://gujarat/rag-knowledge
```

---

# 💬 MCP Prompts

The project also provides reusable MCP prompts:

```text
analyze_market_trend
generate_market_report
ask_agmarknet_rag
```

These prompts help an AI client perform common agricultural market analysis tasks.

---

# 🌐 REST API

The system provides REST endpoints through Express.js.

### Health Check

```http
GET /api/health
```

### Daily Market Data

```http
GET /api/market-data/daily
```

### District Data

```http
GET /api/market-data/district/:district
```

### State Data

```http
GET /api/market-data/state
```

### Market Data

```http
GET /api/market-data/market/:market
```

### Commodity Data

```http
GET /api/market-data/commodity/:commodity
```

### Price Trend

```http
GET /api/market-data/trend/:commodity
```

### Market List

```http
GET /api/markets
```

### Data Status

```http
GET /api/data-status
```

### RAG Search

```http
GET /api/rag/search
```

---

# ⚙️ Installation

## Prerequisites

Install the following:

* Node.js 20+
* MongoDB 6+
* npm
* Git
* Chromium browser for Playwright

---

## 1. Clone Repository

```bash
git clone https://github.com/rashmikaambla/AGMARKNET-MCP-Server.git
```

```bash
cd AGMARKNET-MCP-Server
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Install Playwright Browser

```bash
npx playwright install chromium
```

---

## 4. Configure Environment

Create `.env` from `.env.example`.

Example:

```env
NODE_ENV=development

PORT=3000

MONGODB_URI=mongodb://127.0.0.1:27017/gujarat_agmarknet

MONGODB_DATABASE=gujarat_agmarknet

MONGODB_VECTOR_INDEX=rag_vector_index

ADMIN_API_KEY=your-secret-key

AGMARKNET_STATE=Gujarat
AGMARKNET_COMMODITY_GROUP=Cereals
AGMARKNET_COMMODITY=Wheat

EMBEDDING_PROVIDER=local

VECTOR_SEARCH_MODE=local
```

---

# ▶️ Running the Project

### Development Server

```bash
npm run dev
```

The REST API will run on:

```text
http://localhost:3000
```

---

### Build Project

```bash
npm run build
```

---

### Start Production Build

```bash
npm start
```

---

### Run MCP Server

```bash
npm run mcp
```

---

### Run Data Synchronization

```bash
npm run sync
```

---

### Import Historical Data

```bash
npm run import-historical
```

---

### Rebuild RAG Embeddings

```bash
npm run rebuild-embeddings
```

---

### Run Tests

```bash
npm test
```

---

# 🔗 Connecting with Claude

The MCP server can be connected to an MCP-compatible AI client.

The general workflow is:

```text
Claude
  │
  │ MCP
  ▼
MCP Server
  │
  ▼
Market Data Services
  │
  ▼
MongoDB
```

Once connected, the AI client can use the available MCP tools to answer agricultural market questions.

Example:

```text
User:
"What is the wheat price in Anand on 7 September 2026?"

        ↓

Claude

        ↓

MCP Tool:
get_daily_market_data

        ↓

MongoDB

        ↓

Market Price Data

        ↓

Claude generates the answer
```

---

# 🧪 MCP Inspector

The MCP server can also be tested using MCP Inspector.

```bash
npx @modelcontextprotocol/inspector npx tsx src/server/mcpServer.ts
```

MCP Inspector can be used to:

* View available tools
* Execute MCP tools
* View resources
* Test prompts
* Validate tool responses
* Test invalid inputs

---

# 💡 Example Questions

After connecting the server to an AI client, users can ask:

### Basic Queries

```text
What is the wheat price in Anand?
```

```text
Show today's market data for Anand.
```

```text
What was the wheat price yesterday?
```

### Price Analysis

```text
What is the average wheat price in Anand?
```

```text
What is the modal price of wheat?
```

```text
Show the wheat price trend for the last 30 days.
```

### Market Comparison

```text
Compare wheat prices in Anand and Ahmedabad.
```

```text
Compare wheat prices across different Gujarat markets.
```

### Historical Analysis

```text
What was the average wheat price during August 2026?
```

```text
Find historical information about wheat prices in Anand.
```

### Reports

```text
Generate a market report for Anand for the last 30 days.
```

---

# 🔄 Complete Working Flow

The complete system works as follows:

```text
                 AGMARKNET
                     │
                     ▼
                Playwright
                     │
                     ▼
             Data Extraction
                     │
                     ▼
          Validation & Normalization
                     │
                     ▼
              Duplicate Check
                     │
                     ▼
                 MongoDB
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
    Structured Data        RAG Documents
                                │
                                ▼
                           Embeddings
                                │
                                ▼
                          Vector Search
                                │
          ┌─────────────────────┴─────────────────────┐
          │                                           │
          ▼                                           ▼
     REST API                                  MCP Server
                                                    │
                                                    ▼
                                               AI Client
                                                    │
                                                    ▼
                                             Natural Language
                                                  Answer
```

---

# 🛡️ Data Reliability

The system follows several mechanisms to maintain data reliability:

* Input validation
* Data normalization
* Duplicate detection
* Unique MongoDB indexes
* Structured error handling
* Source identification
* Ingestion logs
* No fabricated market records
* Historical data preservation

Every market record contains information about its source.

---

# 📊 Data Preservation

Historical data is stored permanently.

The system does not use a rolling data-retention mechanism for the market data.

New data is appended while previously stored records remain available for historical analysis.

This enables:

* Historical comparison
* Trend analysis
* Market comparison
* RAG retrieval
* Long-term agricultural data analysis

---

# 🔐 Security

Administrative ingestion APIs are protected using an API key.

Example:

```http
x-admin-api-key: YOUR_API_KEY
```

Sensitive configuration such as:

```text
MONGODB_URI
ADMIN_API_KEY
API Keys
```

should be stored in `.env` and should **not** be committed to GitHub.

---

# 🧪 Testing

The project includes unit and integration tests.

Testing covers areas such as:

* Validation
* Date utilities
* Data normalization
* CSV processing
* Market data logic
* Ingestion
* RAG functionality
* MongoDB repositories
* Duplicate prevention

Run:

```bash
npm test
```

---

# ⚠️ Limitations

* AGMARKNET website structure can change over time.
* Playwright selectors may need to be updated if the website UI changes.
* Local vector search is suitable for a college/project-scale dataset.
* Local embeddings are simpler than transformer-based embeddings.
* Availability of historical data depends on the source website.
* Internet connectivity is required for live data collection.

---

# 🔮 Future Scope

Possible future improvements include:

* 🌾 Support for additional Indian states
* 📱 Mobile/web dashboard
* 📊 Advanced market analytics
* 📈 Interactive price charts
* 🤖 Neural embedding models
* 🔮 Machine-learning-based price forecasting
* ☁️ Cloud deployment
* 🗃️ MongoDB Atlas Vector Search
* 🚨 Automated scraper failure alerts
* 📑 Automated agricultural market reports
* 🌐 Multilingual support including Gujarati
* 🎙️ Voice-based agricultural market queries

---

# 🎓 Academic Project

This project demonstrates the practical use of:

* Artificial Intelligence
* Generative AI
* Model Context Protocol
* Retrieval-Augmented Generation
* Web Automation
* Database Management
* REST API Development
* Vector Search
* Natural Language Querying
* Data Engineering

It combines these technologies into a single agricultural market intelligence system.

---

# 👩‍💻 Developer

**Rashmika Ambla**

B.Tech – Agricultural Information Technology

GitHub:
https://github.com/rashmikaambla

Project Repository:
https://github.com/rashmikaambla/AGMARKNET-MCP-Server

---

# 📄 License

This project is licensed under the **MIT License**.

---

## ⭐ Project Summary

> **Gujarat AGMARKNET MCP Server** is an AI-powered agricultural market intelligence system that collects and permanently stores Gujarat market price and arrival data, provides structured REST APIs and MCP tools, and enables AI applications to answer natural-language agricultural market queries using MongoDB, RAG, embeddings, vector search, and automated data synchronization.
