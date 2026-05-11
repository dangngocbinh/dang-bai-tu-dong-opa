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
  if (!session || session.user.role !== "admin") {
    return err("FORBIDDEN", "Không có quyền", 403);
  }
  const { id } = await _params;

  const user = await prisma.user.findUnique({
    where: { id: id },
    select: {
      id: true, email: true, displayName: true, role: true,
      status: true, timezone: true, telegramChatId: true,
      lastLoginAt: true, createdAt: true,
      _count: { select: { posts: true, channels: true } },
      channels: {
        select: {
          id: true, name: true, platform: true, status: true,
          connectionType: true, lastTestedAt: true, createdAt: true,
          _count: { select: { postChannels: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user) return err("NOT_FOUND", "User không tồn tại", 404);

  return ok(user);
}

const updateSchema = z.object({
  status: z.enum(["active", "inactive"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params: _params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return err("FORBIDDEN", "Không có quyền", 403);
  }
  const { id } = await _params;

  // Prevent admin from locking themselves
  if (id === session.user.id) {
    const body = await req.json();
    if (body.status === "inactive") {
      return err(
        "SELF_LOCK",
        "Không thể khoá tài khoản admin đang đăng nhập",
        400
      );
    }
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  const updated = await prisma.user.update({
    where: { id: id },
    data: parsed.data,
    select: { id: true, email: true, role: true, status: true },
  });

  return ok(updated);
}
