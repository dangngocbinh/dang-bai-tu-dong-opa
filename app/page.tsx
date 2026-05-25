import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // First-run check: if no users exist, go to setup
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }

  // If authenticated, go to dashboard
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  // Otherwise go to login
  redirect("/login");
}
