import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

// Chỉ dùng trong môi trường development để dọn dẹp data test
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return err("FORBIDDEN", "Chỉ dùng trong development", 403);
  }

  const { prefix } = await req.json();
  if (!prefix || !prefix.startsWith("e2e.")) {
    return err("INVALID", "Chỉ xóa được user e2e.*", 400);
  }

  const deleted = await prisma.user.deleteMany({
    where: { email: { startsWith: prefix } },
  });

  return ok({ deleted: deleted.count });
}
