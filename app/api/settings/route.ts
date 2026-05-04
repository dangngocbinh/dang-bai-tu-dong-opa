import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function GET() {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, email: true, displayName: true, timezone: true,
      telegramChatId: true, telegramSettings: true,
      lastLoginAt: true, createdAt: true,
    },
  });
  if (!user) return err("NOT_FOUND", "User không tồn tại", 404);

  return ok(user);
}

const updateSchema = z.object({
  displayName: z.string().max(100).optional(),
  timezone: z.string().optional(),
  telegramSettings: z.object({
    notify_success: z.boolean().optional(),
    notify_fail: z.boolean().optional(),
    daily_report: z.boolean().optional(),
    weekly_report: z.boolean().optional(),
    report_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  const { displayName, timezone, telegramSettings } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramSettings: true },
  });
  if (!user) return err("NOT_FOUND", "User không tồn tại", 404);

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(displayName !== undefined && { displayName }),
      ...(timezone !== undefined && { timezone }),
      ...(telegramSettings && {
        telegramSettings: {
          ...(user.telegramSettings as object),
          ...telegramSettings,
        },
      }),
    },
    select: {
      id: true, email: true, displayName: true, timezone: true,
      telegramChatId: true, telegramSettings: true,
    },
  });

  return ok(updated);
}
