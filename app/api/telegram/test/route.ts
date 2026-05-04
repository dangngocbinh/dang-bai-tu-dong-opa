import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { sendMessage } from "@/lib/telegram";

export async function POST() {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true },
  });

  if (!user?.telegramChatId) {
    return err("NOT_CONNECTED", "Chưa kết nối Telegram", 400);
  }

  const sent = await sendMessage(
    user.telegramChatId,
    "🔔 Test thành công từ OPA — mọi thứ đang hoạt động tốt ✅"
  );

  if (!sent) {
    return err(
      "SEND_FAILED",
      "Không gửi được tin nhắn — kiểm tra lại chat ID hoặc bot bị block",
      500
    );
  }

  return ok({ message: "Đã gửi tin nhắn test thành công" });
}
