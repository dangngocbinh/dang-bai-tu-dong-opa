"use client";

import AppLayout from "@/components/layout/AppLayout";
import { MOCK_POSTS, getStatusColor, getStatusLabel, getPostChannels, getPlatformColor } from "@/lib/mock-data";
import {
  ChevronLeft, ChevronRight, Plus, Search, X, Save, Zap, Trash2,
  GripVertical, PanelRightClose, PanelRight, Clock,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const DAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

type AnyPost = {
  id: string; title: string; caption: string; status: string;
  channelIds: string[]; scheduledAt?: string; images?: string[];
  failReason?: string; createdAt?: string;
};

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

function PlatformDots({ channelIds }: { channelIds: string[] }) {
  const channels = getPostChannels(channelIds);
  return (
    <div className="flex gap-0.5 flex-shrink-0">
      {channels.slice(0, 3).map((ch) => (
        <div key={ch.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: getPlatformColor(ch.platform) }} />
      ))}
    </div>
  );
}

export default function CalendarPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(3);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draftSearch, setDraftSearch] = useState("");
  const [posts, setPosts] = useState<AnyPost[]>(() => MOCK_POSTS.map((p) => ({ ...p })));

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingFrom, setDraggingFrom] = useState<"sidebar" | "calendar" | null>(null);
  const [dragOverCell, setDragOverCell] = useState<number | null>(null);
  const [dragOverSidebar, setDragOverSidebar] = useState(false);

  // Modal states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [timePickerState, setTimePickerState] = useState<{ postId: string; day: number } | null>(null);
  const [rescheduleState, setRescheduleState] = useState<{ postId: string; toDay: number; oldTime: string } | null>(null);
  const [unscheduleConfirm, setUnscheduleConfirm] = useState<string | null>(null);
  const [selectedHour, setSelectedHour] = useState(20);
  const [selectedMin, setSelectedMin] = useState(0);

  const MOCK_TODAY = { y: 2026, m: 3, d: 17 };
  const cells = getMonthDays(year, month);

  const drafts = posts
    .filter((p) => p.status === "draft" && !p.scheduledAt)
    .filter((p) => !draftSearch || p.title.toLowerCase().includes(draftSearch.toLowerCase()));

  function getPostsForDay(day: number) {
    return posts.filter((p) => {
      if (!p.scheduledAt) return false;
      const d = new Date(p.scheduledAt);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  function isPastDay(day: number) {
    return new Date(year, month, day) < new Date(MOCK_TODAY.y, MOCK_TODAY.m, MOCK_TODAY.d);
  }

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1);
  }

  // --- Drag handlers ---
  function onDragStart(postId: string, from: "sidebar" | "calendar") {
    setDraggingId(postId);
    setDraggingFrom(from);
  }
  function onDragEnd() {
    setDraggingId(null);
    setDraggingFrom(null);
    setDragOverCell(null);
    setDragOverSidebar(false);
  }

  function onDropDay(day: number) {
    if (!draggingId || isPastDay(day)) { onDragEnd(); return; }
    const post = posts.find((p) => p.id === draggingId);
    if (!post) { onDragEnd(); return; }

    if (draggingFrom === "sidebar") {
      setTimePickerState({ postId: draggingId, day });
      setSelectedHour(20); setSelectedMin(0);
    } else if (draggingFrom === "calendar" && post.scheduledAt) {
      const old = new Date(post.scheduledAt);
      if (old.getDate() === day && old.getMonth() === month && old.getFullYear() === year) {
        onDragEnd(); return;
      }
      setRescheduleState({ postId: draggingId, toDay: day, oldTime: post.scheduledAt });
    }
    onDragEnd();
  }

  function onDropSidebar() {
    if (!draggingId || draggingFrom !== "calendar") { onDragEnd(); return; }
    setUnscheduleConfirm(draggingId);
    onDragEnd();
  }

  // --- Confirm actions ---
  function confirmSchedule() {
    if (!timePickerState) return;
    const { postId, day } = timePickerState;
    const dt = `${year}-${pad(month + 1)}-${pad(day)}T${pad(selectedHour)}:${pad(selectedMin)}:00`;
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, scheduledAt: dt, status: "scheduled" } : p));
    setTimePickerState(null);
  }

  function confirmReschedule(keepTime: boolean) {
    if (!rescheduleState) return;
    const { postId, toDay, oldTime } = rescheduleState;
    let newDt: string;
    if (keepTime) {
      const old = new Date(oldTime);
      newDt = `${year}-${pad(month + 1)}-${pad(toDay)}T${pad(old.getHours())}:${pad(old.getMinutes())}:00`;
    } else {
      newDt = `${year}-${pad(month + 1)}-${pad(toDay)}T20:00:00`;
    }
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, scheduledAt: newDt } : p));
    setRescheduleState(null);
  }

  function confirmUnschedule() {
    if (!unscheduleConfirm) return;
    setPosts((prev) => prev.map((p) => p.id === unscheduleConfirm ? { ...p, scheduledAt: undefined, status: "draft" } : p));
    setUnscheduleConfirm(null);
  }

  const editingPost = editingPostId ? posts.find((p) => p.id === editingPostId) ?? null : null;

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* ── LEFT: Calendar ── */}
        <div className="flex-1 min-w-0 flex flex-col p-6 overflow-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lịch đăng bài</h1>
              <p className="text-gray-500 text-sm mt-0.5">Kéo bài từ sidebar phải vào lịch để hẹn giờ</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/posts/new" className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition-colors">
                <Plus size={15} />Thêm bài
              </Link>
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors"
                title={sidebarOpen ? "Ẩn sidebar draft" : "Hiện sidebar draft"}
              >
                {sidebarOpen ? <PanelRightClose size={18} /> : <PanelRight size={18} />}
              </button>
            </div>
          </div>

          {/* Calendar card */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex-1">
            {/* Month nav */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <h2 className="font-semibold text-gray-900 text-sm">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-gray-400">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const isToday = day === MOCK_TODAY.d && month === MOCK_TODAY.m && year === MOCK_TODAY.y;
                const past = day ? isPastDay(day) : false;
                const dayPosts = day ? getPostsForDay(day) : [];
                const isDragOver = dragOverCell === day && day !== null && !past;

                return (
                  <div
                    key={i}
                    className={`min-h-24 border-b border-r border-gray-50 p-1.5 transition-colors ${
                      !day ? "bg-gray-50/40" :
                      isDragOver ? "bg-indigo-50 outline outline-2 outline-indigo-400 outline-offset-[-2px]" :
                      past ? "bg-gray-50/20" : "hover:bg-slate-50/50"
                    }`}
                    onDragOver={(e) => { if (day && !past) { e.preventDefault(); setDragOverCell(day); } }}
                    onDragLeave={() => setDragOverCell(null)}
                    onDrop={(e) => { e.preventDefault(); if (day) onDropDay(day); }}
                  >
                    {day && (
                      <>
                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                          isToday ? "bg-indigo-600 text-white" : past ? "text-gray-400" : "text-gray-600"
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-0.5">
                          {dayPosts.slice(0, 3).map((post) => (
                            <div
                              key={post.id}
                              draggable={post.status === "scheduled"}
                              onDragStart={(e) => { e.stopPropagation(); onDragStart(post.id, "calendar"); }}
                              onDragEnd={onDragEnd}
                              onClick={() => setEditingPostId(post.id)}
                              className={`text-xs px-1.5 py-0.5 rounded font-medium truncate flex items-center gap-1 transition-all ${getStatusColor(post.status)} ${
                                post.status === "scheduled" ? "cursor-grab active:cursor-grabbing hover:opacity-80" : "cursor-pointer hover:opacity-70"
                              }`}
                            >
                              <PlatformDots channelIds={post.channelIds} />
                              <span className="truncate min-w-0">{post.title}</span>
                            </div>
                          ))}
                          {dayPosts.length > 3 && (
                            <div className="text-xs text-gray-400 px-1.5">+{dayPosts.length - 3} bài</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-xs text-gray-400">Trạng thái:</span>
            {[
              { label: "Đã lên lịch", cls: "bg-blue-100 text-blue-700" },
              { label: "Đã đăng", cls: "bg-emerald-100 text-emerald-700" },
              { label: "Lỗi", cls: "bg-red-100 text-red-700" },
            ].map((l) => (
              <span key={l.label} className={`text-xs px-2 py-0.5 rounded font-medium ${l.cls}`}>{l.label}</span>
            ))}
            <span className="text-xs text-gray-300">·</span>
            <span className="text-xs text-gray-400">Kéo bài draft từ sidebar phải → ô ngày để lên lịch</span>
          </div>
        </div>

        {/* ── RIGHT: Draft sidebar ── */}
        {sidebarOpen && (
          <div
            className={`w-64 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col transition-colors ${
              dragOverSidebar && draggingFrom === "calendar" ? "bg-indigo-50 border-l-indigo-400" : ""
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOverSidebar(true); }}
            onDragLeave={() => setDragOverSidebar(false)}
            onDrop={(e) => { e.preventDefault(); onDropSidebar(); }}
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Bài chưa lên lịch</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{drafts.length}</span>
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm bài..."
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Draft list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {drafts.length === 0 && !dragOverSidebar && (
                <div className="text-center py-10">
                  <p className="text-xs text-gray-400">Không có bài draft</p>
                </div>
              )}

              {dragOverSidebar && draggingFrom === "calendar" && (
                <div className="border-2 border-dashed border-indigo-400 rounded-xl p-4 text-center mb-2">
                  <p className="text-xs text-indigo-500 font-medium">Thả vào đây để huỷ lịch</p>
                </div>
              )}

              {drafts.map((post) => (
                <div
                  key={post.id}
                  draggable
                  onDragStart={() => onDragStart(post.id, "sidebar")}
                  onDragEnd={onDragEnd}
                  className={`p-2.5 rounded-xl border bg-gray-50 cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:bg-indigo-50/60 transition-all group ${
                    draggingId === post.id ? "opacity-40 border-indigo-300" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical size={12} className="text-gray-300 group-hover:text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-700 truncate">{post.title}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{post.caption}</p>
                      <div className="mt-1.5">
                        <PlatformDots channelIds={post.channelIds} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar footer */}
            <div className="p-3 border-t border-gray-100">
              <Link
                href="/posts/new"
                className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
              >
                <Plus size={13} />Soạn bài mới
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Time picker — drag from sidebar */}
      {timePickerState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 w-72 shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Chọn giờ đăng</h3>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Ngày {timePickerState.day}/{month + 1}/{year}
            </p>
            <div className="flex items-center gap-2 mb-5">
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{pad(i)} giờ</option>
                ))}
              </select>
              <span className="text-gray-400 text-lg">:</span>
              <select
                value={selectedMin}
                onChange={(e) => setSelectedMin(Number(e.target.value))}
                className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{pad(m)} phút</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTimePickerState(null)} className="flex-1 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                Huỷ
              </button>
              <button onClick={confirmSchedule} className="flex-1 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer font-medium transition-colors">
                Lên lịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule — drag between calendar days */}
      {rescheduleState && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 w-72 shadow-2xl">
            <h3 className="font-semibold text-gray-900 mb-1">Đổi ngày đăng</h3>
            <p className="text-xs text-gray-500 mb-4">
              Dời sang ngày {rescheduleState.toDay}/{month + 1}/{year}
            </p>
            <div className="space-y-2 mb-4">
              <button
                onClick={() => confirmReschedule(true)}
                className="w-full py-3 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer text-left px-4 transition-colors"
              >
                <span className="font-medium text-gray-800">Giữ giờ cũ</span>
                <span className="text-xs text-gray-400 block mt-0.5">
                  {new Date(rescheduleState.oldTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </button>
              <button
                onClick={() => confirmReschedule(false)}
                className="w-full py-3 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer text-left px-4 transition-colors"
              >
                <span className="font-medium text-gray-800">Đổi giờ mới</span>
                <span className="text-xs text-gray-400 block mt-0.5">Mặc định: 20:00</span>
              </button>
            </div>
            <button onClick={() => setRescheduleState(null)} className="w-full py-2 text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
              Huỷ
            </button>
          </div>
        </div>
      )}

      {/* Unschedule confirm — drag back to sidebar */}
      {unscheduleConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 w-72 shadow-2xl">
            <h3 className="font-semibold text-gray-900 mb-2">Huỷ lịch bài đăng?</h3>
            <p className="text-sm text-gray-500 mb-4">
              Bài sẽ trở về trạng thái <span className="font-medium text-gray-700">draft</span> và xuất hiện lại trong sidebar.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setUnscheduleConfirm(null)} className="flex-1 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                Giữ lịch
              </button>
              <button onClick={confirmUnschedule} className="flex-1 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 cursor-pointer font-medium transition-colors">
                Huỷ lịch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit post popup — click on calendar card */}
      {editingPost && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingPostId(null); }}
          onKeyDown={(e) => { if (e.key === "Escape") setEditingPostId(null); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl mx-4">
            {/* Modal header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">{editingPost.title}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(editingPost.status)}`}>
                    {getStatusLabel(editingPost.status)}
                  </span>
                  {editingPost.scheduledAt && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(editingPost.scheduledAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setEditingPostId(null)} className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors flex-shrink-0">
                <X size={15} className="text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-5">
              <div className="bg-slate-50 rounded-xl p-3 mb-4">
                <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{editingPost.caption}</p>
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Kênh đăng</p>
              <div className="flex flex-wrap gap-1.5">
                {getPostChannels(editingPost.channelIds).map((ch) => (
                  <span key={ch.id} className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPlatformColor(ch.platform) }} />
                    {ch.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-2 p-4 border-t border-gray-100">
              {editingPost.status === "published" || editingPost.status === "failed" ? (
                <>
                  <span className="text-xs text-gray-400 italic">Chỉ xem — bài đã được xử lý</span>
                  <div className="flex-1" />
                  <Link href={`/posts/${editingPost.id}`} className="text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer font-medium">
                    Xem chi tiết →
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setPosts((prev) => prev.map((p) => p.id === editingPost.id ? { ...p, status: "draft", scheduledAt: undefined } : p));
                      setEditingPostId(null);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                    title="Xóa bài"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => {
                      setPosts((prev) => prev.map((p) => p.id === editingPost.id ? { ...p, status: "published" } : p));
                      setEditingPostId(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg cursor-pointer font-medium transition-colors"
                  >
                    <Zap size={13} />Đăng ngay
                  </button>
                  <div className="flex-1" />
                  <Link href={`/posts/${editingPost.id}`} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer mr-1">
                    Mở chi tiết
                  </Link>
                  <button
                    onClick={() => setEditingPostId(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg cursor-pointer font-medium transition-colors"
                  >
                    <Save size={13} />Lưu
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
