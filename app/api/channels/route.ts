import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { encrypt } from "@/lib/crypto";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  platform: z.enum(["facebook", "instagram", "linkedin", "youtube", "threads", "x"]),
  connectionType: z.enum(["webhook", "api", "oauth"]),
  webhookUrl: z.string().url().optional(),
  credentials: z.record(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const status = searchParams.get("status");

  const channels = await prisma.channel.findMany({
    where: {
      userId: session.user.id,
      ...(platform && { platform }),
      ...(status && { status }),
    },
    select: {
      id: true,
      name: true,
      platform: true,
      connectionType: true,
      status: true,
      lastTestedAt: true,
      createdAt: true,
      _count: { select: { postChannels: { where: { status: "published" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(channels);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  const { name, platform, connectionType, webhookUrl, credentials } = parsed.data;

  // Check unique name per user
  const existing = await prisma.channel.findFirst({
    where: { userId: session.user.id, name },
  });
  if (existing) {
    return err("NAME_EXISTS", "Tên Kênh đã tồn tại", 409);
  }

  const encryptedCreds =
    credentials ? encrypt(JSON.stringify(credentials)) : null;

  const channel = await prisma.channel.create({
    data: {
      userId: session.user.id,
      name,
      platform,
      connectionType,
      webhookUrl,
      credentials: encryptedCreds ? ({ encrypted: encryptedCreds } as Record<string, string>) : undefined,
    },
    select: {
      id: true, name: true, platform: true, connectionType: true, status: true, createdAt: true,
    },
  });

  return ok(channel, 201);
}
