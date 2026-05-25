import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [postStats, channelCount, expiredChannels] = await Promise.all([
    prisma.post.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    }),
    prisma.channel.count({ where: { userId, status: "active" } }),
    prisma.channel.findMany({
      where: { userId, status: "expired" },
      select: { id: true, name: true, platform: true },
    }),
  ]);

  const statMap = Object.fromEntries(
    postStats.map((s) => [s.status, s._count.status])
  );

  const displayName = session!.user.name ?? session!.user.email?.split("@")[0];

  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Xin chào, {displayName}!
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("vi-VN", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Link
          href="/posts/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          Soạn bài mới
        </Link>
      </div>

      {/* Expired channel banners */}
      {expiredChannels.map((ch) => (
        <div
          key={ch.id}
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 mb-4"
        >
          <span className="text-amber-600 flex-shrink-0">⚠️</span>
          <p className="text-amber-800 text-sm flex-1">
            Kênh <strong>{ch.name}</strong> đã hết hạn kết nối.{" "}
            <Link
              href={`/channels`}
              className="underline font-medium"
            >
              Kết nối lại ngay
            </Link>
          </p>
        </div>
      ))}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Bài đã đăng",
            value: statMap["published"] ?? 0,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            label: "Đã lên lịch",
            value: statMap["scheduled"] ?? 0,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Bản nháp",
            value: statMap["draft"] ?? 0,
            color: "text-gray-600",
            bg: "bg-gray-100",
          },
          {
            label: "Kênh active",
            value: channelCount,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
          >
            <div
              className={`text-3xl font-bold ${stat.color} mb-1`}
            >
              {stat.value}
            </div>
            <div className="text-gray-500 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Onboarding — shown if no channels yet */}
      {channelCount === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Bắt đầu với OPA</h2>
          <p className="text-sm text-gray-500 mb-4">
            Hoàn thành 3 bước để đăng bài đầu tiên
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Kết nối kênh đầu tiên", href: "/channels/new", step: 1 },
              { label: "Soạn bài đầu tiên", href: "/posts/new", step: 2 },
              { label: "Hẹn giờ đăng bài", href: "/calendar", step: 3 },
            ].map((step) => (
              <Link
                key={step.step}
                href={step.href}
                className="bg-white rounded-xl border border-indigo-200 p-4 text-sm text-gray-700 hover:border-indigo-400 transition-colors"
              >
                <span className="text-indigo-500 font-bold mr-1">
                  {step.step}.
                </span>
                {step.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
