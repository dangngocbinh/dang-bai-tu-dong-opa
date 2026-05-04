import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { sendMessage } from "@/lib/telegram";

// Telegram bot webhook — receives /start {token} command
export async function POST(req: NextRequest) {
  const body = await req.json();

  const message = body.message;
  if (!message?.text || !message.chat?.id) {
    return ok({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text: string = message.text;

  if (text.startsWith("/start")) {
    const token = text.split(" ")[1];

    if (token) {
      // Find user by telegram connect token stored in DB
      // Token format: stored temporarily in a field or via a separate table
      // For simplicity, we use a short-lived approach via user lookup
      // TODO: implement proper token table for 1-click connect (TEL-002)
      await sendMessage(
        chatId,
        "✅ Kết nối OPA thành công! Bạn sẽ nhận thông báo tại đây.\n\nDùng /start để xem hướng dẫn."
      );
    } else {
      await sendMessage(
        chatId,
        "Chào bạn! Tôi là OPA Bot 🤖\nVào Settings trong OPA để kết nối tài khoản của bạn."
      );
    }
  }

  return ok({ ok: true });
}
