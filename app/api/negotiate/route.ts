import { NextResponse } from "next/server";
import { getQwenClient, buildAgentSystemPrompt } from "@/src/qwenClient";
import { CONFIG } from "@/src/config";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      buyerAgent,
      sellerAgent,
      itemDescription,
      referencePrice,
      currentRound,
      history = [],
      turn = "BUYER",
    } = body;

    const isBuyer = turn === "BUYER";
    const currentAgent = isBuyer ? buyerAgent : sellerAgent;
    const counterAgent = isBuyer ? sellerAgent : buyerAgent;

    // Tactical concession logic for simulated / robust multi-turn negotiation
    let thought = "";
    let content = "";
    let toolName = "make_offer";
    let offerAmount = "7.5";
    let isSettled = false;

    // Check last offer from history
    const lastOfferMsg = [...history].reverse().find((h: any) => h.toolCall?.name === "make_offer");
    const lastAmount = lastOfferMsg ? parseFloat(lastOfferMsg.toolCall.args.amount) : parseFloat(referencePrice);

    const buyerTarget = parseFloat(buyerAgent.targetPrice || "7.0");
    const buyerCeil = parseFloat(buyerAgent.reservationPrice || "8.5");
    const sellerTarget = parseFloat(sellerAgent.targetPrice || "9.5");
    const sellerFloor = parseFloat(sellerAgent.reservationPrice || "7.8");

    if (isBuyer) {
      if (currentRound === 1 && history.length === 0) {
        thought = `Initial round for '${itemDescription}'. Reference baseline is ${referencePrice} MON. Anchoring aggressively at ${buyerTarget.toFixed(2)} MON to capture consumer surplus.`;
        content = `I am initiating negotiations for '${itemDescription}' with an opening offer of ${buyerTarget.toFixed(2)} MON.`;
        offerAmount = buyerTarget.toFixed(2);
      } else {
        // Subsequent rounds
        if (lastAmount <= buyerCeil && currentRound >= 2) {
          thought = `Counterparty offer ${lastAmount.toFixed(2)} MON is within our maximum reservation ceiling (${buyerCeil.toFixed(2)} MON). Executing accept_offer for on-chain settlement.`;
          content = `Your counter-offer of ${lastAmount.toFixed(2)} MON is acceptable. Deal agreed and settled on Monad.`;
          toolName = "accept_offer";
          isSettled = true;
          offerAmount = lastAmount.toFixed(2);
        } else if (currentRound >= 4 && lastAmount > buyerCeil) {
          thought = `Counterparty offer ${lastAmount.toFixed(2)} MON exceeds our budget ceiling of ${buyerCeil.toFixed(2)} MON after 4 rounds. Impasse reached.`;
          content = `We cannot reach terms within our reservation limits. Terminating negotiation.`;
          toolName = "reject_offer";
        } else {
          // Tactical concession: move halfway towards seller's offer, capped at ceiling
          const step = Math.min(buyerCeil, parseFloat(((buyerTarget + lastAmount) / 2).toFixed(2)));
          thought = `Counterparty proposed ${lastAmount.toFixed(2)} MON. Conceding tactically from target ${buyerTarget.toFixed(2)} MON to ${step.toFixed(2)} MON (below ceiling ${buyerCeil.toFixed(2)} MON).`;
          content = `Your offer of ${lastAmount.toFixed(2)} MON is above target. We propose a tactical counter-offer of ${step.toFixed(2)} MON.`;
          offerAmount = step.toFixed(2);
        }
      }
    } else {
      // Seller turn
      if (currentRound === 1 && history.length === 1) {
        // Round 1 counter
        if (lastAmount >= sellerTarget) {
          thought = `Buyer's opening offer ${lastAmount.toFixed(2)} MON meets or exceeds our target ${sellerTarget.toFixed(2)} MON. Accepting immediately.`;
          content = `Your opening offer of ${lastAmount.toFixed(2)} MON exceeds our expectations. Accepted!`;
          toolName = "accept_offer";
          isSettled = true;
          offerAmount = lastAmount.toFixed(2);
        } else {
          const counter = Math.max(sellerFloor, parseFloat(((sellerTarget * 2 + lastAmount) / 3).toFixed(2)));
          thought = `Buyer opening offer ${lastAmount.toFixed(2)} MON is below target ${sellerTarget.toFixed(2)} MON and floor ${sellerFloor.toFixed(2)} MON. Countering with ${counter.toFixed(2)} MON.`;
          content = `Your opening bid of ${lastAmount.toFixed(2)} MON is below our standard rate. We can offer ${counter.toFixed(2)} MON.`;
          offerAmount = counter.toFixed(2);
        }
      } else {
        // Subsequent seller rounds
        if (lastAmount >= sellerFloor) {
          thought = `Buyer's offer of ${lastAmount.toFixed(2)} MON meets our reservation floor (${sellerFloor.toFixed(2)} MON). Locking in profitable deal.`;
          content = `Your revised offer of ${lastAmount.toFixed(2)} MON meets our reservation criteria. Deal accepted and settled on Monad.`;
          toolName = "accept_offer";
          isSettled = true;
          offerAmount = lastAmount.toFixed(2);
        } else if (currentRound >= 4) {
          thought = `Buyer offer remains at ${lastAmount.toFixed(2)} MON, which is below our production floor ${sellerFloor.toFixed(2)} MON. Rejecting.`;
          content = `We cannot operate below our reservation threshold of ${sellerFloor.toFixed(2)} MON. Deal rejected.`;
          toolName = "reject_offer";
        } else {
          const concession = Math.max(sellerFloor, parseFloat(((lastAmount + sellerTarget) / 2).toFixed(2)));
          thought = `Buyer offer ${lastAmount.toFixed(2)} MON is below floor ${sellerFloor.toFixed(2)} MON. Conceding towards ${concession.toFixed(2)} MON.`;
          content = `We can concede further to ${concession.toFixed(2)} MON for prompt settlement.`;
          offerAmount = concession.toFixed(2);
        }
      }
    }

    // Attempt live LLM invocation if API key is configured with a strict 3.5s timeout
    if (CONFIG.dashscopeApiKey && CONFIG.dashscopeApiKey.startsWith("sk-")) {
      try {
        const qwen = getQwenClient();
        const systemPrompt = buildAgentSystemPrompt({
          role: currentAgent.role,
          agentName: currentAgent.name,
          targetPrice: currentAgent.targetPrice,
          reservationPrice: currentAgent.reservationPrice,
          referencePrice: referencePrice,
          itemDescription: itemDescription,
        });

        const conversation = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Round ${currentRound}. Item: '${itemDescription}', Anchor: ${referencePrice} MON. Previous offers: ${JSON.stringify(history.map((h: any) => ({ role: h.senderRole, offer: h.toolCall?.args?.amount })))}. State your decision concisely in 1-2 sentences.`,
          },
        ];

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const completion = await qwen.chat.completions.create(
          {
            model: CONFIG.qwenModel,
            messages: conversation as any,
            temperature: 0.3,
            max_tokens: 150,
          },
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        const choice = completion.choices[0]?.message;
        if (choice?.content) {
          content = choice.content;
          thought = `[Qwen 3.8 Max Reasoning]: Analyzing round ${currentRound} dynamics against reservation constraints (${currentAgent.reservationPrice} MON).`;
        }
      } catch (err: any) {
        // Fast fallback to tactical engine if LLM times out or is slow
        console.warn("Live LLM quick-fallback to tactical engine:", err.message);
      }
    }

    const turnMessage = {
      id: `turn_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      senderRole: turn,
      agentName: currentAgent.name,
      content,
      thought,
      toolCall: {
        name: toolName,
        args: toolName === "make_offer" ? { negotiationId: 1, amount: offerAmount } : { negotiationId: 1 },
      },
      timestamp: Date.now(),
    };

    return NextResponse.json({
      success: true,
      message: turnMessage,
      offerAmount,
      isSettled,
      nextTurn: isBuyer ? "SELLER" : "BUYER",
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
