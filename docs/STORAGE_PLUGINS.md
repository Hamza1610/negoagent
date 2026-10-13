# NEGOagent: Pluggable Storage & Database Architecture

This document specifies the extensible repository architecture for persisting agent profiles, simulation matchmaking configurations, negotiation session records, and turn-by-turn reasoning transcripts.

---

## 1. Architectural Philosophy

NEGOagent decouples storage from execution logic via the **Repository / Database Adapter Pattern**. 

* **Zero-Setup Default:** Anyone cloning the repository can immediately run the application without installing or running database servers.
* **SQL & Relational Ready:** Built-in SQL support (via SQLite) allowing relational indexing and schema enforcement.
* **Cloud & Enterprise Pluggable:** Teams can easily switch to PostgreSQL, Supabase, Prisma, or MongoDB by supplying connection strings in environment variables without altering frontend components or agent logic.

---

## 2. Adapter Class Diagram

```mermaid
classDiagram
    class StorageAdapter {
        <<interface>>
        +getAgents() Promise~AgentProfile[]~
        +getAgentById(id) Promise~AgentProfile~
        +saveAgent(agent) Promise~void~
        +deleteAgent(id) Promise~void~
        +getSessions() Promise~SessionRecord[]~
        +getSessionById(id) Promise~SessionRecord~
        +saveSession(session) Promise~void~
        +getTranscripts(sessionId) Promise~TranscriptMessage[]~
        +appendMessage(sessionId, message) Promise~void~
    }

    class LocalFileAdapter {
        -dataDir: string
        +getAgents()
        +saveAgent()
        +getSessions()
        +saveSession()
        +getTranscripts()
        +appendMessage()
    }

    class SqliteAdapter {
        -dbPath: string
        +getAgents()
        +saveAgent()
        +getSessions()
        +saveSession()
        +getTranscripts()
        +appendMessage()
    }

    class PostgreSQLAdapter {
        -connectionString: string
        +getAgents()
        +saveAgent()
        +getSessions()
        +saveSession()
        +getTranscripts()
        +appendMessage()
    }

    class BrowserIndexedDBAdapter {
        -dbName: string
        +getAgents()
        +saveAgent()
        +getSessions()
        +saveSession()
        +getTranscripts()
        +appendMessage()
    }

    StorageAdapter <|.. LocalFileAdapter : Default JSON (Zero-Setup)
    StorageAdapter <|.. SqliteAdapter : Embedded SQL Engine
    StorageAdapter <|.. PostgreSQLAdapter : Production Cloud Plugin
    StorageAdapter <|.. BrowserIndexedDBAdapter : Client-Side Fast Cache
```

---

## 3. Data Entities & Schema Definition

### 3.1 Agent Profile (`AgentProfile`)
Represents an autonomous bargaining agent configured in the Workbench.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (e.g. `agent_alpha`) |
| `name` | `string` | User-assigned display name (e.g. *"Apex Procurement Bot"*) |
| `role` | `'BUYER' \| 'SELLER'` | Agent counterparty role |
| `strategy` | `'aggressive' \| 'cooperative' \| 'concessionist' \| 'balanced'` | Tactical bargaining profile |
| `targetPrice` | `string` | Desired settlement target in MON (e.g. `"7.0"`) |
| `reservationPrice` | `string` | Maximum willing to pay (Buyer) or minimum floor (Seller) |
| `referencePrice` | `string` | Initial anchor / list price baseline |
| `avatar` | `string` | Avatar identifier / icon |
| `walletAddress` | `string` | Associated Monad testnet wallet address |
| `createdAt` | `number` | Unix epoch timestamp |

### 3.2 Session Record (`SessionRecord`)
Captures a negotiation match between two agents.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique session ID (e.g. `session_001`) |
| `buyerAgentId` | `string` | Foreign key referencing Buyer Agent |
| `sellerAgentId` | `string` | Foreign key referencing Seller Agent |
| `itemDescription` | `string` | Asset or service negotiated |
| `anchorPrice` | `string` | Baseline price in MON |
| `finalPrice` | `string` | Settled price in MON (or null if rejected) |
| `status` | `'Settled' \| 'Rejected' \| 'Expired' \| 'Active'` | Final state of negotiation |
| `roundCount` | `number` | Total turns taken |
| `txHash` | `string?` | Monad transaction hash of settlement |
| `createdAt` | `number` | Unix epoch timestamp |

### 3.3 Transcript Message (`TranscriptMessage`)
Stores turn-by-turn dialogue, reasoning, and tool calls.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique message ID |
| `sessionId` | `string` | Foreign key referencing Session |
| `senderRole` | `'BUYER' \| 'SELLER'` | Turn sender |
| `agentName` | `string` | Name of the agent speaking |
| `content` | `string` | Natural language statement to counterparty |
| `thought` | `string` | **Internal LLM reasoning** (chain-of-thought strategy) |
| `toolCall` | `object?` | Tool name and arguments dispatched on-chain |
| `txHash` | `string?` | Monad transaction hash for the move |
| `timestamp` | `number` | Unix epoch timestamp |

---

## 4. SQL Schema (for SQLite & PostgreSQL Adapters)

When using the `SqliteAdapter` or `PostgreSQLAdapter`, the schema is instantiated using standard SQL:

```sql
-- Agents Table
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('BUYER', 'SELLER')),
    strategy TEXT NOT NULL,
    target_price TEXT NOT NULL,
    reservation_price TEXT NOT NULL,
    reference_price TEXT NOT NULL,
    avatar TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    buyer_agent_id TEXT NOT NULL REFERENCES agents(id),
    seller_agent_id TEXT NOT NULL REFERENCES agents(id),
    item_description TEXT NOT NULL,
    anchor_price TEXT NOT NULL,
    final_price TEXT,
    status TEXT NOT NULL,
    round_count INTEGER NOT NULL DEFAULT 0,
    tx_hash TEXT,
    created_at INTEGER NOT NULL
);

-- Transcripts Table
CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    sender_role TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    content TEXT NOT NULL,
    thought TEXT,
    tool_name TEXT,
    tool_args TEXT,
    tx_hash TEXT,
    timestamp INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(session_id);
```

---

## 5. Storage Plugin Configuration

The storage adapter is resolved via environment configuration in `.env`:

```env
# Storage Plugin Selection: 'json' (default) | 'sqlite' | 'postgres'
STORAGE_TYPE=sqlite

# Optional: Path for SQLite database file (default: ./data/negoagent.db)
SQLITE_DB_PATH=./data/negoagent.db

# Optional: PostgreSQL / Supabase connection URL
DATABASE_URL=postgresql://user:password@localhost:5432/negoagent
```
