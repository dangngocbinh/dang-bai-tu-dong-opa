import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { encrypt } from "@/lib/crypto";

export async function GET(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);
  const { id } = await _params;

  const channel = await prisma.channel.findFirst({
    where: { id: id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      platform: true,
      connectionType: true,
      webhookUrl: true,
      status: true,
      lastTestedAt: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { postChannels: { where: { status: "published" } } } },
    },
  });
  if (!channel) return err("NOT_FOUND", "Kênh không tồn tại", 404);

  return ok(channel);
}

export async function PATCH(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);
  const { id } = await _params;

  const channel = await prisma.channel.findFirst({
    where: { id: id, userId: session.user.id },
  });
  if (!channel) return err("NOT_FOUND", "Kênh không tồn tại", 404);

  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    webhookUrl: z.string().url().optional(),
    credentials: z.record(z.string()).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  const { name, webhookUrl, credentials, status } = parsed.data;

  if (name && name !== channel.name) {
    const existing = await prisma.channel.findFirst({
      where: { userId: session.user.id, name, id: { not: id } },
    });
    if (existing) return err("NAME_EXISTS", "Tên Kênh đã tồn tại", 409);
  }

  const encryptedCreds = credentials
    ? ({ encrypted: encrypt(JSON.stringify(credentials)) } as object)
    : undefined;

  const updated = await prisma.channel.update({
    where: { id: id },
    data: {
      ...(name && { name }),
      ...(webhookUrl !== undefined && { webhookUrl }),
      ...(encryptedCreds && { credentials: encryptedCreds }),
      ...(status && { status }),
    },
    select: { id: true, name: true, platform: true, connectionType: true, status: true, updatedAt: true },
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

  const channel = await prisma.channel.findFirst({
    where: { id: id, userId: session.user.id },
  });
  if (!channel) return err("NOT_FOUND", "Kênh không tồn tại", 404);

  // Fail any pending post_channels for this channel before deleting
  const updated = await prisma.postChannel.updateMany({
    where: { channelId: id, status: "pending" },
    data: {
      status: "failed",
      errorMessage: "Kênh đã bị xóa",
    },
  });

  await prisma.channel.delete({ where: { id: id } });

  return ok({ message: `Đã xóa kênh và hủy ${updated.count} bài đang lên lịch` });
}
