import { prisma } from "@/lib/prisma";
import { ok } from "@/lib/response";

export async function GET() {
  const count = await prisma.user.count();
  return ok({ hasUsers: count > 0 });
}
