import { auth } from "@/auth";
import { redirect } from "next/navigation";
import SessionProvider from "@/components/providers/SessionProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import SSEProvider from "@/components/providers/SSEProvider";
import AppLayout from "@/components/layout/AppLayout";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider>
      <QueryProvider>
        <SSEProvider />
        <AppLayout>{children}</AppLayout>
      </QueryProvider>
    </SessionProvider>
  );
}
