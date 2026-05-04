"use client";

import AppLayout from "@/components/layout/AppLayout";
import { MOCK_POSTS, PLATFORMS, MOCK_CHANNELS, getStatusColor, getStatusLabel, getPostChannels, formatDate, getPlatformColor, getPlatformName } from "@/lib/mock-data";
import PlatformIcon from "@/components/PlatformIcon";
import { Plus, Search, Filter, AlertCircle, Copy, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const STATUS_FILTERS = ["all", "draft", "scheduled", "published", "failed"];

function ChannelTags({ channelIds }: { channelIds: string[] }) {
  const channels = getPostChannels(channelIds);
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {channels.map((ch) => (
        <span key={ch.id} className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
          <PlatformIcon platform={ch.platform} size={12} />
          {ch.name}
        </span>
      ))}
    </div>
  );
}

export default function PostsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");

  const filtered = MOCK_POSTS.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchPlatform = platformFilter === "all" || getPostChannels(p.channelIds).some((c) => c.platform === platformFilter);
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.caption.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchPlatform && matchSearch;
  });

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bài đăng</h1>
            <p className="text-gray-500 text-sm mt-0.5">{MOCK_POSTS.length} bài đăng</p>
          </div>
          <Link href="/posts/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors shadow-sm">
            <Plus size={16} />Soạn bài mới
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Tìm kiếm bài đăng..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer bg-white">
              <option value="all">Tất cả trạng thái</option>
              {STATUS_FILTERS.slice(1).map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
            </select>
            <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer bg-white">
              <option value="all">Tất cả nền tảng</option>
              {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 mb-5">
          {STATUS_FILTERS.map((s) => {
            const count = s === "all" ? MOCK_POSTS.length : MOCK_POSTS.filter((p) => p.status === s).length;
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}>
                {s === "all" ? "Tất cả" : getStatusLabel(s)} ({count})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <p className="text-gray-500 font-medium">Không tìm thấy bài đăng nào</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filtered.map((post) => (
                <div key={post.id} className="p-5 hover:bg-gray-50/60 transition-colors group">
                  <div className="flex items-start gap-4">
                    {/* Platform colors bar */}
                    <div className="flex flex-col gap-0.5 mt-1 flex-shrink-0">
                      {getPostChannels(post.channelIds).slice(0, 3).map((ch) => (
                        <div key={ch.id} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPlatformColor(ch.platform) }} />
                      ))}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Link href={`/posts/${post.id}`}
                          className="font-semibold text-gray-900 hover:text-indigo-600 cursor-pointer transition-colors truncate">
                          {post.title}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getStatusColor(post.status)}`}>
                          {getStatusLabel(post.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate mb-2">{post.caption}</p>

                      <div className="flex items-center gap-3 flex-wrap">
                        <ChannelTags channelIds={post.channelIds} />
                        <span className="text-xs text-gray-400">·</span>
                        <span className="text-xs text-gray-400">{post.scheduledAt ? formatDate(post.scheduledAt) : "Chưa lên lịch"}</span>
                      </div>

                      {post.status === "failed" && post.failReason && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
                          <AlertCircle size={12} />{post.failReason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {post.status === "published" && (
                        <button className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"><ExternalLink size={15} /></button>
                      )}
                      {post.status === "failed" && (
                        <button className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer"><RefreshCw size={15} /></button>
                      )}
                      <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"><Copy size={15} /></button>
                      <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={15} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
