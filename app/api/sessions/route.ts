import { NextResponse } from "next/server";
import { getStorage } from "@/src/storage/index";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const storage = getStorage();

    if (sessionId) {
      const session = await storage.getSessionById(sessionId);
      const transcripts = await storage.getTranscripts(sessionId);
      return NextResponse.json({ success: true, session, transcripts });
    }

    const sessions = await storage.getSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const storage = getStorage();

    if (body.session) {
      await storage.saveSession(body.session);
    }

    if (body.message && body.sessionId) {
      await storage.appendMessage(body.sessionId, body.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
