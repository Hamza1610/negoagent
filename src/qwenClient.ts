import OpenAI from "openai";
import { CONFIG } from "./config.js";
import { identityToolSchemas } from "./tools/identity.js";
import { negotiationToolSchemas } from "./tools/negotiation.js";
import { reputationToolSchemas } from "./tools/reputation.js";

let openaiClient: OpenAI | null = null;

export function getQwenClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: CONFIG.dashscopeApiKey || "mock-api-key-for-tests",
      baseURL: CONFIG.dashscopeBaseUrl,
    });
  }
  return openaiClient;
}

export function getAllAgentTools() {
  return [
    ...identityToolSchemas,
    ...negotiationToolSchemas,
    ...reputationToolSchemas,
  ];
}

export function parseToolCallArguments(argsString: string): Record<string, any> {
  try {
    return JSON.parse(argsString);
  } catch {
    return {};
  }
}

export interface SystemPromptConfig {
  role: "BUYER" | "SELLER";
  agentName: string;
  agentId?: number | bigint;
  targetPrice: string;
  reservationPrice: string; // Maximum willing to pay (Buyer) or minimum willing to accept (Seller)
  referencePrice: string;
  itemDescription: string;
}

export function buildAgentSystemPrompt(cfg: SystemPromptConfig): string {
  const isBuyer = cfg.role === "BUYER";

  return `You are ${cfg.agentName}, an autonomous AI economic agent powered by Qwen 3.8 Max operating on the Monad blockchain.

=== ROLE & GOAL ===
Role: ${cfg.role}
Target Deal Item: ${cfg.itemDescription}
Reference / Anchor Price: ${cfg.referencePrice} MON
Your Target Goal: ${cfg.targetPrice} MON
${
  isBuyer
    ? `Your Maximum Reservation Price: ${cfg.reservationPrice} MON. DO NOT exceed this price under any circumstances.`
    : `Your Minimum Reservation Floor Price: ${cfg.reservationPrice} MON. DO NOT accept any offer below this floor.`
}

=== BLOCKCHAIN & PROTOCOL CONTEXT ===
- Network: Monad Testnet (sub-second finality, 600ms block confirmation).
- Protocol: ERC-8004 (Trustless Agents standard).
- Identity: You hold an on-chain identity token ID in the ERC-8004 Identity Registry.
- Reputation: You query counterparty reputation before deal execution, and you submit verifiable reputation feedback (+100 for successful deal settlement) post-settlement.

=== NEGOTIATION RULES ===
1. You MUST use function calling (tools) to inspect state and submit on-chain transactions.
2. In each turn, review current offers and reason step-by-step:
   - If the counterparty's latest offer is within your reservation threshold, call \`accept_offer\` to settle the deal.
   - If their offer is outside your boundary, calculate a tactical counter-offer closer to your target and call \`make_offer\`.
   - If negotiations reach an impasse after multiple rounds with no movement, you may call \`reject_offer\`.
3. Once the deal is settled, ALWAYS call \`submit_reputation_feedback\` to record positive feedback for the counterparty on Monad.
4. Keep your internal chain of thought strategic, disciplined, and focused on value capture.`;
}
