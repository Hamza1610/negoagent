# NEGOagent: Web Application & UI/UX Specification

This document details the interface architecture, user journeys, and component specifications for the NEGOagent web platform.

---

## 1. High-Level UI Architecture

```mermaid
graph TD
    subgraph UI["NEGOagent Frontend Application (Next.js / TypeScript)"]
        Landing["Landing Page (/)<br/>• Value Proposition<br/>• Protocol Specs (ERC-8004 + Monad)<br/>• Interactive Feature Cards"]
        
        subgraph Mode1["Mode A: Simulation Workbench (/workbench)"]
            SimBoard["Agent Board (/workbench/agents)<br/>Create, name & configure custom agents"]
            SimArena["Bargaining Arena (/workbench)<br/>Live turn-by-turn negotiation"]
            SimThought["LLM Reasoning HUD<br/>Live thoughts & concession math"]
            SimHistory["Session History (/workbench/history)<br/>Cross-agent transcript archive"]
        end

        subgraph Mode2["Mode B: Live Monad On-Chain (/app)"]
            WalletCard["Wallet & Faucet Center<br/>MetaMask / Monad Testnet Connect"]
            IdMint["ERC-8004 Identity Hub<br/>Mint on-chain agent NFT ID"]
            LiveNeg["Live Dealmaker<br/>Deploy & execute on Negotiation.sol"]
            RepWrite["Reputation Ledger<br/>Post-deal signed feedback write"]
        end
    end

    subgraph Storage["Pluggable Storage Layer (docs/STORAGE_PLUGINS.md)"]
        Adapter["StorageAdapter Interface<br/>(JSON / SQLite / PostgreSQL)"]
    end

    Landing --> Mode1
    Landing --> Mode2
    SimBoard <--> Storage
    SimHistory <--> Storage
    SimArena <--> Storage
```

---

## 2. Dual-Mode User Journey & Interaction Flow

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
        User->>UI: Navigates to /workbench/agents & creates custom named agent
        UI->>Storage: Persists agent profile (name, strategy, budget)
        User->>UI: Pairs Agent A & Agent B on /workbench
        User->>UI: Clicks "Launch Negotiation"
        loop Each Negotiation Turn
            UI->>LLM: Requests strategic move with current on-chain state
            LLM-->>UI: Emits "Internal Thought / Reasoning"
            UI-->>User: Displays animated Thought HUD (concession math)
            LLM-->>UI: Emits Tool Call (make_offer / accept_offer)
            UI-->>User: Updates on-chain status & dynamic offer graph
            UI->>Storage: Records turn messages & reasoning
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

## 3. Screen-by-Screen Specifications

### 3.1 Landing Page (`/`)
* **Hero Section:**
  * Animated title: *"Autonomous AI Economic Negotiation on Monad"*.
  * Dark obsidian aesthetic with neon purple & cyan gradients.
  * Real-time network statistics: Monad Testnet (`10143`), ~600ms Finality, ERC-8004 Standard, Qwen 3.8 Max.
  * Primary CTAs: **"Launch Simulation Workbench"** and **"Connect Live On-Chain"**.
* **Protocol Showcase:**
  * Interactive 3-card diagram explaining:
    1. *Portable Identity (ERC-8004)*: ERC-721 token identities with JSON Agent Cards.
    2. *High-Frequency Bargaining*: Why sub-second finality is vital for multi-turn agent economies.
    3. *Verifiable Reputation*: Signed on-chain feedback signals preventing Sybil contamination.

### 3.2 Simulation Workbench (`/workbench`)
* **Matchmaking & Pairing Bar:**
  * Select Buyer Agent vs Seller Agent.
  * Set item description (e.g. *"Decentralized High-Throughput RPC Node Subscription"*).
  * Configure Reference Anchor Price (e.g. `10.0 MON`).
* **Confrontation Arena:**
  * Split-screen layout: Buyer Agent on left (Cyan), Seller Agent on right (Magenta).
  * Center Dynamic Offer Graph: Line curve tracking offer rounds over time.
  * On-chain status pills: `Created` → `Active` → `Accepted` → `Settled`.
* **LLM Real-Time "Reasoning / Thinking" Inspector:**
  * Collapsible, dedicated terminal HUD attached to each agent turn.
  * Displays the raw internal thought process of Qwen 3.8 Max before it issues a tool call (e.g., evaluating reservation boundaries, calculating concession margins).

### 3.3 Agent Management Board (`/workbench/agents`)
* Directory grid of all created agents.
* Details on each card: Custom Name, Role (Buyer/Seller), Avatar, Strategy Profile (*Aggressive*, *Cooperative*, *Concessionist*, *Balanced*), Target Price, Reservation Boundary.
* **"Create Agent" Modal:** Form allowing users to name new agents, choose avatars, tune strategy sliders, and set budget thresholds.

### 3.4 Session History & Matrix (`/workbench/history`)
* Searchable table of past negotiation matches.
* Columns: Session ID, Buyer, Seller, Final Agreed Price, Win Margin, Timestamp, and "View Transcript".
* Modal view showing the full turn-by-turn playback of any past session.

### 3.5 Live On-Chain Mode (`/app`)
* Web3 Wallet connection (MetaMask / Monad Testnet).
* Real-time MON balance HUD with direct link to the Monad Faucet.
* 1-Click ERC-8004 Identity Minter on Monad Testnet.
* Direct bilateral dealmaker running on `Negotiation.sol` with live Monadscan transaction links.
