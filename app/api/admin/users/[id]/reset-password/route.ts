import { NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { sendEmail, resetPasswordEmail } from "@/lib/email";

const schema = z.object({
  method: z.enum(["email", "manual"]).default("email"),
  newPassword: z.string().min(8).optional(),
});

export async function POST(
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
    select: { email: true },
  });
  if (!user) return err("NOT_FOUND", "User không tồn tại", 404);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  if (parsed.data.method === "email") {
    // Invalidate old tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: id, token, expiresAt },
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    await sendEmail(user.email, "Đặt lại mật khẩu OPA", resetPasswordEmail(resetUrl)).catch(() => {});

    return ok({ message: "Đã gửi email reset password" });
  }

  return err("NOT_IMPLEMENTED", "Manual reset chưa triển khai", 501);
}
