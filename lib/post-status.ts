import { prisma } from "@/lib/prisma";

// Recompute and update posts.status based on all its post_channels
export async function syncPostStatus(postId: string): Promise<string> {
  const channels = await prisma.postChannel.findMany({
    where: { postId },
    select: { status: true },
  });

  if (channels.length === 0) return "draft";

  const statuses = channels.map((c) => c.status);
  let newStatus: string;

  if (statuses.some((s) => s === "processing")) {
    newStatus = "processing";
  } else if (statuses.every((s) => s === "published")) {
    newStatus = "published";
  } else if (
    statuses.every((s) => s === "published" || s === "failed") &&
    statuses.some((s) => s === "failed")
  ) {
    newStatus = "failed";
  } else if (statuses.every((s) => s === "pending")) {
    newStatus = "scheduled";
  } else {
    newStatus = "processing";
  }

  await prisma.post.update({
    where: { id: postId },
    data: { status: newStatus },
  });

  return newStatus;
}
