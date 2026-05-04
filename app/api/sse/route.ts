import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { registerSSE, unregisterSSE } from "@/lib/sse";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const writer = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          // Stream already closed
        }
      };

      registerSSE(userId, writer);

      // Initial heartbeat
      writer(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

      // Heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => {
        writer(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unregisterSSE(userId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
