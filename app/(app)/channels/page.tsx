"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Search, Filter, CheckCircle, XCircle, Wifi, Trash2, RefreshCw,
  Clock, AlertCircle, Power, Loader2,
} from "lucide-react";
import PlatformIcon, { PLATFORMS, PLATFORM_NAMES } from "@/components/PlatformIcon";

type Channel = {
  id: string;
  name: string;
  platform: string;
  connectionType: string;
  status: string;
  lastTestedAt: string | null;
  createdAt: string;
  _count: { postChannels: number };
};

function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
        <CheckCircle size={10} />Active
      </span>
    );
  if (status === "expired")
    return (
      <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium border border-red-200">
        <XCircle size={10} />Hết hạn
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
      <Power size={10} />Tạm tắt
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ChannelsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [testingId, setTestingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channels");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/channels/${id}/test`, { method: "POST" });
      return res.json();
    },
    onSettled: () => {
      setTestingId(null);
      qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/channels/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSettled: () => {
      setConfirmDeleteId(null);
      qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/channels/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });

  const filtered = channels.filter((ch) => {
    const matchSearch = !search || ch.name.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === "all" || ch.platform === platformFilter;
    const matchStatus = statusFilter === "all" || ch.status === statusFilter;
    return matchSearch && matchPlatform && matchStatus;
  });

  const expiredChannels = channels.filter((c) => c.status === "expired");

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Đang tải...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kênh kết nối</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {channels.length} kênh · Chọn kênh khi soạn bài
          </p>
        </div>
        <Link
          href="/channels/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Thêm Kênh
        </Link>
      </div>

      {expiredChannels.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {expiredChannels.length} kênh hết hạn cần kết nối lại
            </p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {expiredChannels.map((ch) => (
                <span
                  key={ch.id}
                  className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  <RefreshCw size={10} /> {ch.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-indigo-800">
          <strong>Kênh</strong> = 1 tài khoản social cụ thể, có tên riêng bạn đặt. Bạn có thể tạo
          nhiều Kênh cùng nền tảng — vd: <em>&quot;Shop Cưng&quot;</em> và <em>&quot;Giải Trí Thể Thao&quot;</em> đều
          là Kênh Facebook riêng biệt.
        </p>
      </div>

      {channels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus size={28} className="text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Bạn chưa có Kênh nào</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
            Tạo Kênh đầu tiên để bắt đầu lên lịch và đăng bài tự động
          </p>
          <div className="flex flex-wrap gap-2 justify-center mb-6 text-xs text-gray-400">
            <span>Gợi ý tên:</span>
            {["Facebook chính", "Shop Cưng", "IG cá nhân"].map((n) => (
              <span key={n} className="bg-gray-100 px-2 py-0.5 rounded-md">
                {n}
              </span>
            ))}
          </div>
          <Link
            href="/channels/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Thêm Kênh đầu tiên
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên kênh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400" />
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Active</option>
                <option value="expired">Hết hạn</option>
                <option value="inactive">Tạm tắt</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {filtered.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group"
                >
                  <PlatformIcon platform={ch.platform} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{ch.name}</span>
                      <StatusBadge status={ch.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                      <span>{PLATFORM_NAMES[ch.platform] ?? ch.platform}</span>
                      <span>·</span>
                      <span>
                        {ch.connectionType === "webhook"
                          ? "Make.com Webhook"
                          : ch.connectionType === "oauth"
                          ? "OAuth"
                          : "API Key"}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock size={10} /> Tạo: {formatDate(ch.createdAt)}
                      </span>
                      <span>·</span>
                      <span>{ch._count.postChannels} bài đã đăng</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setTestingId(ch.id);
                        testMutation.mutate(ch.id);
                      }}
                      disabled={testingId === ch.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title="Test kết nối"
                    >
                      {testingId === ch.id ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Wifi size={13} />
                      )}
                      Test
                    </button>

                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          id: ch.id,
                          status: ch.status === "active" ? "inactive" : "active",
                        })
                      }
                      className={`p-1.5 rounded-lg transition-colors ${
                        ch.status === "active"
                          ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                          : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                      }`}
                      title={ch.status === "active" ? "Tạm tắt kênh" : "Kích hoạt lại"}
                    >
                      <Power size={14} />
                    </button>

                    <button
                      onClick={() => setConfirmDeleteId(ch.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa kênh"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {confirmDeleteId && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6"
          onClick={() => setConfirmDeleteId(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận xóa Kênh?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Các bài đăng đang lên lịch của Kênh này sẽ bị hủy. Hành động không thể hoàn tác.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDeleteId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
