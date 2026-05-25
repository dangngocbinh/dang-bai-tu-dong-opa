"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, AlertCircle,
  ExternalLink, FileText, Image as ImageIcon, Calendar, Radio,
  RefreshCw,
} from "lucide-react";

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", linkedin: "LinkedIn",
  youtube: "YouTube", threads: "Threads", x: "X",
};

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "bg-blue-100 text-blue-700",
  instagram: "bg-pink-100 text-pink-700",
  linkedin: "bg-sky-100 text-sky-700",
  youtube: "bg-red-100 text-red-700",
  threads: "bg-gray-100 text-gray-700",
  x: "bg-gray-100 text-gray-800",
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  draft:      { label: "Bản nháp",    icon: FileText,      className: "bg-gray-100 text-gray-600 border-gray-200" },
  scheduled:  { label: "Đã lên lịch", icon: Calendar,      className: "bg-blue-100 text-blue-700 border-blue-200" },
  processing: { label: "Đang đăng",   icon: Loader2,       className: "bg-amber-100 text-amber-700 border-amber-200" },
  published:  { label: "Đã đăng",     icon: CheckCircle2,  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  failed:     { label: "Thất bại",    icon: XCircle,       className: "bg-red-100 text-red-700 border-red-200" },
};

const EVENT_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  scheduled:    { label: "Lên lịch",           color: "text-blue-600",    dot: "bg-blue-400" },
  processing:   { label: "Bắt đầu xử lý",      color: "text-amber-600",   dot: "bg-amber-400" },
  webhook_sent: { label: "Gọi webhook",         color: "text-indigo-600",  dot: "bg-indigo-400" },
  published:    { label: "Đăng thành công",     color: "text-emerald-600", dot: "bg-emerald-500" },
  failed:       { label: "Thất bại",            color: "text-red-600",     dot: "bg-red-500" },
  reschedule:   { label: "Đổi lịch",            color: "text-purple-600",  dot: "bg-purple-400" },
  retry:        { label: "Thử lại",             color: "text-orange-600",  dot: "bg-orange-400" },
};

interface TimelineEvent {
  event: string;
  at: string;
  note: string;
}

interface PostChannel {
  id: string;
  status: string;
  publishedUrl: string | null;
  errorMessage: string | null;
  publishedAt: string | null;
  retryCount: number;
  timeline: TimelineEvent[];
  channel: { id: string; name: string; platform: string };
}

interface Post {
  id: string;
  content: string;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  mediaUrls: Array<{ key: string; url: string; type: string; name: string; size: number }>;
  postChannels: PostChannel[];
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.className}`}>
      <Icon size={11} className={status === "processing" ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

function ChannelCard({ pc, postCreatedAt }: { pc: PostChannel; postCreatedAt: string }) {
  const platform = pc.channel.platform;
  const timeline: TimelineEvent[] = [
    { event: "created", at: postCreatedAt, note: "Bài đăng được tạo" },
    ...pc.timeline,
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PLATFORM_COLOR[platform] ?? "bg-gray-100 text-gray-600"}`}>
              {PLATFORM_LABEL[platform] ?? platform}
            </span>
            <span className="text-sm font-semibold text-gray-800">{pc.channel.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pc.retryCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
              <RefreshCw size={10} />
              Retry ×{pc.retryCount}
            </span>
          )}
          <StatusBadge status={pc.status} />
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Timeline */}
        <div className="relative">
          {timeline.map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.event] ?? { label: ev.event, color: "text-gray-500", dot: "bg-gray-400" };
            const isLast = i === timeline.length - 1;
            return (
              <div key={i} className="flex gap-3">
                {/* Dot + line */}
                <div className="flex flex-col items-center flex-shrink-0 w-5">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${cfg.dot}`} />
                  {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1 mb-1" />}
                </div>
                {/* Content */}
                <div className={`pb-4 flex-1 ${isLast ? "" : ""}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <span className="text-xs text-gray-400">{fmt(ev.at)}</span>
                  </div>
                  {ev.note && (
                    <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Published link */}
        {pc.status === "published" && pc.publishedUrl && (
          <a
            href={pc.publishedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink size={12} />
            Xem bài đăng
          </a>
        )}

        {/* Error message */}
        {pc.status === "failed" && pc.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
              <span className="text-xs font-semibold text-red-700">Chi tiết lỗi</span>
            </div>
            <p className="text-xs text-red-600 font-mono break-all leading-relaxed">
              {pc.errorMessage.length > 500
                ? pc.errorMessage.slice(0, 500) + "…"
                : pc.errorMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) { setNotFound(true); return; }
        setPost(res.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="p-8 max-w-4xl">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer">
          <ArrowLeft size={15} /> Quay lại
        </button>
        <div className="text-center py-20 text-gray-400">Không tìm thấy bài đăng.</div>
      </div>
    );
  }

  const mediaUrls = Array.isArray(post.mediaUrls) ? post.mediaUrls : [];
  const hasMedia = mediaUrls.length > 0;
  const overallStatus = STATUS_CONFIG[post.status] ?? STATUS_CONFIG.draft;
  const OverallIcon = overallStatus.icon;

  return (
    <div className="p-8 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 cursor-pointer transition-colors"
      >
        <ArrowLeft size={15} />
        Quay lại danh sách
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chi tiết bài đăng</h1>
          <p className="text-xs text-gray-400 mt-1 font-mono">ID: {post.id}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium flex-shrink-0 ${overallStatus.className}`}>
          <OverallIcon size={13} className={post.status === "processing" ? "animate-spin" : ""} />
          {overallStatus.label}
        </span>
      </div>

      <div className="space-y-5">
        {/* Nội dung bài */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Nội dung</h2>
          {post.content ? (
            <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{post.content}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">Không có nội dung</p>
          )}

          {/* Media */}
          {hasMedia && (
            <div className="mt-4 flex flex-wrap gap-3">
              {mediaUrls.map((m, i) => (
                <div key={i} className="relative group">
                  {m.type === "image" ? (
                    <img
                      src={m.url}
                      alt={m.name}
                      className="w-20 h-20 object-cover rounded-xl border border-gray-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1">
                      <ImageIcon size={18} className="text-gray-400" />
                      <span className="text-[10px] text-gray-400">Video</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thông tin lịch + kênh */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Thông tin</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-400">Tạo lúc:</span>
              <span>{fmtDate(post.createdAt)}</span>
            </div>
            {post.scheduledAt && (
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-400">Lịch đăng:</span>
                <span>{fmtDate(post.scheduledAt)}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Radio size={14} className="text-gray-400 flex-shrink-0" />
              <span className="text-gray-400">Kênh:</span>
              <span>{post.postChannels.length} kênh</span>
            </div>
          </div>
        </div>

        {/* Timeline từng kênh */}
        {post.postChannels.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Timeline từng kênh</h2>
            <div className="space-y-4">
              {post.postChannels.map((pc) => (
                <ChannelCard key={pc.id} pc={pc} postCreatedAt={post.createdAt} />
              ))}
            </div>
          </div>
        )}

        {post.postChannels.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-gray-400 text-sm">
            Bài chưa được gán kênh nào.
          </div>
        )}
      </div>
    </div>
  );
}
