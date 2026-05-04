import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

const schema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải ít nhất 8 ký tự"),
});

export async function POST(req: NextRequest) {
  // Only works when no users exist
  const count = await prisma.user.count();
  if (count > 0) {
    return err("SETUP_DONE", "Hệ thống đã được thiết lập", 404);
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  const { email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { email, passwordHash, role: "admin" },
    select: { id: true, email: true },
  });

  return ok({ message: "Admin đã được tạo thành công", user }, 201);
}
