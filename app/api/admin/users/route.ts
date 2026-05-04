import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ok, err } from "@/lib/response";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return err("FORBIDDEN", "Không có quyền", 403);
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));

  const users = await prisma.user.findMany({
    where: {
      ...(search && { email: { contains: search, mode: "insensitive" } }),
      ...(role && { role }),
      ...(status && { status }),
    },
    select: {
      id: true, email: true, displayName: true, role: true,
      status: true, lastLoginAt: true, createdAt: true,
      _count: { select: { posts: true, channels: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.user.count({
    where: {
      ...(search && { email: { contains: search, mode: "insensitive" } }),
      ...(role && { role }),
      ...(status && { status }),
    },
  });

  return ok({ users, total, page, limit });
}
