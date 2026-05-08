import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { buildDeeplink } from "@/lib/telegram";

export async function POST() {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.telegramConnectToken.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, token, expiresAt },
    update: { token, expiresAt },
  });

  return ok({ deeplink: buildDeeplink(token), expiresAt });
}

export async function GET() {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true, telegramSettings: true },
  });

  return ok({
    connected: !!user?.telegramChatId,
    chatId: user?.telegramChatId ?? null,
    settings: user?.telegramSettings ?? null,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramChatId: null },
  });

  await prisma.telegramConnectToken.deleteMany({
    where: { userId: session.user.id },
  });

  return ok({ disconnected: true });
}
