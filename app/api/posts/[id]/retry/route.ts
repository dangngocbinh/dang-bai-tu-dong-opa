import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { syncPostStatus } from "@/lib/post-status";

export async function POST(
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

  const failedChannels = await prisma.postChannel.findMany({
    where: { postId: id, status: "failed" },
  });

  const retryable = failedChannels.filter((pc) => pc.retryCount < 3);
  if (retryable.length === 0) {
    return err(
      "MAX_RETRY",
      "Đã thử lại tối đa 3 lần — vui lòng kiểm tra kết nối kênh",
      400
    );
  }

  await prisma.postChannel.updateMany({
    where: { id: { in: retryable.map((pc) => pc.id) } },
    data: {
      status: "pending",
      errorMessage: null,
      lockedAt: null,
    },
  });

  // Set post back to scheduled so cron picks it up
  await prisma.post.update({
    where: { id: id },
    data: { status: "scheduled" },
  });

  await syncPostStatus(id);

  return ok({ retriedChannels: retryable.length });
}
