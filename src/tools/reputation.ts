import fs from "fs";
import path from "path";
import { PublicClient, WalletClient, toHex } from "viem";
import { CONFIG } from "../config.js";

const reputationAbiPath = path.resolve(process.cwd(), "abis", "ReputationRegistry.json");
const reputationAbi = JSON.parse(fs.readFileSync(reputationAbiPath, "utf8"));

export function formatReputationScore(value: number | bigint, decimals: number): number {
  const numericValue = typeof value === "bigint" ? Number(value) : value;
  return numericValue / Math.pow(10, decimals);
}

export const reputationToolSchemas = [
  {
    type: "function" as const,
    function: {
      name: "submit_reputation_feedback",
      description:
        "Records verifiable reputation feedback for a counterparty agent in the ERC-8004 Reputation Registry on Monad after a deal settles or terminates.",
      parameters: {
        type: "object",
        properties: {
          targetAgentId: {
            type: "number",
            description: "The ERC-8004 agentId (tokenId) of the counterparty receiving feedback",
          },
          value: {
            type: "number",
            description:
              "Feedback score (signed integer: e.g. +100 for successful deal completion, -50 for default/timeout)",
          },
          tag1: {
            type: "string",
            description: "Primary classification tag (e.g. 'deal_settled', 'negotiation_success', 'timeout')",
          },
          tag2: {
            type: "string",
            description: "Secondary tag, typically the negotiationId (e.g. 'neg_1')",
          },
          feedbackURI: {
            type: "string",
            description: "Optional URI linking to the negotiation transcript",
          },
        },
        required: ["targetAgentId", "value", "tag1"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_reputation_summary",
      description:
        "Queries historical reputation metrics (feedback count and aggregated score) for an agent from the ERC-8004 Reputation Registry.",
      parameters: {
        type: "object",
        properties: {
          agentId: {
            type: "number",
            description: "The ERC-8004 agentId of the agent to query",
          },
        },
        required: ["agentId"],
      },
    },
  },
];

export async function submitReputationFeedback(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    targetAgentId: bigint | number;
    value: number;
    valueDecimals?: number;
    tag1: string;
    tag2?: string;
    endpoint?: string;
    feedbackURI?: string;
    feedbackHash?: `0x${string}`;
  }
): Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }> {
  try {
    const account = walletClient.account;
    if (!account) throw new Error("No account connected to walletClient");

    const agentIdBigInt = BigInt(params.targetAgentId);
    const valueBigInt = BigInt(params.value);
    const valueDecimals = params.valueDecimals ?? 0;
    const tag1 = params.tag1;
    const tag2 = params.tag2 || "";
    const endpoint = params.endpoint || "";
    const feedbackURI = params.feedbackURI || "";
    const feedbackHash =
      params.feedbackHash ||
      ("0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`);

    const txHash = await (walletClient.writeContract as any)({
      address: CONFIG.reputationRegistryAddress,
      abi: reputationAbi,
      functionName: "giveFeedback",
      args: [
        agentIdBigInt,
        valueBigInt,
        valueDecimals,
        tag1,
        tag2,
        endpoint,
        feedbackURI,
        feedbackHash,
      ],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return {
      success: true,
      txHash,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

export async function getReputationSummary(
  publicClient: PublicClient,
  agentId: bigint | number
): Promise<{
  success: boolean;
  count: number;
  summaryValue: number;
  summaryValueDecimals: number;
  normalizedScore: number;
  error?: string;
}> {
  try {
    const agentIdBigInt = BigInt(agentId);

    const result = (await publicClient.readContract({
      address: CONFIG.reputationRegistryAddress,
      abi: reputationAbi,
      functionName: "getSummary",
      args: [agentIdBigInt],
    })) as [bigint, bigint, number];

    const count = Number(result[0]);
    const summaryValue = Number(result[1]);
    const summaryValueDecimals = Number(result[2]);
    const normalizedScore = formatReputationScore(summaryValue, summaryValueDecimals);

    return {
      success: true,
      count,
      summaryValue,
      summaryValueDecimals,
      normalizedScore,
    };
  } catch (error: any) {
    return {
      success: false,
      count: 0,
      summaryValue: 0,
      summaryValueDecimals: 0,
      normalizedScore: 0,
      error: error?.message || String(error),
    };
  }
}
