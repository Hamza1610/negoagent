import { PublicClient, WalletClient } from "viem";
import { getQwenClient, getAllAgentTools, parseToolCallArguments } from "./qwenClient.js";
import { CONFIG } from "./config.js";
import { logger } from "./utils/logger.js";
import * as identityModule from "./tools/identity.js";
import * as negotiationModule from "./tools/negotiation.js";
import * as reputationModule from "./tools/reputation.js";

export function safeJsonStringify(data: any): string {
  return JSON.stringify(data, (_, value) =>
    typeof value === "bigint" ? value.toString() : value
  );
}

export interface ToolExecutionContext {
  walletClient: WalletClient;
  publicClient: PublicClient;
  role: "BUYER" | "SELLER";
  agentName: string;
  agentId?: number | bigint;
  identityTools?: typeof identityModule;
  negotiationTools?: typeof negotiationModule;
  reputationTools?: typeof reputationModule;
}

export async function executeAgentTool(
  ctx: ToolExecutionContext,
  toolName: string,
  args: Record<string, any>
): Promise<{ success: boolean; [key: string]: any }> {
  const identity = ctx.identityTools || identityModule;
  const negotiation = ctx.negotiationTools || negotiationModule;
  const reputation = ctx.reputationTools || reputationModule;

  try {
    switch (toolName) {
      case "register_agent": {
        const card: identityModule.AgentCard = {
          name: args.name || ctx.agentName,
          description: args.description || "Qwen 3.8 Max autonomous economic agent",
          version: "1.0.0",
          capabilities: ["negotiation", "offer", "accept", "reputation"],
          model: CONFIG.qwenModel,
        };
        return await identity.registerAgent(ctx.walletClient, ctx.publicClient, card);
      }

      case "get_agent_identity": {
        const address =
          (args.address as `0x${string}`) ||
          (ctx.walletClient.account?.address as `0x${string}`);
        return await identity.getAgentIdentity(ctx.publicClient, address);
      }

      case "open_negotiation": {
        return await negotiation.openNegotiation(
          ctx.walletClient,
          ctx.publicClient,
          {
            sellerAddress: args.sellerAddress,
            buyerAgentId: args.buyerAgentId,
            sellerAgentId: args.sellerAgentId,
            referencePriceMon: args.referencePriceMon,
            durationSeconds: args.durationSeconds,
            itemDescription: args.itemDescription,
          }
        );
      }

      case "make_offer": {
        return await negotiation.makeOffer(ctx.walletClient, ctx.publicClient, {
          negotiationId: args.negotiationId,
          amount: String(args.amount),
        });
      }

      case "accept_offer": {
        return await negotiation.acceptOffer(
          ctx.walletClient,
          ctx.publicClient,
          args.negotiationId
        );
      }

      case "reject_offer": {
        return await negotiation.rejectOffer(
          ctx.walletClient,
          ctx.publicClient,
          args.negotiationId
        );
      }

      case "get_negotiation_state": {
        return await negotiation.getNegotiationState(
          ctx.publicClient,
          args.negotiationId
        );
      }

      case "submit_reputation_feedback": {
        return await reputation.submitReputationFeedback(
          ctx.walletClient,
          ctx.publicClient,
          {
            targetAgentId: args.targetAgentId,
            value: Number(args.value),
            tag1: args.tag1,
            tag2: args.tag2,
            feedbackURI: args.feedbackURI,
          }
        );
      }

      case "get_reputation_summary": {
        return await reputation.getReputationSummary(
          ctx.publicClient,
          args.agentId
        );
      }

      default:
        return {
          success: false,
          error: `Unknown tool name: ${toolName}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

/**
 * Runs a single autonomous turn for an agent:
 * 1. Sends current message history + system prompt to Qwen 3.8 Max
 * 2. Parses tool calls
 * 3. Executes tool calls via on-chain viem client
 * 4. Appends tool results to conversation and repeats until final response or deal state change
 */
export async function runAgentTurn(params: {
  ctx: ToolExecutionContext;
  messages: Array<any>;
  maxToolSteps?: number;
}): Promise<{
  actionTaken: string;
  toolResults: Array<{ name: string; result: any }>;
  content?: string;
  settled?: boolean;
}> {
  const { ctx, messages } = params;
  const maxSteps = params.maxToolSteps || 4;
  const qwen = getQwenClient();
  const tools = getAllAgentTools();
  const toolResults: Array<{ name: string; result: any }> = [];

  let currentStep = 0;
  let actionTaken = "idle";
  let settled = false;

  while (currentStep < maxSteps) {
    currentStep++;

    const response = await qwen.chat.completions.create({
      model: CONFIG.qwenModel,
      messages: messages as any,
      tools: tools as any,
      tool_choice: "auto",
      temperature: 0.3,
    });

    const choice = response.choices[0];
    const message = choice.message;
    messages.push(message);

    if (message.content) {
      logger.agent(ctx.role, `${message.content}`);
    }

    if (!message.tool_calls || message.tool_calls.length === 0) {
      return {
        actionTaken,
        toolResults,
        content: message.content || undefined,
        settled,
      };
    }

    // Process tool calls
    for (const tc of message.tool_calls) {
      const toolName = tc.function.name;
      const toolArgs = parseToolCallArguments(tc.function.arguments);

      logger.toolCall(toolName, toolArgs);
      actionTaken = toolName;

      const result = await executeAgentTool(ctx, toolName, toolArgs);
      toolResults.push({ name: toolName, result });

      if (result.txHash) {
        logger.tx(`Executed ${toolName}`, result.txHash);
      }

      if (toolName === "accept_offer" && result.success) {
        settled = true;
      }

      // Append tool result message
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: safeJsonStringify(result),
      });
    }

    if (settled) {
      break;
    }
  }

  return {
    actionTaken,
    toolResults,
    settled,
  };
}
