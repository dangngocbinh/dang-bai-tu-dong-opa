import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";
import { sendSSE } from "@/lib/sse";
import { syncPostStatus } from "@/lib/post-status";
import { decrypt } from "@/lib/crypto";
import { sendMessage } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Step 1: Detect and fail timed-out processing jobs (>10 minutes)
  await prisma.postChannel.updateMany({
    where: {
      status: "processing",
      lockedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
    },
    data: {
      status: "failed",
      errorMessage: "Timeout sau 10 phút — không nhận được callback",
      lockedAt: null,
    },
  });

  // Step 2: Claim pending post_channels ready to publish
  const pending = await prisma.$queryRaw<
    Array<{ id: string; post_id: string; channel_id: string }>
  >`
    SELECT pc.id, pc.post_id, pc.channel_id
    FROM post_channels pc
    JOIN posts p ON p.id = pc.post_id
    JOIN channels c ON c.id = pc.channel_id
    JOIN users u ON u.id = p.user_id
    WHERE pc.status = 'pending'
      AND pc.locked_at IS NULL
      AND p.scheduled_at <= NOW()
      AND p.status = 'scheduled'
      AND c.status = 'active'
      AND u.status = 'active'
    LIMIT 50
    FOR UPDATE SKIP LOCKED
  `;

  if (pending.length === 0) {
    return ok({ processed: 0 });
  }

  let processed = 0;

  for (const row of pending) {
    try {
      const callbackToken = randomUUID().replace(/-/g, "");

      await prisma.postChannel.update({
        where: { id: row.id },
        data: {
          status: "processing",
          lockedAt: new Date(),
          callbackToken,
          timeline: {
            push: {
              event: "processing",
              at: new Date().toISOString(),
              note: "Cron job xử lý",
            },
          } as never,
        },
      });

      await syncPostStatus(row.post_id);

      const postChannel = await prisma.postChannel.findUnique({
        where: { id: row.id },
        include: {
          post: { select: { content: true, mediaUrls: true } },
          channel: true,
        },
      });

      if (!postChannel) continue;

      const channel = postChannel.channel;
      const post = postChannel.post;
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/posts/callback?token=${callbackToken}`;

      if (channel.connectionType === "webhook" && channel.webhookUrl) {
        // Fire-and-forget: Make.com will call back asynchronously
        fetch(channel.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: post.content,
            mediaUrls: post.mediaUrls,
            platform: channel.platform,
            channelName: channel.name,
            callbackUrl,
          }),
        }).catch(() => {
          // Timeout/error will be handled by the 10-minute timeout check
        });

        await prisma.postChannel.update({
          where: { id: row.id },
          data: {
            timeline: {
              push: {
                event: "webhook_sent",
                at: new Date().toISOString(),
                note: `Đã gọi Make.com webhook`,
              },
            } as never,
          },
        });
      } else if (
        channel.connectionType === "api" &&
        channel.credentials
      ) {
        // Direct API posting (Threads, X.com)
        await handleDirectApi(row.id, row.post_id, postChannel, callbackToken);
      } else if (channel.connectionType === "oauth") {
        // YouTube OAuth — TODO: implement in Sprint 5
        await prisma.postChannel.update({
          where: { id: row.id },
          data: {
            status: "failed",
            errorMessage: "YouTube OAuth chưa được triển khai",
            lockedAt: null,
            callbackToken: null,
          },
        });
        await syncPostStatus(row.post_id);
      }

      processed++;
    } catch (e) {
      console.error(`Failed to process postChannel ${row.id}:`, e);
    }
  }

  // Notify affected users via SSE
  const affectedPostIds = Array.from(new Set(pending.map((r) => r.post_id)));
  for (const postId of affectedPostIds) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true, status: true },
    });
    if (post) {
      sendSSE(post.userId, "post_status_changed", {
        postId,
        status: post.status,
      });
    }
  }

  // Daily report: send to users whose report_time matches current minute in their timezone
  await sendDailyReports();

  return ok({ processed });
}

async function sendDailyReports() {
  const now = new Date();
  const currentHHMM = now.toISOString().slice(11, 16); // "HH:MM" in UTC

  const users = await prisma.user.findMany({
    where: {
      telegramChatId: { not: null },
      status: "active",
    },
    select: {
      id: true,
      telegramChatId: true,
      telegramSettings: true,
      timezone: true,
    },
  });

  for (const user of users) {
    const settings = user.telegramSettings as Record<string, unknown>;
    if (!settings.daily_report) continue;

    const reportTime = (settings.report_time as string) ?? "22:00";

    // Convert report_time in user's timezone to UTC for comparison
    const [rh, rm] = reportTime.split(":").map(Number);
    const userNow = new Date(now.toLocaleString("en-US", { timeZone: user.timezone }));
    const userHHMM = `${String(userNow.getHours()).padStart(2, "0")}:${String(userNow.getMinutes()).padStart(2, "0")}`;

    if (userHHMM !== reportTime) continue;
    void rh; void rm; void currentHHMM;

    // Find today's post_channels for this user (in their timezone)
    const todayStart = new Date(userNow);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(userNow);
    todayEnd.setHours(23, 59, 59, 999);

    const postChannels = await prisma.postChannel.findMany({
      where: {
        post: { userId: user.id },
        createdAt: { gte: todayStart, lte: todayEnd },
        status: { in: ["published", "failed"] },
      },
      select: { status: true },
    });

    // TEL-007: don't send if no posts processed today
    if (postChannels.length === 0) continue;

    const total = postChannels.length;
    const success = postChannels.filter((pc) => pc.status === "published").length;
    const failed = total - success;

    const msg =
      `📊 <b>Báo cáo hôm nay</b>\n\n` +
      `📌 Tổng bài xử lý: <b>${total}</b>\n` +
      `✅ Thành công: <b>${success}</b>\n` +
      `❌ Lỗi: <b>${failed}</b>`;

    await sendMessage(user.telegramChatId!, msg);
  }
}

async function handleDirectApi(
  postChannelId: string,
  postId: string,
  postChannel: {
    post: { content: string; mediaUrls: unknown };
    channel: {
      platform: string;
      credentials: unknown;
      id: string;
      userId: string;
    };
  },
  _callbackToken: string
) {
  try {
    const creds = postChannel.channel.credentials as { encrypted: string };
    const decoded = JSON.parse(decrypt(creds.encrypted));
    let publishedUrl: string | undefined;
    let success = false;

    if (postChannel.channel.platform === "x") {
      const content = (postChannel.post as { content: string }).content;
      const res = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${decoded.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
      });
      if (res.ok) {
        const data = await res.json();
        publishedUrl = `https://x.com/i/web/status/${data.data?.id}`;
        success = true;
      } else if (res.status === 401) {
        await prisma.channel.update({
          where: { id: postChannel.channel.id },
          data: { status: "expired" },
        });
        throw new Error("Credential hết hạn — cần cập nhật lại");
      }
    } else if (postChannel.channel.platform === "threads") {
      // Threads Graph API v1.0
      const content = (postChannel.post as { content: string }).content;
      const mediaRes = await fetch(
        `https://graph.threads.net/v1.0/${decoded.user_id}/threads`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: "TEXT",
            text: content,
            access_token: decoded.access_token,
          }),
        }
      );
      if (mediaRes.ok) {
        const mediaData = await mediaRes.json();
        const publishRes = await fetch(
          `https://graph.threads.net/v1.0/${decoded.user_id}/threads_publish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              creation_id: mediaData.id,
              access_token: decoded.access_token,
            }),
          }
        );
        if (publishRes.ok) {
          const publishData = await publishRes.json();
          publishedUrl = `https://www.threads.net/t/${publishData.id}`;
          success = true;
        }
      }
    }

    if (success) {
      await prisma.postChannel.update({
        where: { id: postChannelId },
        data: {
          status: "published",
          publishedUrl,
          publishedAt: new Date(),
          callbackToken: null,
          lockedAt: null,
          timeline: {
            push: {
              event: "published",
              at: new Date().toISOString(),
              note: `Direct API đăng thành công`,
            },
          } as never,
        },
      });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi không xác định";
    await prisma.postChannel.update({
      where: { id: postChannelId },
      data: {
        status: "failed",
        errorMessage: message,
        callbackToken: null,
        lockedAt: null,
      },
    });
  }

  await syncPostStatus(postId);
}
