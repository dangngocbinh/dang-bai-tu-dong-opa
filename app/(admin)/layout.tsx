import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SessionProvider from "@/components/providers/SessionProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import AppLayout from "@/components/layout/AppLayout";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");

  return (
    <SessionProvider>
      <QueryProvider>
        <AppLayout>{children}</AppLayout>
      </QueryProvider>
    </SessionProvider>
  );
}
