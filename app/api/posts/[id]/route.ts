import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function GET(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);
  const { id } = await _params;

  const post = await prisma.post.findFirst({
    where: { id: id, userId: session.user.id },
    include: {
      postChannels: {
        include: {
          channel: { select: { id: true, name: true, platform: true } },
        },
      },
    },
  });
  if (!post) return err("NOT_FOUND", "Bài đăng không tồn tại", 404);

  return ok(post);
}

const updateSchema = z.object({
  content: z.string().optional(),
  mediaUrls: z.array(z.object({
    key: z.string(), url: z.string(), type: z.enum(["image", "video"]),
    size: z.number(), name: z.string(),
  })).optional(),
  channelIds: z.array(z.string().uuid()).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);
  const { id } = await _params;

  const post = await prisma.post.findFirst({
    where: { id: id, userId: session.user.id },
  });
  if (!post) return err("NOT_FOUND", "Bài đăng không tồn tại", 404);
  if (post.status === "processing" || post.status === "published") {
    return err("INVALID_STATUS", "Không thể chỉnh sửa bài đã đăng", 400);
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  const { content, mediaUrls, channelIds, scheduledAt } = parsed.data;

  // Determine new status
  let newStatus = post.status;
  if (scheduledAt !== undefined) {
    newStatus = scheduledAt ? "scheduled" : "draft";
  }

  await prisma.$transaction(async (tx) => {
    if (channelIds) {
      await tx.postChannel.deleteMany({ where: { postId: id } });
      await tx.postChannel.createMany({
        data: channelIds.map((channelId) => ({ postId: id, channelId })),
      });
    }

    await tx.post.update({
      where: { id: id },
      data: {
        ...(content !== undefined && { content }),
        ...(mediaUrls !== undefined && { mediaUrls }),
        ...(scheduledAt !== undefined && {
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        }),
        status: newStatus,
      },
    });
  });

  const updated = await prisma.post.findUnique({
    where: { id: id },
    include: {
      postChannels: {
        include: { channel: { select: { id: true, name: true, platform: true } } },
      },
    },
  });

  return ok(updated);
}

export async function DELETE(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);
  const { id } = await _params;

  const post = await prisma.post.findFirst({
    where: { id: id, userId: session.user.id },
  });
  if (!post) return err("NOT_FOUND", "Bài đăng không tồn tại", 404);

  await prisma.post.delete({ where: { id: id } });
  return ok({ message: "Đã xóa bài đăng" });
}
