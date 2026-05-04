"use client";

import AppLayout from "@/components/layout/AppLayout";
import { MOCK_CHANNELS, PLATFORMS, getPlatformColor, getPlatformName } from "@/lib/mock-data";
import PlatformIcon from "@/components/PlatformIcon";
import { useState } from "react";
import { Bold, Upload, Send, Save, AlertTriangle, X, Check, Search, Zap, ImageIcon, Clock } from "lucide-react";
import Link from "next/link";

const CHAR_LIMITS: Record<string, number> = {
  x: 280, threads: 500, linkedin: 3000, facebook: 63206, instagram: 2200, youtube: 5000,
};

export default function NewPostPage() {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(["ch1", "ch2"]);
  const [mode, setMode] = useState<"schedule" | "now" | "draft">("schedule");
  const [date, setDate] = useState("2026-04-18");
  const [time, setTime] = useState("20:00");
  const [channelSearch, setChannelSearch] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const activeChannels = MOCK_CHANNELS.filter((c) => c.status !== "inactive");
  const filtered = channelSearch
    ? activeChannels.filter((c) => c.name.toLowerCase().includes(channelSearch.toLowerCase()))
    : activeChannels;
  const selected = MOCK_CHANNELS.filter((c) => selectedIds.includes(c.id));

  function toggle(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const warnings = selected.filter((ch) => {
    const lim = CHAR_LIMITS[ch.platform];
    return lim && caption.length > lim;
  });

  if (submitted) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check size={30} className="text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {mode === "draft" ? "Đã lưu nháp!" : mode === "now" ? "Đang đăng..." : "Đã lên lịch!"}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {mode === "schedule"
                ? `Sẽ đăng lên ${selected.length} kênh lúc ${time} ngày ${date}`
                : mode === "now" ? `Đang đăng lên ${selected.length} kênh...`
                : "Bài đã được lưu vào Nháp"}
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center mb-6">
              {selected.map((ch) => (
                <span key={ch.id} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                  <PlatformIcon platform={ch.platform} size={12} />{ch.name}
                </span>
              ))}
            </div>
            <div className="flex gap-2 justify-center">
              <Link href="/posts" className="px-4 py-2 border border-gray-200 rounded-xl text-sm cursor-pointer hover:bg-gray-50 transition-colors">
                Xem danh sách
              </Link>
              <Link href="/posts/new" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm cursor-pointer hover:bg-indigo-700 transition-colors">
                Soạn bài mới
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* ── LEFT: Writing area ── */}
        <div className="flex-1 min-w-0 overflow-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Check size={11} className="text-emerald-500" />Đã lưu
            </div>
            <h1 className="text-sm font-semibold text-gray-700">Soạn bài mới</h1>
            <button
              onClick={() => setSubmitted(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <Save size={13} />Lưu nháp
            </button>
          </div>

          <div className="px-8 py-6 max-w-2xl space-y-5">
            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Tiêu đề nội bộ (vd: Flash sale tháng 4)"
              className="w-full text-lg font-medium placeholder-gray-300 border-0 border-b border-gray-100 pb-2 focus:outline-none focus:border-indigo-300 bg-transparent transition-colors"
            />

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nội dung</span>
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded cursor-pointer text-gray-400 transition-colors">
                    <Bold size={13} />
                  </button>
                  <span className={`text-xs ${caption.length > 2200 ? "text-red-500" : "text-gray-400"}`}>
                    {caption.length}
                  </span>
                </div>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Hôm nay bạn muốn chia sẻ gì?"
                rows={8}
                className="w-full text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 resize-none leading-relaxed transition-colors"
              />
              {warnings.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {warnings.map((ch) => (
                    <span key={ch.id} className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">
                      <AlertTriangle size={10} />{ch.name}: vượt {CHAR_LIMITS[ch.platform]} ký tự
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Media */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors cursor-pointer group">
              <Upload size={20} className="text-gray-300 group-hover:text-indigo-400 mx-auto mb-2 transition-colors" />
              <p className="text-sm text-gray-400">Kéo thả ảnh / video vào đây</p>
              <p className="text-xs text-gray-300 mt-0.5">JPG, PNG (10MB) · MP4 (500MB)</p>
              <button className="mt-2 text-xs text-indigo-500 hover:text-indigo-600 cursor-pointer font-medium">
                Hoặc click để chọn file
              </button>
            </div>

            {selected.some((c) => c.platform === "youtube") && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                <AlertTriangle size={13} />
                Kênh YouTube chỉ hỗ trợ video
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Controls panel ── */}
        <div className="w-72 flex-shrink-0 border-l border-gray-100 bg-white flex flex-col overflow-auto">
          <div className="flex-1 p-4 space-y-5">
            {/* ── Channel selector ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Kênh đăng</span>
                <Link href="/channels" className="text-xs text-indigo-500 hover:text-indigo-600 cursor-pointer">+ Thêm</Link>
              </div>

              {activeChannels.length > 4 && (
                <div className="relative mb-2">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={channelSearch}
                    onChange={(e) => setChannelSearch(e.target.value)}
                    placeholder="Tìm kênh..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                  />
                </div>
              )}

              <div className="space-y-1">
                {PLATFORMS.filter((p) => filtered.some((ch) => ch.platform === p.id)).map((p) => (
                  <div key={p.id}>
                    <div className="flex items-center gap-1.5 py-1 px-0.5">
                      <PlatformIcon platform={p.id} size={14} />
                      <span className="text-xs text-gray-400 font-medium">{p.name}</span>
                    </div>
                    {filtered.filter((ch) => ch.platform === p.id).map((ch) => {
                      const on = selectedIds.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          onClick={() => toggle(ch.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-all mb-0.5 ${
                            on ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${on ? "bg-indigo-600" : "border border-gray-300 bg-white"}`}>
                            {on && <Check size={9} className="text-white" />}
                          </div>
                          <span className="text-xs font-medium truncate">{ch.name}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {selected.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                  {selected.map((ch) => (
                    <span key={ch.id} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 pl-1.5 pr-1 py-0.5 rounded-full">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getPlatformColor(ch.platform) }} />
                      {ch.name}
                      <button onClick={() => toggle(ch.id)} className="ml-0.5 text-indigo-300 hover:text-indigo-500 cursor-pointer">
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Schedule ── */}
            <div>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Thời gian đăng</span>
              <div className="flex gap-1 mb-3">
                {(["draft", "schedule", "now"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                      mode === m ? "bg-indigo-600 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {m === "draft" ? "Nháp" : m === "schedule" ? "Hẹn giờ" : "Ngay"}
                  </button>
                ))}
              </div>

              {mode === "schedule" && (
                <div className="space-y-2">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                  />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-400"
                  />
                  <div className="flex gap-1">
                    {["08:00", "12:00", "20:00"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTime(t)}
                        className={`flex-1 py-1 text-xs rounded cursor-pointer font-medium transition-colors ${
                          time === t ? "bg-indigo-100 text-indigo-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === "now" && (
                <p className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                  Đăng trong vòng 30 giây
                </p>
              )}
              {mode === "draft" && (
                <p className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                  Lưu để soạn tiếp sau
                </p>
              )}
            </div>

            {/* ── Mini preview ── */}
            {selected.length > 0 && caption && (
              <div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">Preview</span>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-2.5 border-b border-gray-100 flex items-center gap-2">
                    <PlatformIcon platform={selected[0].platform} size={24} />
                    <div>
                      <div className="text-xs font-medium text-gray-800">{selected[0].name}</div>
                      {mode === "schedule" && <div className="text-xs text-gray-400">{date} {time}</div>}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-4 whitespace-pre-wrap">{caption}</p>
                    <div className="mt-2 bg-gray-100 rounded h-12 flex items-center justify-center">
                      <ImageIcon size={14} className="text-gray-300" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Submit ── */}
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => setSubmitted(true)}
              disabled={selectedIds.length === 0}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${
                mode === "now"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : mode === "draft"
                  ? "bg-gray-800 hover:bg-gray-900 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {mode === "now" ? <Zap size={15} /> : mode === "draft" ? <Save size={15} /> : <Clock size={15} />}
              {mode === "draft"
                ? "Lưu nháp"
                : mode === "now"
                ? "Đăng ngay"
                : `Lên lịch · ${selectedIds.length} kênh`}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
