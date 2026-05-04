import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function POST(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);
  const { id } = await _params;

  const original = await prisma.post.findFirst({
    where: { id: id, userId: session.user.id },
    include: {
      postChannels: {
        include: {
          channel: { select: { id: true, status: true } },
        },
      },
    },
  });
  if (!original) return err("NOT_FOUND", "Bài đăng không tồn tại", 404);

  // Only include active channels
  const activeChannelIds = original.postChannels
    .filter((pc) => pc.channel.status === "active")
    .map((pc) => pc.channelId);

  const duplicate = await prisma.post.create({
    data: {
      userId: session.user.id,
      content: original.content,
      mediaUrls: original.mediaUrls as object[],
      status: "draft",
      scheduledAt: null,
      postChannels: {
        create: activeChannelIds.map((channelId) => ({ channelId })),
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

  const skipped =
    original.postChannels.length - activeChannelIds.length;

  return ok({ post: duplicate, skippedChannels: skipped }, 201);
}
