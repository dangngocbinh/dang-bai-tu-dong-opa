import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { decrypt } from "@/lib/crypto";

export async function POST(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);
  const { id } = await _params;

  const channel = await prisma.channel.findFirst({
    where: { id: id, userId: session.user.id },
  });
  if (!channel) return err("NOT_FOUND", "Kênh không tồn tại", 404);

  const start = Date.now();
  let success = false;
  let errorMsg: string | undefined;

  try {
    if (channel.connectionType === "webhook" && channel.webhookUrl) {
      // Send a test payload to the webhook
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(channel.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true, channelName: channel.name }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      success = res.ok;
      if (!success) errorMsg = `HTTP ${res.status}`;
    } else if (
      channel.connectionType === "api" &&
      channel.credentials
    ) {
      const creds = channel.credentials as { encrypted: string };
      const decoded = JSON.parse(decrypt(creds.encrypted));

      // Platform-specific profile check
      if (channel.platform === "x") {
        const res = await fetch("https://api.twitter.com/2/users/me", {
          headers: { Authorization: `Bearer ${decoded.access_token}` },
        });
        success = res.ok;
        if (!success) errorMsg = `HTTP ${res.status}`;
      } else if (channel.platform === "threads") {
        const res = await fetch(
          `https://graph.threads.net/v1.0/me?access_token=${decoded.access_token}`
        );
        success = res.ok;
        if (!success) errorMsg = `HTTP ${res.status}`;
      } else {
        success = true; // Generic API — assume valid
      }
    } else {
      success = true;
    }
  } catch (e: unknown) {
    errorMsg = e instanceof Error ? e.message : "Kết nối thất bại";
  }

  await prisma.channel.update({
    where: { id: id },
    data: {
      lastTestedAt: new Date(),
      status: success ? "active" : "expired",
    },
  });

  const latencyMs = Date.now() - start;
  return ok({
    success,
    latencyMs,
    message: success ? "Kết nối thành công" : (errorMsg ?? "Kết nối thất bại"),
  });
}
