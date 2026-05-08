import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { sendMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const message = body.message;
  if (!message?.text || !message.chat?.id) {
    return ok({ ok: true });
  }

  const chatId = String(message.chat.id);
  const text: string = message.text;

  if (!text.startsWith("/start")) {
    return ok({ ok: true });
  }

  const token = text.split(" ")[1];

  if (!token) {
    await sendMessage(
      chatId,
      "Chào bạn! Tôi là OPA Bot 🤖\nVào Settings trong OPA để kết nối tài khoản của bạn."
    );
    return ok({ ok: true });
  }

  const connectToken = await prisma.telegramConnectToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, telegramChatId: true } } },
  });

  if (!connectToken) {
    await sendMessage(chatId, "❌ Link không hợp lệ. Vào Settings trong OPA để tạo link mới.");
    return ok({ ok: true });
  }

  if (connectToken.expiresAt < new Date()) {
    await prisma.telegramConnectToken.delete({ where: { token } });
    await sendMessage(chatId, "⏰ Link đã hết hạn (15 phút). Vào Settings trong OPA để tạo link mới.");
    return ok({ ok: true });
  }

  if (connectToken.user.telegramChatId) {
    await sendMessage(chatId, "✅ Bạn đã kết nối OPA rồi — không cần làm lại.");
    return ok({ ok: true });
  }

  const telegramInfo = body.message.chat;
  const username = telegramInfo.username ? `@${telegramInfo.username}` : telegramInfo.first_name ?? "";

  await prisma.user.update({
    where: { id: connectToken.userId },
    data: { telegramChatId: chatId },
  });

  await prisma.telegramConnectToken.delete({ where: { token } });

  await sendMessage(
    chatId,
    `✅ Kết nối OPA thành công!\n\nXin chào <b>${username}</b>, bạn sẽ nhận thông báo tại đây.\n\nChọn loại thông báo trong Settings > Thông báo để tuỳ chỉnh.`
  );

  return ok({ ok: true });
}
