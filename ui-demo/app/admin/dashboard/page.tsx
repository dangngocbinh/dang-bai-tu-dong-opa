"use client";

import AppLayout from "@/components/layout/AppLayout";
import { ADMIN_STATS } from "@/lib/mock-data";
import { Users, CheckCircle, XCircle, TrendingUp, RefreshCw, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AdminDashboardPage() {
  const [lastRefresh] = useState("2026-04-17 08:30");

  const overallSuccess = Math.round(
    (ADMIN_STATS.totalPostsToday - ADMIN_STATS.failedPostsToday) / ADMIN_STATS.totalPostsToday * 100
  );

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Tổng quan hệ thống OPA · Cập nhật lúc {lastRefresh}</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {/* Overview stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Tổng users",
              value: ADMIN_STATS.totalUsers,
              sub: `+${ADMIN_STATS.newUsersLast7Days} trong 7 ngày`,
              icon: Users,
              color: "bg-indigo-50 text-indigo-600",
            },
            {
              label: "Bài đăng hôm nay",
              value: ADMIN_STATS.totalPostsToday,
              sub: "Tổng bài đã xử lý",
              icon: TrendingUp,
              color: "bg-blue-50 text-blue-600",
            },
            {
              label: "Thành công hôm nay",
              value: ADMIN_STATS.successPostsToday,
              sub: `${overallSuccess}% tỉ lệ thành công`,
              icon: CheckCircle,
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "Thất bại hôm nay",
              value: ADMIN_STATS.failedPostsToday,
              sub: "Cần xem xét",
              icon: XCircle,
              color: "bg-red-50 text-red-600",
            },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon size={17} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs font-medium text-gray-700 mt-0.5">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Platform success rate */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Tỉ lệ thành công theo nền tảng</h2>
              <p className="text-xs text-gray-400 mt-0.5">7 ngày qua</p>
            </div>
            <div className="p-6 space-y-4">
              {ADMIN_STATS.successRateByPlatform.map((p) => (
                <div key={p.platform}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{p.platform}</span>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-emerald-600">{p.success} ✓</span>
                      <span className="text-red-500">{p.failed} ✗</span>
                      <span
                        className={`font-semibold cursor-pointer hover:underline ${p.rate < 90 ? "text-red-600" : "text-gray-700"}`}
                        onClick={() => {}}
                      >
                        {p.rate}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${p.rate < 90 ? "bg-red-400" : "bg-emerald-500"}`}
                      style={{ width: `${p.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent errors */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Lỗi gần đây</h2>
                <p className="text-xs text-gray-400 mt-0.5">Các bài đăng thất bại mới nhất</p>
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {ADMIN_STATS.recentErrors.map((err) => (
                <div key={err.id} className="flex items-start gap-3 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors">
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{err.user}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{err.platform}</span>
                    </div>
                    <p className="text-xs text-red-500 mt-0.5">{err.reason}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(err.time).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7-day stats table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Thống kê 7 ngày</h2>
            <Link href="/admin/users" className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1">
              Xem users <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500">Ngày</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Bài đăng</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Thành công</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Thất bại</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500">Tỉ lệ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: "17/04", total: 28, success: 25, failed: 3 },
                  { date: "16/04", total: 31, success: 29, failed: 2 },
                  { date: "15/04", total: 24, success: 24, failed: 0 },
                  { date: "14/04", total: 35, success: 32, failed: 3 },
                  { date: "13/04", total: 18, success: 17, failed: 1 },
                  { date: "12/04", total: 27, success: 25, failed: 2 },
                  { date: "11/04", total: 24, success: 22, failed: 2 },
                ].map((row) => {
                  const rate = Math.round((row.success / row.total) * 100);
                  return (
                    <tr key={row.date} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-700">{row.date}</td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">{row.total}</td>
                      <td className="px-4 py-3 text-right text-sm text-emerald-600 font-medium">{row.success}</td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className={`font-medium ${row.failed > 0 ? "text-red-500" : "text-gray-400"}`}>
                          {row.failed}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-sm font-semibold ${rate < 90 ? "text-red-600" : "text-emerald-600"}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
