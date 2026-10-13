# NEGOagent: Technical Architecture & System Specification

**Standard:** ERC-8004 (Trustless Agents)  
**Network:** Monad Testnet (Chain ID 10143)  
**Foundation Model:** Alibaba Cloud Qwen 3.8 Max  

---

## 1. System Overview

NEGOagent is a protocol-level agentic framework demonstrating autonomous on-chain economic negotiation. Built on Monad, it pairs frontier LLMs (Qwen 3.8 Max) with the ERC-8004 Trustless Agents standard (Identity and Reputation Registries).

The system enables agents to:
1. Possess self-sovereign on-chain identity (ERC-721 token IDs via Identity Registry).
2. Query counterparty on-chain track records prior to engagement.
3. Conduct multi-turn bilateral bargaining governed by an on-chain state machine (`Negotiation.sol`).
4. Execute atomic settlement on Monad with sub-second finality.
5. Publish verifiable reputation feedback to the ERC-8004 Reputation Registry post-settlement.

---

## 2. High-Level Architecture

```mermaid
graph TD
    subgraph Host["NEGOagent Execution Runtime (TypeScript / Node.js)"]
        subgraph BuyerAgent["Buyer Agent (Qwen 3.8 Max)"]
            B_LLM["Qwen 3.8 Max Engine<br/>(System Prompt + Goal)"]
            B_Tools["Buyer Tool Executor<br/>(viem + Buyer Wallet)"]
            B_LLM <-->|Function Calls & Results| B_Tools
        end

        subgraph SellerAgent["Seller Agent (Qwen 3.8 Max)"]
            S_LLM["Qwen 3.8 Max Engine<br/>(System Prompt + Goal)"]
            S_Tools["Seller Tool Executor<br/>(viem + Seller Wallet)"]
            S_LLM <-->|Function Calls & Results| S_Tools
        end

        Orchestrator["Agent Orchestrator / Turn Manager"]
        Orchestrator --- BuyerAgent
        Orchestrator --- SellerAgent
    end

    subgraph Monad["Monad Testnet (Chain ID: 10143 | ~600ms Finality)"]
        subgraph ERC8004["ERC-8004 Registries"]
            ID_REG["Identity Registry<br/>(0x8004A818BFB912233c491871b3d84c89A494BD9e)<br/>ERC-721 Agent Identities"]
            REP_REG["Reputation Registry<br/>(0x8004B663056A597Dffe9eCcC1965A193B7388713)<br/>Signed Feedback Signals"]
        end

        subgraph CoreContract["Bilateral Settlement Contract"]
            NEG_CONTRACT["Negotiation.sol<br/>State Machine & Escrow"]
        end
    end

    B_Tools -->|Register Identity| ID_REG
    S_Tools -->|Register Identity| ID_REG
    B_Tools -->|Read Reputation| REP_REG
    S_Tools -->|Read Reputation| REP_REG
    B_Tools -->|Open / Counter / Settle| NEG_CONTRACT
    S_Tools -->|Counter / Accept / Settle| NEG_CONTRACT
    B_Tools -->|Give Feedback for Seller| REP_REG
    S_Tools -->|Give Feedback for Buyer| REP_REG
```

---

## 3. End-to-End Interaction Flow

```mermaid
sequenceDiagram
    autonumber
    actor Observer as Observer / Runtime CLI
    participant Buyer as Buyer Agent (Qwen)
    participant Seller as Seller Agent (Qwen)
    participant IdReg as ERC-8004 IdentityRegistry
    participant Neg as Negotiation.sol
    participant RepReg as ERC-8004 ReputationRegistry

    Observer->>Buyer: Initialize Session
    Observer->>Seller: Initialize Session

    rect rgb(235, 245, 255)
        note over Buyer,IdReg: Stage 1: Identity Discovery & Verification
        Buyer->>IdReg: register(agentURI) -> Mint AgentId #A
        Seller->>IdReg: register(agentURI) -> Mint AgentId #B
        Buyer->>RepReg: getSummary(AgentId #B) -> Query Track Record
        Seller->>RepReg: getSummary(AgentId #A) -> Query Track Record
    end

    rect rgb(240, 255, 240)
        note over Buyer,Neg: Stage 2: Bilateral Negotiation State Machine
        Buyer->>Neg: openNegotiation(seller, buyerId, sellerId, refPrice)
        Neg-->>Buyer: NegotiationOpened Event

        loop Multi-Round Bargaining (Until Acceptance or Expiry)
            Buyer->>Buyer: Qwen analyzes context & submits offer
            Buyer->>Neg: makeOffer(negotiationId, amount)
            Neg-->>Seller: OfferSubmitted Event

            Seller->>Seller: Qwen evaluates reservation margin
            alt Accepts offer
                Seller->>Neg: acceptOffer(negotiationId)
                Neg-->>Neg: State -> Settled
                Neg-->>Buyer: NegotiationSettled Event
                Neg-->>Seller: NegotiationSettled Event
            else Counters offer
                Seller->>Neg: makeOffer(negotiationId, counterAmount)
                Neg-->>Buyer: OfferSubmitted Event
            else Rejects / Terminates
                Seller->>Neg: rejectOffer(negotiationId)
                Neg-->>Neg: State -> Rejected
            end
        end
    end

    rect rgb(255, 245, 235)
        note over Buyer,RepReg: Stage 3: Post-Settlement Reputation Signals
        Buyer->>RepReg: giveFeedback(target: AgentId #B, value: +100, tag: "deal_settled")
        Seller->>RepReg: giveFeedback(target: AgentId #A, value: +100, tag: "deal_settled")
    end

    Buyer-->>Observer: Export Verified Transcript with Monadscan Hashes
```

---

## 4. Negotiation State Machine

The contract `Negotiation.sol` enforces valid transitions between states:

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

## 5. Agent Decision & Tool Execution Flow

```mermaid
flowchart TD
    Start(["Turn Initiated"]) --> ReadChain["Read Monad State via viem<br/>(get_negotiation_state)"]
    ReadChain --> BuildPrompt["Format Context Window<br/>• Terms & history<br/>• Reservation parameters<br/>• Counterparty reputation score"]
    BuildPrompt --> CallModel["Invoke Qwen 3.8 Max<br/>(OpenAI Function-Calling Format)"]
    
    CallModel --> ParseChoice{"Model Output"}
    ParseChoice -->|"make_offer(amount)"| SendOffer["Submit Transaction: Negotiation.makeOffer()"]
    ParseChoice -->|"accept_offer()"| SendAccept["Submit Transaction: Negotiation.acceptOffer()"]
    ParseChoice -->|"reject_offer()"| SendReject["Submit Transaction: Negotiation.rejectOffer()"]
    
    SendOffer --> ConfirmTx["Wait for Block Inclusion (~600ms)"]
    SendAccept --> ConfirmTx
    SendReject --> ConfirmTx
    
    ConfirmTx --> CheckComplete{"Negotiation Terminated?"}
    CheckComplete -->|No| NextActor(["Yield Turn to Counterparty"])
    CheckComplete -->|Yes & Settled| SubmitRep["Execute submit_reputation_feedback()"]
    SubmitRep --> Finish(["Turn Complete"])
```

---

## 6. Directory Structure

```
negoagent/
├── README.md                      # Primary project guide & evaluation criteria
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
│   ├── tools/
│   │   ├── identity.ts            # ERC-8004 Identity Registry tools
│   │   ├── negotiation.ts         # On-chain negotiation tools
│   │   └── reputation.ts          # ERC-8004 Reputation Registry tools
│   └── utils/
│       ├── viemClient.ts          # Monad RPC & wallet client management
│       └── logger.ts              # Formatted observability & tx logger
├── scripts/
│   ├── deployNegotiation.ts       # Deployment script for Monad Testnet
│   └── fundWallets.ts             # Wallet balance & faucet helper
├── test/
│   ├── tools/
│   │   ├── identity.test.ts       # Identity registration & query tests
│   │   ├── negotiation.test.ts    # Contract interaction & tool tests
│   │   └── reputation.test.ts     # Feedback submission & query tests
│   ├── agentLoop.test.ts          # Agent loop & tool dispatcher unit tests
│   └── qwenClient.test.ts         # Tool schema & prompt formatting tests
└── demo/
    └── transcript-example.md      # Reference transcript with Monadscan tx links
```
