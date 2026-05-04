"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, FileText, Loader2 } from "lucide-react";
import PlatformIcon, { PLATFORMS } from "@/components/PlatformIcon";

type PostChannel = {
  id: string;
  status: string;
  channel: { id: string; name: string; platform: string };
};

type Post = {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  postChannels: PostChannel[];
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Nháp",
  scheduled: "Đã lên lịch",
  processing: "Đang đăng",
  published: "Đã đăng",
  failed: "Thất bại",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-50 text-blue-700",
  processing: "bg-amber-50 text-amber-700",
  published: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-600",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PostsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (platformFilter !== "all") params.set("platform", platformFilter);
  if (search) params.set("search", search);

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["posts", statusFilter, platformFilter, search],
    queryFn: async () => {
      const res = await fetch(`/api/posts?${params.toString()}`);
      const json = await res.json();
      return json.data ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Đang tải...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bài đăng</h1>
          <p className="text-gray-500 text-sm mt-0.5">{posts.length} bài đăng</p>
        </div>
        <Link
          href="/posts/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Soạn bài mới
        </Link>
      </div>

      {posts.length === 0 && statusFilter === "all" && !search && !platformFilter.match(/facebook|instagram|linkedin|youtube|threads|x/) ? (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Chưa có bài đăng nào</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
            Soạn bài đầu tiên để bắt đầu lên lịch đăng tự động lên các Kênh
          </p>
          <Link
            href="/posts/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Soạn bài đầu tiên
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Tìm kiếm bài đăng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả nền tảng</option>
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400 text-sm">Không tìm thấy bài đăng nào</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/posts/${post.id}`}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[post.status] ?? "bg-gray-100 text-gray-500"}`}
                        >
                          {STATUS_LABELS[post.status] ?? post.status}
                        </span>
                        {post.scheduledAt && (
                          <span className="text-xs text-gray-400">
                            {formatDate(post.scheduledAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-800 line-clamp-2 leading-relaxed">
                        {post.content || (
                          <span className="italic text-gray-400">(Nội dung trống)</span>
                        )}
                      </p>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {post.postChannels.map((pc) => (
                          <span
                            key={pc.id}
                            className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md"
                          >
                            <PlatformIcon platform={pc.channel.platform} size={12} />
                            {pc.channel.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 flex-shrink-0 pt-0.5">
                      {formatDate(post.createdAt)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
