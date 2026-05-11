"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Copy,
  Filter,
  Lock,
  Search,
  Shield,
  Unlock,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type AdminUserRow = {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  status: "active" | "inactive";
  lastLoginAt: string | null;
  createdAt: string;
  _count: { posts: number; channels: number };
};

type UsersResponse = {
  data: {
    users: AdminUserRow[];
    total: number;
    page: number;
    limit: number;
  } | null;
  error: { code: string; message: string } | null;
};

const PAGE_SIZE = 20;

function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

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

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | "user" | "admin">("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  const debouncedSearch = useDebounced(search, 300);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, role, status]);

  const params = new URLSearchParams();
  if (debouncedSearch) params.set("search", debouncedSearch);
  if (role !== "all") params.set("role", role);
  if (status !== "all") params.set("status", status);
  params.set("page", String(page));
  params.set("limit", String(PAGE_SIZE));

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users", debouncedSearch, role, status, page],
    queryFn: async (): Promise<UsersResponse["data"]> => {
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const json = (await res.json()) as UsersResponse;
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Không tải được danh sách user");
      }
      return json.data;
    },
    placeholderData: (prev) => prev,
  });

  const toggleStatus = useMutation({
    mutationFn: async (vars: { id: string; nextStatus: "active" | "inactive" }) => {
      const res = await fetch(`/api/admin/users/${vars.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: vars.nextStatus }),
      });
      const json = (await res.json()) as {
        data: unknown;
        error: { code: string; message: string } | null;
      };
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? "Không cập nhật được trạng thái");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => {
      alert(e.message);
    },
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const registerUrl =
    (typeof window !== "undefined" ? window.location.origin : "") + "/register";

  const handleCopyRegisterLink = async () => {
    try {
      await navigator.clipboard.writeText(registerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — clipboard may be blocked in some browsers
    }
  };

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Người dùng</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total} tài khoản đã đăng ký
          </p>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <UserIcon size={16} className="text-indigo-600 flex-shrink-0" />
          <p className="text-sm text-indigo-800 truncate">
            Chia sẻ link đăng ký:{" "}
            <span className="font-mono font-medium">{registerUrl}</span>
          </p>
        </div>
        <button
          onClick={handleCopyRegisterLink}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer px-3 py-1.5 bg-white rounded-lg border border-indigo-200 flex-shrink-0"
        >
          <Copy size={12} /> {copied ? "Đã copy" : "Copy link"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Tìm theo email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer bg-white"
          >
            <option value="all">Tất cả role</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer bg-white"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Người dùng
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Role
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Trạng thái
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Đăng ký
              </th>
              <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Bài đăng
              </th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Đăng nhập cuối
              </th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const name = u.displayName?.trim() || u.email.split("@")[0];
              const initial = name.charAt(0).toUpperCase();
              const nextStatus =
                u.status === "active" ? "inactive" : "active";
              return (
                <tr
                  key={u.id}
                  className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          u.role === "admin" ? "bg-purple-600" : "bg-indigo-500"
                        }`}
                      >
                        {initial}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {name}
                        </div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {u.role === "admin" ? (
                      <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium w-fit">
                        <Shield size={11} /> Admin
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full font-medium w-fit">
                        <UserIcon size={11} /> User
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        u.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {u.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    {formatDateShort(u.createdAt)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-gray-700">
                    {u._count.posts}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {formatDateVN(u.lastLoginAt)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        aria-label="Xem chi tiết"
                      >
                        <ArrowRight size={14} />
                      </Link>
                      <button
                        type="button"
                        disabled={toggleStatus.isPending}
                        onClick={() =>
                          toggleStatus.mutate({ id: u.id, nextStatus })
                        }
                        className={`p-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          u.status === "active"
                            ? "text-gray-400 hover:text-red-500 hover:bg-red-50"
                            : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        aria-label={
                          u.status === "active"
                            ? "Khoá tài khoản"
                            : "Mở khoá tài khoản"
                        }
                        title={
                          u.status === "active"
                            ? "Khoá tài khoản"
                            : "Mở khoá tài khoản"
                        }
                      >
                        {u.status === "active" ? (
                          <Lock size={14} />
                        ) : (
                          <Unlock size={14} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {isLoading && (
          <div className="py-16 text-center text-sm text-gray-400">
            Đang tải...
          </div>
        )}
        {isError && !isLoading && (
          <div className="py-16 text-center text-sm text-red-500">
            {(error as Error)?.message ?? "Không tải được dữ liệu"}
          </div>
        )}
        {!isLoading && !isError && users.length === 0 && (
          <div className="py-16 text-center text-sm text-gray-400">
            Không tìm thấy người dùng nào
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <div>
            Trang {page}/{totalPages} · Tổng {total} user
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Trước
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
