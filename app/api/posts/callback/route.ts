import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { sendSSE } from "@/lib/sse";
import { sendMessage } from "@/lib/telegram";
import { syncPostStatus } from "@/lib/post-status";

const schema = z.object({
  status: z.enum(["published", "failed"]),
  publishedUrl: z.string().optional(),
  errorMessage: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  // Always return 200 so Make.com doesn't retry
  if (!token) return ok({ received: false, reason: "no token" });

  const postChannel = await prisma.postChannel.findUnique({
    where: { callbackToken: token },
    include: {
      post: { include: { user: { select: { id: true, telegramChatId: true, telegramSettings: true } } } },
      channel: { select: { name: true, platform: true } },
    },
  });

  if (!postChannel || postChannel.status === "published") {
    return ok({ received: false, reason: "invalid or already processed" });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return ok({ received: false, reason: "invalid body" });

  const { status, publishedUrl, errorMessage } = parsed.data;

  const timelineEntry = {
    event: status,
    at: new Date().toISOString(),
    note: status === "published"
      ? `Make.com callback OK — ${publishedUrl}`
      : `Lỗi: ${errorMessage}`,
  };

  await prisma.postChannel.update({
    where: { id: postChannel.id },
    data: {
      status,
      publishedUrl: publishedUrl ?? null,
      errorMessage: errorMessage ?? null,
      callbackToken: null,
      publishedAt: status === "published" ? new Date() : null,
      timeline: {
        push: timelineEntry,
      } as never,
    },
  });

  const newPostStatus = await syncPostStatus(postChannel.postId);

  // SSE push to the user
  sendSSE(postChannel.post.userId, "post_status_changed", {
    postId: postChannel.postId,
    status: newPostStatus,
  });

  // Telegram notification
  const user = postChannel.post.user;
  const settings = user.telegramSettings as Record<string, unknown>;
  if (user.telegramChatId) {
    const shouldNotify =
      (status === "published" && settings.notify_success) ||
      (status === "failed" && settings.notify_fail);

    if (shouldNotify) {
      const icon = status === "published" ? "✅" : "❌";
      const msg =
        status === "published"
          ? `${icon} Đã đăng bài lên kênh <b>${postChannel.channel.name}</b>\n<a href="${publishedUrl}">Xem bài đăng</a>`
          : `${icon} Đăng bài thất bại trên kênh <b>${postChannel.channel.name}</b>\nLý do: ${errorMessage}`;
      await sendMessage(user.telegramChatId, msg);
    }
  }

  return ok({ received: true });
}
