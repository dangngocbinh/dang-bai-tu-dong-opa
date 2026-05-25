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
    Array<{ id: string; postId: string; channelId: string }>
  >`
    SELECT pc.id, pc."postId", pc."channelId"
    FROM "PostChannel" pc
    JOIN "Post" p ON p.id = pc."postId"
    JOIN "Channel" c ON c.id = pc."channelId"
    JOIN "User" u ON u.id = p."userId"
    WHERE pc.status = 'pending'
      AND pc."lockedAt" IS NULL
      AND p."scheduledAt" <= NOW()
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

      await syncPostStatus(row.postId);

      const postChannel = await prisma.postChannel.findUnique({
        where: { id: row.id },
        include: {
          post: { select: { id: true, content: true, mediaUrls: true } },
          channel: true,
        },
      });

      if (!postChannel) continue;

      const channel = postChannel.channel;
      const post = postChannel.post;
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/posts/callback?token=${callbackToken}`;

      if (channel.connectionType === "webhook" && channel.webhookUrl) {
        const media = post.mediaUrls as Array<{ key: string; url: string; type: string; size: number; name: string }>;
        const imageMedia = media.filter((m) => m.type?.startsWith("image"));
        const videoMedia = media.filter((m) => m.type?.startsWith("video"));

        const imageUrls = imageMedia.map((m) => ({
          type: "url",
          caption: "",
          url: m.url,
          image_url: m.url,
          media_type: "IMAGE",
        }));

        const postType = videoMedia.length > 0 ? "Video" : imageMedia.length > 0 ? "Image" : "Text";
        const title = post.content.split("\n")[0].slice(0, 200);

        // Await Make.com synchronously — lấy kết quả trực tiếp từ response
        let webhookRes: Response | null = null;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60_000);
          webhookRes = await fetch(channel.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              post_id: post.id,
              title,
              content: post.content,
              imageUrls,
              firstPhotoUrl: imageMedia[0]?.url ?? "",
              videoUrl: videoMedia[0]?.url ?? "",
              link: "",
              post_type: postType,
              first_comment: "",
              page_id: channel.platformId ?? channel.id,
              channel_title: channel.name,
              channel_type: channel.platform,
              action: "post",
              callbackUrl,
            }),
          }).finally(() => clearTimeout(timeout));
        } catch {
          // timeout hoặc network error — để 10-min timeout xử lý
        }

        if (webhookRes && webhookRes.ok) {
          // Parse response từ Make.com để lấy publishedUrl
          let publishedUrl: string | undefined;
          try {
            const text = await webhookRes.text();
            const json = text ? JSON.parse(text) : null;
            publishedUrl =
              json?.url ?? json?.published_url ?? json?.post_url ?? json?.link ?? undefined;
          } catch {
            // Make.com trả về non-JSON — OK, chỉ cần HTTP 200
          }

          await prisma.postChannel.update({
            where: { id: row.id },
            data: {
              status: "published",
              publishedAt: new Date(),
              publishedUrl: publishedUrl ?? null,
              callbackToken: null,
              lockedAt: null,
              timeline: {
                push: {
                  event: "published",
                  at: new Date().toISOString(),
                  note: publishedUrl
                    ? `Make.com OK — ${publishedUrl}`
                    : "Make.com OK (không có link)",
                },
              } as never,
            },
          });
          await syncPostStatus(row.postId);
        } else {
          // HTTP error — ghi lại nhưng giữ processing, 10-min timeout sẽ fail
          const statusCode = webhookRes?.status ?? "timeout";
          await prisma.postChannel.update({
            where: { id: row.id },
            data: {
              timeline: {
                push: {
                  event: "webhook_error",
                  at: new Date().toISOString(),
                  note: `Make.com trả HTTP ${statusCode}`,
                },
              } as never,
            },
          });
        }
      } else if (
        channel.connectionType === "api" &&
        channel.credentials
      ) {
        // Direct API posting (Threads, X.com)
        await handleDirectApi(row.id, row.postId, postChannel, callbackToken);
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
        await syncPostStatus(row.postId);
      }

      processed++;
    } catch (e) {
      console.error(`Failed to process postChannel ${row.id}:`, e);
    }
  }

  // Notify affected users via SSE
  const affectedPostIds = Array.from(new Set(pending.map((r) => r.postId)));
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
