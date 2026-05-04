import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return err("FORBIDDEN", "Không có quyền", 403);
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersLast7Days,
    todayStats,
    last7DaysStats,
    recentFailed,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.postChannel.groupBy({
      by: ["status"],
      where: { updatedAt: { gte: todayStart } },
      _count: { status: true },
    }),
    prisma.postChannel.groupBy({
      by: ["status"],
      where: { updatedAt: { gte: weekAgo } },
      _count: { status: true },
    }),
    prisma.postChannel.findMany({
      where: { status: "failed" },
      include: {
        post: { include: { user: { select: { email: true } } } },
        channel: { select: { name: true, platform: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
  ]);

  const toStats = (rows: Array<{ status: string; _count: { status: number } }>) => ({
    total: rows.reduce((s, r) => s + r._count.status, 0),
    success: rows.find((r) => r.status === "published")?._count.status ?? 0,
    failed: rows.find((r) => r.status === "failed")?._count.status ?? 0,
  });

  return ok({
    users: { total: totalUsers, newLast7Days: newUsersLast7Days },
    posts: {
      today: toStats(todayStats),
      last7Days: toStats(last7DaysStats),
    },
    recentFailedPosts: recentFailed.map((pc) => ({
      postChannelId: pc.id,
      postId: pc.postId,
      userId: pc.post.userId,
      userEmail: pc.post.user.email,
      platform: pc.channel.platform,
      channelName: pc.channel.name,
      errorMessage: pc.errorMessage,
      failedAt: pc.updatedAt,
    })),
  });
}
