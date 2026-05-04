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

  const post = await prisma.post.findFirst({
    where: { id: id, userId: session.user.id },
  });
  if (!post) return err("NOT_FOUND", "Bài đăng không tồn tại", 404);
  if (post.status === "published" || post.status === "processing") {
    return err("INVALID_STATUS", "Bài đang được xử lý hoặc đã đăng", 400);
  }

  // Schedule for immediate publishing (1 minute from now to enter the cron window)
  await prisma.post.update({
    where: { id: id },
    data: {
      status: "scheduled",
      scheduledAt: new Date(Date.now() + 30 * 1000), // 30 seconds
    },
  });

  return ok({ message: "Bài đã được đưa vào hàng chờ đăng ngay" });
}
