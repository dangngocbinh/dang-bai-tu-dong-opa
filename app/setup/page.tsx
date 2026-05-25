import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SetupForm from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // If users already exist, setup is done — redirect to login
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Khởi tạo tài khoản Admin
          </h1>
          <p className="text-gray-500 text-sm mt-2 leading-relaxed">
            Đây là tài khoản sẽ quản lý toàn bộ hệ thống.
            <br />
            Sau khi tạo, trang này sẽ bị khoá vĩnh viễn.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
