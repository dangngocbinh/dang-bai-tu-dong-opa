import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";
import { sendEmail, passwordChangedEmail } from "@/lib/email";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Mật khẩu mới phải ít nhất 8 ký tự"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, email: true },
  });
  if (!user) return err("NOT_FOUND", "User không tồn tại", 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return err("WRONG_PASSWORD", "Mật khẩu hiện tại không đúng", 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  await sendEmail(
    user.email,
    "Mật khẩu OPA đã được thay đổi",
    passwordChangedEmail()
  ).catch(() => {});

  return ok({ message: "Đổi mật khẩu thành công" });
}
