"use client";

import AppLayout from "@/components/layout/AppLayout";
import { MOCK_POSTS, PLATFORMS, getPostChannels } from "@/lib/mock-data";
import { TrendingUp, TrendingDown, Heart, MessageCircle, Share2, Eye, BarChart2, Calendar } from "lucide-react";
import { useState } from "react";

const RANGE_OPTIONS = ["7 ngày", "30 ngày", "90 ngày", "Tùy chỉnh"];

const SEED_STATS: Record<string, { likes: number; comments: number; shares: number; reach: number }> = {
  "1": { likes: 145, comments: 19, shares: 34, reach: 2731 },
  "5": { likes: 104, comments: 37, shares: 88, reach: 4967 },
};

const MOCK_STATS = MOCK_POSTS.filter((p) => p.status === "published").map((p) => ({
  ...p,
  ...(SEED_STATS[p.id] ?? { likes: 72, comments: 11, shares: 21, reach: 1200 }),
}));

const TOP5 = [...MOCK_STATS].sort((a, b) => b.reach - a.reach).slice(0, 5);

export default function ReportsPage() {
  const [range, setRange] = useState("30 ngày");

  const totalReach = MOCK_STATS.reduce((s, p) => s + p.reach, 0);
  const totalLikes = MOCK_STATS.reduce((s, p) => s + p.likes, 0);
  const totalComments = MOCK_STATS.reduce((s, p) => s + p.comments, 0);
  const totalShares = MOCK_STATS.reduce((s, p) => s + p.shares, 0);

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Báo cáo hiệu quả</h1>
            <p className="text-gray-500 text-sm mt-0.5">Theo dõi hiệu quả bài đăng trên từng nền tảng</p>
          </div>
          <div className="flex items-center gap-2">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  range === r ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Tổng reach", value: totalReach.toLocaleString(), icon: Eye, trend: "+12%", up: true, color: "bg-indigo-50 text-indigo-600" },
            { label: "Lượt thích", value: totalLikes.toLocaleString(), icon: Heart, trend: "+8%", up: true, color: "bg-rose-50 text-rose-600" },
            { label: "Bình luận", value: totalComments.toLocaleString(), icon: MessageCircle, trend: "-3%", up: false, color: "bg-blue-50 text-blue-600" },
            { label: "Chia sẻ", value: totalShares.toLocaleString(), icon: Share2, trend: "+15%", up: true, color: "bg-emerald-50 text-emerald-600" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon size={17} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${s.up ? "text-emerald-600" : "text-red-500"}`}>
                    {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {s.trend}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Platform breakdown */}
          <div className="col-span-1 bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-indigo-600" />
              Theo nền tảng
            </h2>
            <div className="space-y-3">
              {PLATFORMS.slice(0, 4).map((pl) => {
                const posts = MOCK_STATS.filter((p) => getPostChannels(p.channelIds).some((ch) => ch.platform === pl.id));
                const reach = posts.reduce((s, p) => s + p.reach, 0);
                const maxReach = 5000;
                const pct = Math.min((reach / maxReach) * 100, 100);

                return (
                  <div key={pl.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: pl.color }}
                        >
                          {pl.name.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-gray-700">{pl.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{reach.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: pl.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 5 posts */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600" />
              Top 5 bài hiệu quả nhất
            </h2>
            <div className="space-y-3">
              {TOP5.map((post, i) => (
                <div key={post.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? "bg-amber-100 text-amber-700" :
                    i === 1 ? "bg-gray-100 text-gray-600" :
                    i === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-gray-50 text-gray-500"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{post.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      {getPostChannels(post.channelIds).map((ch) => ch.name).join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                    <span className="flex items-center gap-1"><Eye size={11} /> {post.reach.toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Heart size={11} /> {post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle size={11} /> {post.comments}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Post-level table */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Chi tiết từng bài</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Bài đăng</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Nền tảng</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Reach</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Thích</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Bình luận</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Chia sẻ</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_STATS.map((post) => (
                  <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="text-sm font-medium text-gray-900 max-w-xs truncate">{post.title}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1">
                        {getPostChannels(post.channelIds).map((ch) => {
                          const platform = PLATFORMS.find((p) => p.id === ch.platform);
                          return (
                            <span
                              key={ch.id}
                              className="text-xs px-1.5 py-0.5 rounded text-white font-medium"
                              style={{ backgroundColor: platform?.color ?? "#6B7280" }}
                            >
                              {platform?.name.charAt(0)}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-medium text-gray-900">{post.reach.toLocaleString()}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-600">{post.likes}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-gray-600">{post.comments}</td>
                    <td className="px-6 py-3.5 text-right text-sm text-gray-600">{post.shares}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
