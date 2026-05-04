import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

const createSchema = z.object({
  content: z.string().default(""),
  mediaUrls: z
    .array(
      z.object({
        key: z.string(),
        url: z.string(),
        type: z.enum(["image", "video"]),
        size: z.number(),
        name: z.string(),
      })
    )
    .default([]),
  channelIds: z.array(z.string().uuid()).default([]),
  scheduledAt: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const platform = searchParams.get("platform");
  const channelIds = searchParams.get("channelId")?.split(",").filter(Boolean);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "createdAt";
  const order = (searchParams.get("order") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));

  const posts = await prisma.post.findMany({
    where: {
      userId: session.user.id,
      ...(status && { status }),
      ...(search && { content: { contains: search, mode: "insensitive" } }),
      ...(from || to
        ? {
            scheduledAt: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
      ...(channelIds?.length || platform
        ? {
            postChannels: {
              some: {
                ...(channelIds?.length && { channelId: { in: channelIds } }),
                ...(platform && { channel: { platform } }),
              },
            },
          }
        : {}),
    },
    include: {
      postChannels: {
        include: {
          channel: { select: { id: true, name: true, platform: true } },
        },
      },
    },
    orderBy: { [sort]: order },
    skip: (page - 1) * limit,
    take: limit,
  });

  return ok(posts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  const { content, mediaUrls, channelIds, scheduledAt } = parsed.data;

  // Must pick ≥1 channel when scheduling
  if (scheduledAt && channelIds.length === 0) {
    return err("VALIDATION_ERROR", "Cần chọn ít nhất 1 Kênh khi lên lịch", 400);
  }

  if (channelIds.length > 0) {
    const channels = await prisma.channel.findMany({
      where: { id: { in: channelIds }, userId: session.user.id },
    });
    if (channels.length !== channelIds.length) {
      return err("INVALID_CHANNEL", "Một hoặc nhiều Kênh không hợp lệ", 400);
    }
  }

  const status = scheduledAt ? "scheduled" : "draft";

  const post = await prisma.post.create({
    data: {
      userId: session.user.id,
      content,
      mediaUrls,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status,
      postChannels: {
        create: channelIds.map((channelId) => ({ channelId })),
      },
    },
    include: {
      postChannels: {
        include: {
          channel: { select: { id: true, name: true, platform: true } },
        },
      },
    },
  });

  return ok(post, 201);
}
