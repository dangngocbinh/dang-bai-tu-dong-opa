"use client";

import AppLayout from "@/components/layout/AppLayout";
import { MOCK_POSTS, getStatusColor, getStatusLabel, getPostChannels, getPlatformColor, getPlatformName, formatDate } from "@/lib/mock-data";
import PlatformIcon from "@/components/PlatformIcon";
import { ArrowLeft, ExternalLink, RefreshCw, Copy, Trash2, CheckCircle, Clock, AlertCircle, Zap } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function PostDetailPage() {
  const params = useParams();
  const post = MOCK_POSTS.find((p) => p.id === params.id) ?? MOCK_POSTS[0];
  const channels = getPostChannels(post.channelIds);

  const timeline = [
    { step: "Tạo bài", time: post.createdAt, status: "done", note: "Bài được tạo" },
    { step: "Lên lịch", time: post.scheduledAt, status: post.scheduledAt ? "done" : "pending", note: post.scheduledAt ? `Đặt lịch đăng lúc ${formatDate(post.scheduledAt)}` : "Chưa lên lịch" },
    {
      step: "Đang xử lý",
      time: post.status !== "draft" && post.status !== "scheduled" ? post.scheduledAt : undefined,
      status: post.status === "processing" ? "active" : (post.status === "published" || post.status === "failed") ? "done" : "pending",
      note: "Gọi webhook / API để đăng bài lên từng kênh",
    },
    {
      step: post.status === "failed" ? "Thất bại" : "Đã đăng",
      time: (post as any).publishedAt,
      status: post.status === "published" ? "done" : post.status === "failed" ? "error" : "pending",
      note: post.status === "published"
        ? `Đăng thành công lên ${channels.length} kênh`
        : post.failReason ?? "Chưa đăng",
    },
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-4xl">
        <Link href="/posts" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer mb-6 transition-colors">
          <ArrowLeft size={15} />Quay lại danh sách
        </Link>

        <div className="grid grid-cols-3 gap-6">
          {/* Main */}
          <div className="col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{post.title}</h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(post.status)}`}>
                      {getStatusLabel(post.status)}
                    </span>
                    <span className="text-xs text-gray-400">ID: {post.id}</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {post.status === "failed" && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg cursor-pointer font-medium">
                      <RefreshCw size={13} />Thử đăng lại
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"><Copy size={15} /></button>
                  <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 size={15} /></button>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
              </div>

              {/* Channels list */}
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kênh đăng ({channels.length})</p>
                <div className="space-y-2">
                  {channels.map((ch) => (
                    <div key={ch.id} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2.5">
                        <PlatformIcon platform={ch.platform} size={24} />
                        <div>
                          <div className="text-sm font-medium text-gray-800">{ch.name}</div>
                          <div className="text-xs text-gray-400">{getPlatformName(ch.platform)}</div>
                        </div>
                      </div>
                      {post.status === "published" && (post as any).postUrl ? (
                        <a href={(post as any).postUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer">
                          Xem bài <ExternalLink size={11} />
                        </a>
                      ) : post.status === "failed" ? (
                        <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11} />Lỗi</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {post.status === "failed" && post.failReason && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={15} className="text-red-600" />
                    <span className="text-sm font-semibold text-red-800">Lý do thất bại</span>
                  </div>
                  <p className="text-sm text-red-700">{post.failReason}</p>
                  <p className="text-xs text-red-400 mt-1 font-mono">HTTP 401 · {"{ \"error\": \"Token expired\" }"}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-1 space-y-4">
            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Timeline</h2>
              <div className="relative">
                {timeline.map((item, i) => (
                  <div key={i} className="flex gap-3 mb-5 last:mb-0 relative">
                    {i < timeline.length - 1 && (
                      <div className="absolute left-3.5 top-7 bottom-0 w-0.5 bg-gray-100" />
                    )}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.status === "done" ? "bg-emerald-100" :
                      item.status === "active" ? "bg-blue-100" :
                      item.status === "error" ? "bg-red-100" : "bg-gray-100"
                    }`}>
                      {item.status === "done" ? <CheckCircle size={14} className="text-emerald-600" /> :
                       item.status === "active" ? <Zap size={14} className="text-blue-600" /> :
                       item.status === "error" ? <AlertCircle size={14} className="text-red-600" /> :
                       <Clock size={14} className="text-gray-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${item.status === "error" ? "text-red-700" : item.status === "done" ? "text-gray-800" : "text-gray-400"}`}>
                        {item.step}
                      </p>
                      {item.time && <p className="text-xs text-gray-400 mt-0.5">{formatDate(item.time)}</p>}
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Thông tin</h2>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Ngày tạo</dt>
                  <dd className="font-medium text-gray-800">{formatDate(post.createdAt)}</dd>
                </div>
                {post.scheduledAt && (
                  <div className="flex justify-between">
                    <dt className="text-gray-400">Lên lịch</dt>
                    <dd className="font-medium text-gray-800">{formatDate(post.scheduledAt)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-400">Số kênh</dt>
                  <dd className="font-medium text-gray-800">{channels.length} kênh</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
