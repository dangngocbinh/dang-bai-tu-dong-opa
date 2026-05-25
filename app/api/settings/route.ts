import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function GET() {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const userId = session.user.id;

  const [user, totalPosts, connectedChannels, channels, postsWithMedia] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, displayName: true, timezone: true,
        telegramChatId: true, telegramSettings: true, zaloPhone: true,
        lastLoginAt: true, createdAt: true,
      },
    }),
    prisma.post.count({ where: { userId } }),
    prisma.channel.count({ where: { userId, status: "active" } }),
    prisma.channel.findMany({
      where: { userId },
      select: { id: true, name: true, platform: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.post.findMany({ where: { userId }, select: { mediaUrls: true } }),
  ]);

  if (!user) return err("NOT_FOUND", "User không tồn tại", 404);

  const totalBytes = postsWithMedia.reduce((sum, p) => {
    const media = p.mediaUrls as Array<{ size?: number }> | null;
    if (!Array.isArray(media)) return sum;
    return sum + media.reduce((s, m) => s + (m?.size ?? 0), 0);
  }, 0);
  const storageUsedMb = Math.round((totalBytes / (1024 * 1024)) * 10) / 10;

  return ok({
    ...user,
    stats: {
      total_posts: totalPosts,
      connected_channels: connectedChannels,
      storage_used_mb: storageUsedMb,
    },
    channels,
  });
}

const updateSchema = z.object({
  displayName: z.string().max(100).optional(),
  timezone: z.string().optional(),
  zaloPhone: z.string().regex(/^(0|\+84)[0-9]{8,10}$/).optional().nullable(),
  telegramSettings: z.object({
    notify_success: z.boolean().optional(),
    notify_fail: z.boolean().optional(),
    daily_report: z.boolean().optional(),
    weekly_report: z.boolean().optional(),
    report_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
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

  const { displayName, timezone, zaloPhone, telegramSettings } = parsed.data;

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
      ...(zaloPhone !== undefined && { zaloPhone }),
      ...(telegramSettings && {
        telegramSettings: {
          ...(user.telegramSettings as object),
          ...telegramSettings,
        },
      }),
    },
    select: {
      id: true, email: true, displayName: true, timezone: true,
      telegramChatId: true, telegramSettings: true, zaloPhone: true,
    },
  });

  return ok(updated);
}
