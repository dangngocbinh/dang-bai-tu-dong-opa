import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [userCount, postCount] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
  ]);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Tổng Users", value: userCount },
          { label: "Tổng bài đăng", value: postCount },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm"
          >
            <div className="text-3xl font-bold text-indigo-600 mb-1">
              {stat.value}
            </div>
            <div className="text-gray-500 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* TODO: Full DASH-001 stats — successRateByPlatform, recentFailedPosts */}
      <div className="text-gray-400 text-sm text-center py-20">
        Dashboard đầy đủ — đang phát triển (DASH-001)
      </div>
    </div>
  );
}
