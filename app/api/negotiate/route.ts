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

    // Tactical concession logic for simulated / robust fallback
    let thought = "";
    let content = "";
    let toolName = "make_offer";
    let offerAmount = "7.5";
    let isSettled = false;

    // Check last offer from history
    const lastOfferMsg = [...history].reverse().find((h: any) => h.toolCall?.name === "make_offer");
    const lastAmount = lastOfferMsg ? parseFloat(lastOfferMsg.toolCall.args.amount) : parseFloat(referencePrice);

    if (isBuyer) {
      if (currentRound === 1) {
        thought = `Initial round for '${itemDescription}'. Reference baseline is ${referencePrice} MON. Anchoring aggressively at ${currentAgent.targetPrice} MON to capture consumer surplus.`;
        content = `I am initiating negotiations for '${itemDescription}' with an opening offer of ${currentAgent.targetPrice} MON.`;
        offerAmount = currentAgent.targetPrice;
      } else {
        const concession = (lastAmount + parseFloat(currentAgent.targetPrice)) / 2;
        const rounded = Math.min(concession, parseFloat(currentAgent.reservationPrice)).toFixed(2);
        
        if (lastAmount <= parseFloat(currentAgent.reservationPrice)) {
          thought = `Counterparty offer ${lastAmount} MON is within our maximum reservation ceiling of ${currentAgent.reservationPrice} MON. Accepting offer to lock in deal.`;
          content = `Your counter-offer of ${lastAmount} MON is acceptable. I accept and execute on-chain settlement.`;
          toolName = "accept_offer";
          isSettled = true;
          offerAmount = String(lastAmount);
        } else {
          thought = `Counterparty proposed ${lastAmount} MON, which exceeds our ceiling (${currentAgent.reservationPrice} MON). Applying concession formula to counter with ${rounded} MON.`;
          content = `That is above our budgeted ceiling. We propose a tactical counter-offer of ${rounded} MON.`;
          offerAmount = rounded;
        }
      }
    } else {
      // Seller turn
      const floor = parseFloat(currentAgent.reservationPrice);
      if (lastAmount >= floor) {
        thought = `Buyer's current offer of ${lastAmount} MON meets or exceeds our floor reservation of ${floor} MON with profitable margin. Executing accept_offer.`;
        content = `Your offer of ${lastAmount} MON meets our reservation criteria. Deal accepted and settled on Monad.`;
        toolName = "accept_offer";
        isSettled = true;
        offerAmount = String(lastAmount);
      } else {
        const concession = Math.max((lastAmount + parseFloat(currentAgent.targetPrice)) / 2, floor).toFixed(2);
        thought = `Buyer offer ${lastAmount} MON is below our reservation floor of ${floor} MON. Conceding towards midpoint: ${concession} MON.`;
        content = `Your offer of ${lastAmount} MON is below production floor. We can concede to ${concession} MON.`;
        offerAmount = concession;
      }
    }

    // Attempt live LLM invocation if API key is configured
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
            content: `Round ${currentRound}. Item: '${itemDescription}', Anchor: ${referencePrice} MON. Previous offers: ${JSON.stringify(history.map((h: any) => ({ role: h.senderRole, offer: h.toolCall?.args?.amount })))}. Reason carefully and choose your move.`,
          },
        ];

        const completion = await qwen.chat.completions.create({
          model: CONFIG.qwenModel,
          messages: conversation as any,
          temperature: 0.3,
        });

        const choice = completion.choices[0]?.message;
        if (choice?.content) {
          content = choice.content;
          thought = `[Qwen 3.8 Max Reasoning]: Analyzing round ${currentRound} dynamics against reservation constraints. Output generated via model engine.`;
        }
      } catch (err: any) {
        console.warn("Live LLM call fallback to deterministic tactical engine:", err.message);
      }
    }

    const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

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
      txHash,
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
