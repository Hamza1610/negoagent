import { NextResponse } from "next/server";
import { getStorage } from "@/src/storage/index";
import { AgentProfile } from "@/src/storage/types";

export async function GET() {
  try {
    const storage = getStorage();
    const agents = await storage.getAgents();
    return NextResponse.json({ success: true, agents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storage = getStorage();

    const newAgent: AgentProfile = {
      id: body.id || `agent_${Date.now()}`,
      name: body.name || "Custom Agent",
      role: body.role || "BUYER",
      strategy: body.strategy || "balanced",
      targetPrice: String(body.targetPrice || "7.0"),
      reservationPrice: String(body.reservationPrice || "8.5"),
      referencePrice: String(body.referencePrice || "10.0"),
      avatar: body.avatar || "bot-cyan",
      walletAddress: body.walletAddress || "0x23ee7225F978a99A3a94C11242811deBA369318F",
      createdAt: Date.now(),
    };

    await storage.saveAgent(newAgent);
    return NextResponse.json({ success: true, agent: newAgent });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing agent id" }, { status: 400 });
    }

    const storage = getStorage();
    await storage.deleteAgent(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
