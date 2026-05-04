import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import RoleSwitcher from "@/components/RoleSwitcher";

export const metadata: Metadata = {
  title: "OPA — Open Publishing Assistant",
  description: "Soạn 1 bài, đăng khắp nơi — tự động, không cần ngồi chờ.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full">
        <AppProvider>
          {children}
          <RoleSwitcher />
        </AppProvider>
      </body>
    </html>
  );
}
