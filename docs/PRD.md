**NEGOagent – Product Requirements Document (PRD)**  
**Version 1.0**  
**Date:** 13 October 2026  
**Author role:** Senior Blockchain & Agentic Systems Engineer  
**Target Hackathon:** Metropolis (Monad) – Track 04: Trust, Identity & AI Infrastructure  
**Primary Bounty:** Alibaba Cloud Qwen 3.8 Max – “Push Qwen 3.8 Max into genuinely agentic territory on Monad” ($5,000 credits)  
**Scope:** Minimal viable product focused exclusively on Qwen 3.8 Max + ERC-8004  

This document is written so that a coding AI agent (or a human developer) can implement the entire project with minimal additional clarification. Every concept, decision, address, tool definition, and file structure is specified in detail.

---

### 1. Executive Summary

NEGOagent is a protocol-level demonstration that turns Qwen 3.8 Max into a genuine on-chain economic actor. Two (or more) instances of Qwen 3.8 Max negotiate a simple deal on Monad Testnet. Each agent possesses a portable, on-chain identity minted through the ERC-8004 Identity Registry. After a deal settles, the agents write structured feedback into the ERC-8004 Reputation Registry. The entire negotiation loop is driven by multi-turn tool calling: the model plans, selects tools, observes the resulting on-chain state, and adjusts its strategy.

The product deliberately stays minimal so it can be completed and demonstrated before the 13 October 2026 23:59 ET deadline. No Mera passkeys, no Cleanverse, no complex UI, and no new heavy infrastructure are required. The project re-uses already-deployed ERC-8004 registries and the public Monad Testnet.

**One-sentence pitch (for judges and README):**  
“NEGOagent lets Qwen 3.8 Max agents negotiate deals on Monad while holding portable ERC-8004 identities and updating verifiable on-chain reputation after every settled transaction — proving that frontier models can become accountable economic actors without a central platform.”

---

### 2. Problem Statement

AI agents are rapidly becoming economic actors. They can research, code, trade, and negotiate. However, three fundamental infrastructure problems remain unsolved at the protocol level:

1. **Identity** – An agent has no portable, censorship-resistant identity that travels across platforms and chains.  
2. **Reputation** – There is no standard, on-chain way for counterparties to record and later query how an agent behaved in previous interactions. Existing off-chain reputation systems are siloed and Sybil-vulnerable.  
3. **Trust during multi-round interaction** – When two agents negotiate, each needs a reliable way to know who the counterparty is and what its past track record looks like, without trusting a central server.

ERC-8004 (Trustless Agents) was created precisely to solve these problems. It defines three registries (Identity, Reputation, Validation). The Identity and Reputation registries are already live on Monad at deterministic CREATE2 addresses. Empirical studies in mid-2026 showed that the majority of existing reputation data is still Sybil-contaminated. Therefore a clean, transparent demonstration that uses the registries correctly and shows a complete agentic loop is high-value.

Monad’s 300 ms block time and 600 ms finality make multi-round negotiation practical. On slower chains the same loop would feel unusable. This is why the project belongs on Monad and why the Qwen bounty text specifically asks for “genuinely agentic territory on Monad”.

---

### 3. Goals and Success Metrics (Mapped to Judging Criteria)

All five official criteria are weighted 20 % each. The Qwen bounty adds an explicit filter that the model must drive real on-chain state changes through tool calling.

| Criterion | Concrete Success Metric for NEGOagent |
|-----------|---------------------------------------|
| Track Fit & Problem Relevance | Agents register via ERC-8004 Identity Registry and write feedback to Reputation Registry. Demo clearly shows identity + reputation solving a trust problem during negotiation. |
| Innovation & Impact | First public demonstration of Qwen 3.8 Max using ERC-8004 reputation *inside* an active negotiation loop rather than after the fact. |
| Monad Integration | All transactions occur on Monad Testnet. Contract addresses and transaction hashes are shown. README explains why 600 ms finality matters for multi-round agent negotiation. |
| Technical Excellence | Clean TypeScript (or Python) agent loop, well-typed tool definitions, minimal but correct Solidity, public GitHub with commit history, clear README. |
| Product Quality & Completeness | Working end-to-end prototype. Demo video ≤ 3 minutes shows live registration, negotiation rounds, settlement, and reputation write. Third party can run the code from the README. |

**Additional Qwen-bounty metric:** At least one complete multi-turn tool loop in which Qwen issues a tool call, the tool executes a Monad transaction, the result is fed back, and Qwen continues planning.

---

### 4. Product Vision and Scope

**In scope (must ship):**
- Agent registration on ERC-8004 Identity Registry
- Simple multi-round negotiation between two Qwen agents (or one live agent + one scripted counterparty)
- Settlement of the deal on Monad
- Writing of structured feedback to ERC-8004 Reputation Registry
- Full tool-calling loop driven by Qwen 3.8 Max
- Public GitHub repository, README, and ≤ 3-minute demo video

**Explicitly out of scope (to meet the deadline):**
- Mera / passkey accounts
- Cleanverse CVI/CVA
- Complex UI or web frontend
- Mainnet deployment
- Advanced Sybil-resistant reputation aggregation
- Multi-agent swarms beyond two parties
- Persistent off-chain memory databases

**Future extensions (not required for submission):** agent marketplaces, Validation Registry usage, Mera integration, Cleanverse gating.

---

### 5. User Personas

1. **Primary user (demo):** A judge or mentor who watches the 3-minute video and optionally clones the repository.  
2. **Secondary user (developer):** Another builder who wants to fork NEGOagent and plug a different model or different negotiation domain.  
3. **Economic actor (conceptual):** Future AI agents that will use the same ERC-8004 identity and reputation when negotiating with NEGOagent instances.

---

### 6. Functional Requirements

**FR-1 Agent Identity**  
- An agent must be able to call `register()` (or the appropriate overload) on the ERC-8004 Identity Registry.  
- The resulting ERC-721 token ID becomes the agent’s permanent identifier.  
- An agent card (JSON) containing name, description, and capabilities must be stored (IPFS or a simple data URI is acceptable for the MVP).

**FR-2 Negotiation State Machine**  
- A minimal on-chain negotiation contract (or a set of pure view + state-changing functions) must support:  
  - Opening a negotiation with a reference price and deadline  
  - Submitting an offer  
  - Accepting or rejecting an offer  
  - Settling the deal (transfer of a dummy ERC-20 or simple value)  
- All state must be readable by the agent via view functions.

**FR-3 Qwen Tool Calling Loop**  
- Qwen must be given a set of tools (see Section 11).  
- The model must be able to:  
  1. Read current negotiation state  
  2. Decide on an action  
  3. Call the corresponding tool  
  4. Receive the transaction hash and new state  
  5. Continue the conversation until the deal settles or the deadline expires

**FR-4 Reputation Write**  
- After settlement, each agent (or a designated feedback writer) must call the Reputation Registry to record structured feedback (value, tags, optional feedbackURI).

**FR-5 Observability**  
- Every important action must emit events or produce a clear console log that can be shown in the demo video and linked to the explorer.

---

### 7. Non-Functional Requirements

- **Performance:** A full negotiation round (plan → tool call → confirmation) must complete in under 15 seconds on Monad Testnet under normal conditions.  
- **Reliability:** The agent loop must handle failed transactions gracefully (retry or abort with clear message).  
- **Security:** Private keys used for demo wallets must never be committed to the repository. Use environment variables.  
- **Reproducibility:** A third party following the README must be able to run a complete negotiation in under 10 minutes.  
- **Open Source:** MIT or Apache-2.0 licence. All external code must be attributed.

---

### 8. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NEGOagent Runtime                        │
│  (Node.js / TypeScript or Python)                           │
│                                                             │
│  ┌──────────────┐     tool calls      ┌──────────────────┐  │
│  │  Qwen 3.8    │ ←────────────────→ │  Tool Executor   │  │
│  │  Max Client  │                     │  (viem + wallet) │  │
│  └──────────────┘                     └────────┬─────────┘  │
│         ▲                                      │            │
│         │ conversation history                 │ txs        │
│         │                                      ▼            │
└─────────┼──────────────────────────────────────┼────────────┘
          │                                      │
          │                                      ▼
          │                           ┌──────────────────────┐
          │                           │   Monad Testnet      │
          │                           │                      │
          │                           │  Identity Registry   │
          │                           │  Reputation Registry │
          │                           │  Negotiation Contract│
          │                           └──────────────────────┘
```

**Data flow of one negotiation round:**
1. System prompt + current on-chain state is sent to Qwen.
2. Qwen returns a tool call (e.g. `make_offer`).
3. Tool Executor signs and sends the transaction with viem.
4. Transaction is confirmed (≈ 600 ms finality).
5. New state is read and appended to the conversation.
6. Loop continues until settlement or timeout.

---

### 9. Technology Stack (Detailed Rationale)

| Layer | Technology | Version / Notes | Why chosen |
|-------|------------|-----------------|------------|
| Runtime | Node.js 20+ or Python 3.11+ | LTS | Fastest path for OpenAI-compatible SDKs |
| LLM Client | OpenAI SDK pointed at DashScope | Latest | Qwen 3.8 Max is fully OpenAI-compatible |
| Blockchain Client | viem | Latest | Official recommendation for Monad, tree-shakeable, excellent TypeScript support |
| Smart Contracts | Solidity 0.8.20+ | — | Minimal negotiation contract only |
| Package Manager | pnpm or npm | — | Standard |
| Environment | dotenv | — | Keep secrets out of source |
| Testing | Manual + simple scripts | — | No time for full test suite |
| Deployment | Local + Monad Testnet | — | Faucet available at faucet.monad.xyz |

**Qwen configuration (exact):**
- Base URL: `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` (or the current QwenCloud equivalent)
- Model: `qwen3.8-max` (confirm exact string in your console)
- Temperature: 0.3–0.6 for more deterministic negotiation behaviour
- Tool choice: `auto` or forced tool calls as needed

**Monad Testnet constants:**
- Chain ID: `10143`
- RPC: `https://testnet-rpc.monad.xyz`
- Native currency: MON
- Explorer: `https://testnet.monadscan.com`

**ERC-8004 addresses (Testnet):**
- Identity Registry: `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- Reputation Registry: `0x8004B663056A597Dffe9eCcC1965A193B7388713`

(Mainnet addresses are the same CREATE2 vanity addresses beginning with `0x8004A169…` and `0x8004BAa1…` if you later move to mainnet.)

---

### 10. On-chain Data Models

**Agent Card (JSON stored as token URI):**
```json
{
  "name": "NEGOagent-Buyer-01",
  "description": "Qwen 3.8 Max negotiation agent specialised in price discovery",
  "version": "1.0.0",
  "capabilities": ["negotiation", "offer", "accept", "reputation"],
  "model": "qwen3.8-max",
  "endpoints": {}
}
```

**Reputation feedback (ERC-8004):**
- `value`: integer (e.g. +100 for successful deal, –50 for timeout)
- `valueDecimals`: 0
- `tag1`: “deal_settled” or “timeout”
- `tag2`: negotiation ID
- `feedbackURI`: optional IPFS link to full transcript

**Minimal Negotiation Contract storage:**
- negotiationId → { opener, counterparty, referencePrice, currentOffer, status, deadline, settlementAmount }

---

### 11. Agent Tool Definitions (Critical for Qwen)

The model must be given the following tools (OpenAI function-calling format). Exact JSON schemas must be supplied to the coding agent.

1. `get_agent_identity` – returns the agent’s ERC-8004 token ID and owner  
2. `register_agent` – mints a new identity if none exists  
3. `get_negotiation_state` – reads current offer, status, remaining time  
4. `make_offer` – submits a new offer amount  
5. `accept_offer` – accepts the current offer and triggers settlement  
6. `reject_offer` – rejects and optionally ends the negotiation  
7. `submit_reputation_feedback` – writes feedback to the Reputation Registry  
8. `get_reputation_summary` – optional read of existing feedback for the counterparty

Each tool implementation must:
- Use viem to build and send the transaction
- Wait for confirmation
- Return a structured object containing `{ success, txHash, newState, error? }`

---

### 12. Directory / Code Structure

```
negoagent/
├── README.md                          # Full documentation for judges
├── package.json                       # or requirements.txt
├── .env.example                       # DASHSCOPE_API_KEY, PRIVATE_KEY, RPC_URL
├── .gitignore
├── contracts/
│   └── Negotiation.sol                # Minimal negotiation contract
├── src/
│   ├── index.ts                       # Entry point – runs a full negotiation
│   ├── config.ts                      # Addresses, chain ID, model name
│   ├── qwenClient.ts                  # OpenAI-compatible client wrapper
│   ├── tools/
│   │   ├── identity.ts                # register + get identity
│   │   ├── negotiation.ts             # all negotiation tools
│   │   └── reputation.ts              # feedback tools
│   ├── agentLoop.ts                   # Core multi-turn loop
│   └── utils/
│       ├── viemClient.ts
│       └── logger.ts
├── scripts/
│   ├── deployNegotiation.ts
│   └── fundWallets.ts
├── abis/
│   ├── IdentityRegistry.json
│   ├── ReputationRegistry.json
│   └── Negotiation.json
└── demo/
    └── transcript-example.md          # Sample conversation for the video
```

All TypeScript files must be fully typed. If Python is preferred, mirror the same structure with `.py` files and `web3.py` or `viem`-equivalent.

---

### 13. Implementation Plan (Remaining Hours)

Because the deadline is tonight, the plan is strictly prioritised:

**Phase 1 – Foundation (first 2–3 hours)**  
- Set up repository and environment  
- Obtain DashScope key and test a simple Qwen completion  
- Deploy or verify the Negotiation contract on Monad Testnet  
- Implement identity registration tool and successfully mint one agent

**Phase 2 – Core Loop (next 4–5 hours)**  
- Implement the remaining tools  
- Write the agentLoop that feeds tool results back to Qwen  
- Run a successful end-to-end negotiation between two agents (or one live + one scripted)

**Phase 3 – Polish & Submission (final 3–4 hours)**  
- Write comprehensive README (use the language guidelines from earlier conversation)  
- Record ≤ 3-minute demo video showing explorer links and live transactions  
- Push final commit, create the project on the Metropolis portal, submit

---

### 14. Demo Video Requirements (Exact)

Maximum 3 minutes. Suggested timeline:

0:00–0:20 – Show ERC-8004 identity on explorer  
0:20–0:50 – Show Qwen planning and issuing first tool call  
0:50–1:40 – Live negotiation rounds with transaction hashes  
1:40–2:10 – Settlement and reputation write  
2:10–2:50 – Quick README walk-through and how to reproduce  
2:50–3:00 – Closing statement linking to Track 04 problem

---

### 15. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| DashScope rate limits or key issues | Test key immediately; keep a fallback simpler model if needed for debugging |
| Gas / faucet problems | Use the official faucet early; keep two funded wallets ready |
| Qwen produces invalid tool calls | Strict JSON schema + retry logic with “please output valid tool call only” |
| Time runs out | Hard scope freeze after Phase 2; a working registration + one successful offer is already a strong partial demo |
| Sybil criticism | In README openly acknowledge that this is a demonstration of the primitive, not a full Sybil-resistant system |

---

### 16. Language Guidelines for README and Submission

Use the exact terminology of the track and criteria:

- “Protocol-level primitive for agent trust”  
- “Portable on-chain identity via ERC-8004”  
- “Verifiable reputation that travels with the agent”  
- “Qwen 3.8 Max driving multi-turn tool loops that read and write Monad state”  
- “Demonstrates why Monad’s sub-second finality makes multi-round agent negotiation practical”

Avoid: “revolutionary”, “super-intelligence”, “the future of AI”, empty hype.

---

### 17. Appendix – Quick Reference Constants

```
MONAD_TESTNET_CHAIN_ID = 10143
RPC_URL = "https://testnet-rpc.monad.xyz"
IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e"
REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713"
QWEN_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
QWEN_MODEL = "qwen3.8-max"
```