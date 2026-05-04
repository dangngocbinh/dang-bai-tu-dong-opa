"use client";

import AppLayout from "@/components/layout/AppLayout";
import { MOCK_USERS } from "@/lib/mock-data";
import { Search, Filter, User, Shield, Lock, Unlock, ArrowRight, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = MOCK_USERS.filter((u) => {
    const matchSearch = !search || u.email.includes(search) || u.name.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const registerUrl = "opa.mecode.pro/register";

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Người dùng</h1>
            <p className="text-gray-500 text-sm mt-0.5">{MOCK_USERS.length} tài khoản đã đăng ký</p>
          </div>
        </div>

        {/* Share banner */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={16} className="text-indigo-600" />
            <p className="text-sm text-indigo-800">
              Chia sẻ link đăng ký: <span className="font-mono font-medium">{registerUrl}</span>
            </p>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer px-3 py-1.5 bg-white rounded-lg border border-indigo-200">
            <Copy size={12} /> Copy link
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo email hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer bg-white"
            >
              <option value="all">Tất cả role</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer bg-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Người dùng</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trạng thái</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Đăng ký</th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bài đăng</th>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Đăng nhập cuối</th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/60 cursor-pointer transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${user.role === "admin" ? "bg-purple-600" : "bg-indigo-500"}`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {user.role === "admin" ? (
                      <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full font-medium w-fit">
                        <Shield size={11} /> Admin
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full font-medium w-fit">
                        <User size={11} /> User
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {user.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">{user.registeredAt}</td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-gray-700">{user.postsCount}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(user.lastLogin).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ArrowRight size={14} />
                      </Link>
                      <button className={`p-1.5 rounded-lg cursor-pointer transition-colors ${user.status === "active" ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"}`}>
                        {user.status === "active" ? <Lock size={14} /> : <Unlock size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-gray-400 text-sm">Không tìm thấy người dùng nào</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
