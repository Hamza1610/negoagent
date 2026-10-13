# NEGOagent: Technical Architecture & System Specification

**Standard:** ERC-8004 (Trustless Agents)  
**Network:** Monad Testnet (Chain ID 10143)  
**Foundation Model:** Alibaba Cloud Qwen 3.8 Max  

---

## 1. System Overview

NEGOagent is a protocol-level agentic framework demonstrating autonomous on-chain economic negotiation. Built on Monad, it pairs frontier LLMs (Qwen 3.8 Max) with the ERC-8004 Trustless Agents standard (Identity and Reputation Registries).

The platform operates across two distinct environments:
1. **Simulation Workbench (`/workbench`):** Sandbox to create, configure, and inspect multiple agents with custom wallets, observe live bargaining turn-by-turn, inspect internal LLM reasoning, and archive cross-agent negotiation transcripts.
2. **Live On-Chain Arena (`/app`):** Direct Web3 wallet integration on Monad Testnet to mint portable ERC-8004 identity NFTs, initiate deals on `Negotiation.sol`, and write verifiable reputation signals.

---

## Documentation Structure

To maintain modular, high-fidelity documentation, the specifications are categorized as follows:
* **[docs/ARCHITECTURE.md](file:///c:/Users/HP-PC/Desktop/negoagent/docs/ARCHITECTURE.md):** Master System Architecture, Smart Contracts & Core State Machine.
* **[docs/UI_SPECIFICATION.md](file:///c:/Users/HP-PC/Desktop/negoagent/docs/UI_SPECIFICATION.md):** Frontend UI/UX, Dual-Mode Flows, `/workbench`, `/app`, and Thought Inspector.
* **[docs/STORAGE_PLUGINS.md](file:///c:/Users/HP-PC/Desktop/negoagent/docs/STORAGE_PLUGINS.md):** Pluggable Storage Layer, Database Adapter Pattern, and SQL Schemas.
* **[docs/PRD.md](file:///c:/Users/HP-PC/Desktop/negoagent/docs/PRD.md):** Core Product Requirements & Metrics.

---

## 2. High-Level System Architecture

```mermaid
graph TD
    subgraph UI["NEGOagent Frontend Application (Next.js / TypeScript)"]
        Landing["Landing Page (/)<br/>• Value Proposition<br/>• Protocol Specs (ERC-8004 + Monad)<br/>• Interactive Feature Cards"]
        
        subgraph Mode1["Mode A: Simulation Workbench (/workbench)"]
            SimBoard["Agent Board & Sandbox<br/>Create & inspect custom agents"]
            SimArena["Bargaining Arena<br/>Live turn-by-turn negotiation"]
            SimThought["LLM Reasoning HUD<br/>Live thoughts & concession math"]
            SimHistory["Session History<br/>Cross-agent transcript archive"]
        end

        subgraph Mode2["Mode B: Live Monad On-Chain (/app)"]
            WalletCard["Wallet & Faucet Center<br/>MetaMask / Monad Testnet Connect"]
            IdMint["ERC-8004 Identity Hub<br/>Mint on-chain agent NFT ID"]
            LiveNeg["Live Dealmaker<br/>Deploy & execute on Negotiation.sol"]
            RepWrite["Reputation Ledger<br/>Post-deal signed feedback write"]
        end
    end

    subgraph Storage["Pluggable Storage Layer (Database Plugin)"]
        PluginRouter["Storage Adapter Interface"]
        LocalAdapter["Local JSON / SQLite Adapter<br/>(Default, zero-setup)"]
        CloudAdapter["PostgreSQL / Supabase / Prisma Plugin<br/>(Optional cloud persistence)"]
        PluginRouter --- LocalAdapter
        PluginRouter --- CloudAdapter
    end

    subgraph BackendRuntime["Backend Execution Engine"]
        QwenRunner["Qwen 3.8 Max Agent Engine<br/>(DashScope / OpenRouter API)"]
        ViemRelay["Viem Monad Contract Interactor<br/>(Reads/Writes on Monad 10143)"]
    end

    subgraph Monad["Monad Testnet (Chain ID: 10143 | ~600ms Finality)"]
        ID_REG["ERC-8004 Identity Registry<br/>(0x8004A818BFB912233c491871b3d84c89A494BD9e)"]
        REP_REG["ERC-8004 Reputation Registry<br/>(0x8004B663056A597Dffe9eCcC1965A193B7388713)"]
        NEG_CONTRACT["Negotiation.sol<br/>Bilateral State Machine"]
    end

    Landing --> Mode1
    Landing --> Mode2
    SimBoard <--> Storage
    SimHistory <--> Storage
    SimArena <--> QwenRunner
    QwenRunner <--> ViemRelay
    LiveNeg <--> ViemRelay
    IdMint <--> ViemRelay
    RepWrite <--> ViemRelay
    ViemRelay <--> Monad
```

---

## 3. User Journey & Dual-Mode Interaction Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Evaluator
    participant UI as NEGOagent UI
    participant Storage as Pluggable Storage Layer
    participant LLM as Qwen 3.8 Max Engine
    participant Chain as Monad Testnet (ERC-8004)

    User->>UI: Lands on Home Page (/)
    UI-->>User: Views interactive protocol explainer & feature cards

    alt Mode A: Simulation Workbench (/workbench)
        User->>UI: Creates or configures Agent A & Agent B
        UI->>Storage: Persists agent configs (name, strategy, budget)
        User->>UI: Pairs agents & clicks "Launch Simulation"
        loop Each Negotiation Turn
            UI->>LLM: Requests strategic move with current on-chain state
            LLM-->>UI: Emits "Internal Thought / Reasoning"
            UI-->>User: Displays animated Thought HUD (concession math)
            LLM-->>UI: Emits Tool Call (make_offer / accept_offer)
            UI-->>User: Updates on-chain status & dynamic offer graph
        end
        UI->>Storage: Archives session transcript & settlement metrics
        UI-->>User: Displays Settlement Modal + ERC-8004 Reputation Log

    else Mode B: Live Monad On-Chain Mode (/app)
        User->>UI: Connects Web3 Wallet (MetaMask on Monad Testnet)
        UI-->>User: Displays MON balance + Faucet link
        User->>UI: Mints ERC-8004 Identity token on Monad
        UI->>Chain: Executes IdentityRegistry.register()
        Chain-->>UI: Confirmed (Agent ID # minted)
        User->>UI: Opens live negotiation against counterparty
        UI->>Chain: Executes Negotiation.sol contract calls
        Chain-->>UI: Real Monad tx hashes + sub-second block receipts
        User->>UI: Submits reciprocal feedback to ReputationRegistry.sol
        Chain-->>UI: Verified reputation score updated on-chain
    end
```

---

## 4. Pluggable Storage Architecture (Database Plugin Pattern)

To allow total flexibility across local demos, offline testing, and cloud deployments, NEGOagent implements an extensible repository interface:

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

    class LocalStorageAdapter {
        -filePath: string
        +getAgents()
        +saveAgent()
        +getSessions()
        +saveSession()
    }

    class PostgreSQLAdapter {
        -connectionString: string
        +getAgents()
        +saveAgent()
        +getSessions()
        +saveSession()
    }

    class BrowserIndexedDBAdapter {
        -dbName: string
        +getAgents()
        +saveAgent()
        +getSessions()
        +saveSession()
    }

    StorageAdapter <|.. LocalStorageAdapter : Default Zero-Setup
    StorageAdapter <|.. PostgreSQLAdapter : Enterprise Cloud
    StorageAdapter <|.. BrowserIndexedDBAdapter : Client-Side Fast
```

* **Default (Out-of-the-Box):** `LocalStorageAdapter` writes to local structured JSON/SQLite files (`data/agents.json`, `data/sessions.json`). No external database installation or setup required.
* **Extensible Plugins:** Developers can swap in PostgreSQL, Supabase, or MongoDB simply by providing environment variables (`STORAGE_TYPE=postgres`, `DATABASE_URL=...`).

---

## 5. Negotiation State Machine (`Negotiation.sol`)

```mermaid
stateDiagram-v2
    [*] --> None
    None --> Created: openNegotiation()
    Created --> Active: First offer submitted
    Active --> Active: Counter-offer submitted (makeOffer)
    
    Active --> Accepted: acceptOffer()
    Accepted --> Settled: Settlement executed
    
    Active --> Rejected: rejectOffer()
    Active --> Expired: block.timestamp > deadline
    
    Settled --> FeedbackWritten: giveFeedback() on ERC-8004
    Rejected --> [*]
    Expired --> [*]
    FeedbackWritten --> [*]
```

---

## 6. Directory Structure

```
negoagent/
├── README.md                      # Primary project guide
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript compiler options
├── vitest.config.ts               # Test runner configuration (TDD)
├── .env.example                   # Environment variable template
├── .gitignore                     # Repository hygiene
├── contracts/
│   └── Negotiation.sol            # Bilateral negotiation & settlement contract
├── abis/
│   ├── IdentityRegistry.json      # ERC-8004 Identity Registry ABI
│   ├── ReputationRegistry.json    # ERC-8004 Reputation Registry ABI
│   └── Negotiation.json           # Deployed Negotiation ABI
├── src/
│   ├── index.ts                   # CLI entrypoint for dual-agent session
│   ├── config.ts                  # Constants, chain configuration, addresses
│   ├── qwenClient.ts              # Qwen 3.8 Max model wrapper with retry logic
│   ├── agentLoop.ts               # Autonomous multi-turn tool-calling loop
│   ├── storage/                   # Pluggable Storage Layer
│   │   ├── adapter.ts             # StorageAdapter interface
│   │   ├── localAdapter.ts        # Default local JSON/file implementation
│   │   └── index.ts               # Plugin resolver factory
│   ├── tools/
│   │   ├── identity.ts            # ERC-8004 Identity Registry tools
│   │   ├── negotiation.ts         # On-chain negotiation tools
│   │   └── reputation.ts          # ERC-8004 Reputation Registry tools
│   └── utils/
│       ├── viemClient.ts          # Monad RPC & wallet client management
│       └── logger.ts              # Formatted observability & tx logger
├── web/                           # Next.js 14+ UI Application
│   ├── app/
│   │   ├── page.tsx               # Landing Page
│   │   ├── workbench/             # Simulation Workbench
│   │   │   ├── page.tsx           # Bargaining Arena & Live HUD
│   │   │   ├── agents/page.tsx    # Agent Management & Creator
│   │   │   └── history/page.tsx   # Cross-agent transcripts archive
│   │   └── app/page.tsx           # Live Monad On-Chain Mode
│   └── components/                # UI design system components
├── test/                          # 100% Green TDD Test Suite (Vitest)
└── demo/
    └── transcript-example.md      # Reference transcript with Monadscan tx links
```
