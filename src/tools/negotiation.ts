import fs from "fs";
import path from "path";
import {
  PublicClient,
  WalletClient,
  parseEther,
  formatEther,
  decodeEventLog,
} from "viem";
import { CONFIG } from "../config.js";

const negotiationAbiPath = path.resolve(process.cwd(), "abis", "Negotiation.json");
const negotiationAbi = JSON.parse(fs.readFileSync(negotiationAbiPath, "utf8"));

export function decodeNegotiationStatus(statusNum: number): string {
  switch (statusNum) {
    case 0:
      return "Created";
    case 1:
      return "Active";
    case 2:
      return "Accepted";
    case 3:
      return "Settled";
    case 4:
      return "Rejected";
    case 5:
      return "Expired";
    default:
      return "Unknown";
  }
}

export function parseMonAmount(mon: string | number): bigint {
  return parseEther(String(mon));
}

export function formatMonAmount(wei: bigint): string {
  return formatEther(wei);
}

export const negotiationToolSchemas = [
  {
    type: "function" as const,
    function: {
      name: "open_negotiation",
      description:
        "Opens a new on-chain negotiation session on Monad with a counterparty seller, establishing the item description, reference price, and deadline.",
      parameters: {
        type: "object",
        properties: {
          sellerAddress: {
            type: "string",
            description: "The Ethereum address of the seller agent",
          },
          buyerAgentId: {
            type: "number",
            description: "The ERC-8004 token ID of the buyer agent",
          },
          sellerAgentId: {
            type: "number",
            description: "The ERC-8004 token ID of the seller agent",
          },
          referencePriceMon: {
            type: "string",
            description: "The initial reference / list price in MON (e.g. '10.0')",
          },
          durationSeconds: {
            type: "number",
            description: "Duration before expiration in seconds (default: 3600)",
          },
          itemDescription: {
            type: "string",
            description: "Short description of the good, service, or task being negotiated",
          },
        },
        required: [
          "sellerAddress",
          "buyerAgentId",
          "sellerAgentId",
          "referencePriceMon",
          "itemDescription",
        ],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "make_offer",
      description:
        "Submits a counter-offer amount on Monad Testnet for an active negotiation.",
      parameters: {
        type: "object",
        properties: {
          negotiationId: {
            type: "number",
            description: "The ID of the active negotiation",
          },
          amount: {
            type: "string",
            description: "The offer amount in MON (e.g. '7.5')",
          },
        },
        required: ["negotiationId", "amount"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "accept_offer",
      description:
        "Accepts the counterparty's latest offer on Monad Testnet and transitions the negotiation to Settled.",
      parameters: {
        type: "object",
        properties: {
          negotiationId: {
            type: "number",
            description: "The ID of the active negotiation to accept and settle",
          },
        },
        required: ["negotiationId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reject_offer",
      description:
        "Rejects the counterparty's latest offer and terminates the negotiation as Rejected.",
      parameters: {
        type: "object",
        properties: {
          negotiationId: {
            type: "number",
            description: "The ID of the negotiation to reject",
          },
        },
        required: ["negotiationId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_negotiation_state",
      description:
        "Reads the latest on-chain state of a negotiation from Monad Testnet (current offer, last offerer, round, status, deadline).",
      parameters: {
        type: "object",
        properties: {
          negotiationId: {
            type: "number",
            description: "The ID of the negotiation to query",
          },
        },
        required: ["negotiationId"],
      },
    },
  },
];

export async function openNegotiation(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    sellerAddress: `0x${string}`;
    buyerAgentId: number | bigint;
    sellerAgentId: number | bigint;
    referencePriceMon: string;
    durationSeconds?: number;
    itemDescription: string;
  }
): Promise<{ success: boolean; negotiationId?: bigint; txHash?: `0x${string}`; error?: string }> {
  try {
    const refPriceWei = parseMonAmount(params.referencePriceMon);
    const duration = BigInt(params.durationSeconds || 3600);

    const txHash = await (walletClient.writeContract as any)({
      address: CONFIG.negotiationContractAddress,
      abi: negotiationAbi,
      functionName: "openNegotiation",
      args: [
        params.sellerAddress,
        BigInt(params.buyerAgentId),
        BigInt(params.sellerAgentId),
        refPriceWei,
        duration,
        params.itemDescription,
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    let negotiationId: bigint | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded: any = decodeEventLog({
          abi: negotiationAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "NegotiationOpened" && decoded.args) {
          const args = decoded.args as { id: bigint };
          negotiationId = args.id;
          break;
        }
      } catch {
        // Continue if event doesn't match ABI
      }
    }

    return {
      success: true,
      negotiationId,
      txHash,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

export async function makeOffer(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    negotiationId: number | bigint;
    amount: string;
  }
): Promise<{ success: boolean; round?: number; txHash?: `0x${string}`; error?: string }> {
  try {
    const offerWei = parseMonAmount(params.amount);

    const txHash = await (walletClient.writeContract as any)({
      address: CONFIG.negotiationContractAddress,
      abi: negotiationAbi,
      functionName: "makeOffer",
      args: [BigInt(params.negotiationId), offerWei],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    let round: number | undefined;
    for (const log of receipt.logs) {
      try {
        const decoded: any = decodeEventLog({
          abi: negotiationAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "OfferSubmitted" && decoded.args) {
          const args = decoded.args as { round: number };
          round = args.round;
          break;
        }
      } catch {
        // Continue
      }
    }

    return {
      success: true,
      round,
      txHash,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

export async function acceptOffer(
  walletClient: WalletClient,
  publicClient: PublicClient,
  negotiationId: number | bigint
): Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }> {
  try {
    const txHash = await (walletClient.writeContract as any)({
      address: CONFIG.negotiationContractAddress,
      abi: negotiationAbi,
      functionName: "acceptOffer",
      args: [BigInt(negotiationId)],
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

export async function rejectOffer(
  walletClient: WalletClient,
  publicClient: PublicClient,
  negotiationId: number | bigint
): Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }> {
  try {
    const txHash = await (walletClient.writeContract as any)({
      address: CONFIG.negotiationContractAddress,
      abi: negotiationAbi,
      functionName: "rejectOffer",
      args: [BigInt(negotiationId)],
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

export interface NegotiationState {
  id: number;
  buyer: `0x${string}`;
  seller: `0x${string}`;
  buyerAgentId: number;
  sellerAgentId: number;
  referencePriceMon: string;
  currentOfferMon: string;
  lastOfferer: `0x${string}`;
  round: number;
  deadline: number;
  status: string;
  itemDescription: string;
}

export async function getNegotiationState(
  publicClient: PublicClient,
  negotiationId: number | bigint
): Promise<{ success: boolean; state?: NegotiationState; error?: string }> {
  try {
    const result = (await publicClient.readContract({
      address: CONFIG.negotiationContractAddress,
      abi: negotiationAbi,
      functionName: "getNegotiation",
      args: [BigInt(negotiationId)],
    })) as [
      bigint,
      `0x${string}`,
      `0x${string}`,
      bigint,
      bigint,
      bigint,
      bigint,
      `0x${string}`,
      number,
      bigint,
      number,
      string
    ];

    const state: NegotiationState = {
      id: Number(result[0]),
      buyer: result[1],
      seller: result[2],
      buyerAgentId: Number(result[3]),
      sellerAgentId: Number(result[4]),
      referencePriceMon: formatMonAmount(result[5]),
      currentOfferMon: formatMonAmount(result[6]),
      lastOfferer: result[7],
      round: result[8],
      deadline: Number(result[9]),
      status: decodeNegotiationStatus(result[10]),
      itemDescription: result[11],
    };

    return {
      success: true,
      state,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}
