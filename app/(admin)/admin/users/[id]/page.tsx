"use client";

import PlatformIcon, { PLATFORM_NAMES } from "@/components/PlatformIcon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Lock,
  Radio,
  Shield,
  Unlock,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

type ChannelRow = {
  id: string;
  name: string;
  platform: string;
  status: "active" | "expired" | "inactive";
  connectionType: "webhook" | "api" | "oauth";
  lastTestedAt: string | null;
  createdAt: string;
  _count: { postChannels: number };
};

type AdminUserDetail = {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  status: "active" | "inactive";
  timezone: string;
  telegramChatId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { posts: number; channels: number };
  channels: ChannelRow[];
};

type DetailResponse = {
  data: AdminUserDetail | null;
  error: { code: string; message: string } | null;
};

function formatDateVN(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const CHANNEL_STATUS_STYLE: Record<ChannelRow["status"], string> = {
  active: "bg-emerald-100 text-emerald-700",
  expired: "bg-red-100 text-red-700",
  inactive: "bg-gray-100 text-gray-500",
};

const CHANNEL_STATUS_LABEL: Record<ChannelRow["status"], string> = {
  active: "Active",
  expired: "Hết hạn",
  inactive: "Inactive",
};

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { data: session } = useSession();
  const isSelf = session?.user?.id === id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-user", id],
    queryFn: async (): Promise<AdminUserDetail> => {
      const res = await fetch(`/api/admin/users/${id}`);
      const json = (await res.json()) as DetailResponse;
      if (!res.ok || json.error || !json.data) {
        throw new Error(json.error?.message ?? "Không tải được thông tin user");
      }
      return json.data;
    },
  });

  const toggleStatus = useMutation({
    mutationFn: async (nextStatus: "active" | "inactive") => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = (await res.json()) as DetailResponse;
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Không cập nhật được trạng thái");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-user", id] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => alert(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-5xl">
        <div className="text-sm text-gray-400">Đang tải...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-8 max-w-5xl">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Quay lại danh sách
        </Link>
        <div className="text-sm text-red-500">
          {(error as Error)?.message ?? "User không tồn tại"}
        </div>
      </div>
    );
  }

  const user = data;
  const name = user.displayName?.trim() || user.email.split("@")[0];
  const initial = name.charAt(0).toUpperCase();
  const nextStatus = user.status === "active" ? "inactive" : "active";

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer mb-6 transition-colors"
      >
        <ArrowLeft size={15} />
        Quay lại danh sách
      </Link>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 mb-6 text-sm text-amber-800">
        <Shield size={15} className="text-amber-600" />
        <span>
          Admin đang xem tài khoản của <strong>{user.email}</strong> — chế độ
          đọc, không ảnh hưởng tới hoạt động user.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 ${
                user.role === "admin" ? "bg-purple-600" : "bg-indigo-500"
              }`}
            >
              {initial}
            </div>
            <h2 className="font-bold text-gray-900 break-words">{name}</h2>
            <p className="text-sm text-gray-500 mt-0.5 break-all">
              {user.email}
            </p>

            <div className="flex justify-center mt-2">
              {user.role === "admin" ? (
                <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-full font-medium border border-purple-200">
                  <Shield size={11} /> Admin
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
                  <UserIcon size={11} /> User
                </span>
              )}
            </div>

            {user.status === "inactive" && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg font-medium">
                Tài khoản bị khoá
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Đăng ký</dt>
                <dd className="font-medium text-gray-800 mt-0.5">
                  {formatDateShort(user.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Đăng nhập cuối</dt>
                <dd className="font-medium text-gray-800 mt-0.5">
                  {formatDateVN(user.lastLoginAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Tổng bài đăng</dt>
                <dd className="font-medium text-gray-800 mt-0.5">
                  {user._count.posts} bài
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Kênh đã kết nối</dt>
                <dd className="font-medium text-gray-800 mt-0.5">
                  {user._count.channels} kênh
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Hành động Admin
            </p>

            {isSelf ? (
              <p className="text-xs text-gray-400 italic px-3">
                Không thể khoá tài khoản admin đang đăng nhập
              </p>
            ) : (
              <button
                type="button"
                disabled={toggleStatus.isPending}
                onClick={() => toggleStatus.mutate(nextStatus)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl cursor-pointer transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                  user.status === "active"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                {user.status === "active" ? (
                  <Lock size={15} />
                ) : (
                  <Unlock size={15} />
                )}
                {user.status === "active"
                  ? "Khoá tài khoản"
                  : "Mở khoá tài khoản"}
              </button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Radio size={16} className="text-indigo-500" /> Kênh đã kết nối
            </h3>

            {user.channels.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                User này chưa kết nối kênh nào.
              </p>
            ) : (
              <div className="divide-y divide-gray-50">
                {user.channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PlatformIcon platform={ch.platform} size={32} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {ch.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {PLATFORM_NAMES[ch.platform] ?? ch.platform} ·{" "}
                          {ch._count.postChannels} bài · kết nối{" "}
                          {formatDateShort(ch.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-3 ${
                        CHANNEL_STATUS_STYLE[ch.status]
                      }`}
                    >
                      {CHANNEL_STATUS_LABEL[ch.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
