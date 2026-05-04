"use client";

import AppLayout from "@/components/layout/AppLayout";
import { MOCK_USERS, MOCK_POSTS, getStatusColor, getStatusLabel, getPlatformName, formatDate } from "@/lib/mock-data";
import { ArrowLeft, Shield, User, Lock, Unlock, Mail, FileText, Radio } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function AdminUserDetailPage() {
  const params = useParams();
  const user = MOCK_USERS.find((u) => u.id === params.id) ?? MOCK_USERS[1];
  const [activeTab, setActiveTab] = useState<"overview" | "posts">("overview");
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const userPosts = MOCK_POSTS.slice(0, 3);

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl">
        {/* Back */}
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer mb-6 transition-colors">
          <ArrowLeft size={15} />
          Quay lại danh sách
        </Link>

        {/* Admin viewing banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2 mb-6 text-sm text-amber-800">
          <Shield size={15} className="text-amber-600" />
          <span>Admin đang xem tài khoản của <strong>{user.email}</strong> — chỉ đọc, không ảnh hưởng tới hoạt động user.</span>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* User info */}
          <div className="col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3 ${user.role === "admin" ? "bg-purple-600" : "bg-indigo-500"}`}>
                {user.name.charAt(0)}
              </div>
              <h2 className="font-bold text-gray-900">{user.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>

              <div className="flex justify-center mt-2">
                {user.role === "admin" ? (
                  <span className="flex items-center gap-1 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded-full font-medium border border-purple-200">
                    <Shield size={11} /> Admin
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
                    <User size={11} /> User
                  </span>
                )}
              </div>

              {user.status === "inactive" && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg font-medium">
                  Tài khoản bị khoá
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-400">Đăng ký</dt>
                  <dd className="font-medium text-gray-800 mt-0.5">{user.registeredAt}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Đăng nhập cuối</dt>
                  <dd className="font-medium text-gray-800 mt-0.5">
                    {new Date(user.lastLogin).toLocaleString("vi-VN")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400">Tổng bài đăng</dt>
                  <dd className="font-medium text-gray-800 mt-0.5">{user.postsCount} bài</dd>
                </div>
              </dl>
            </div>

            {/* Admin actions */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Hành động Admin</p>

              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors text-left">
                <Mail size={15} className="text-gray-500" />
                Gửi link reset password
              </button>

              {user.role === "user" && (
                <button
                  onClick={() => setShowPromoteModal(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-purple-700 hover:bg-purple-50 rounded-xl cursor-pointer transition-colors text-left"
                >
                  <Shield size={15} className="text-purple-600" />
                  Gán role Admin
                </button>
              )}

              {user.id !== "u1" && (
                <button className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-xl cursor-pointer transition-colors text-left ${
                  user.status === "active"
                    ? "text-red-600 hover:bg-red-50"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}>
                  {user.status === "active" ? <Lock size={15} /> : <Unlock size={15} />}
                  {user.status === "active" ? "Khoá tài khoản" : "Mở khoá tài khoản"}
                </button>
              )}

              {user.id === "u1" && (
                <p className="text-xs text-gray-400 italic px-3">Không thể khoá tài khoản admin hiện tại</p>
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 mb-4">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${activeTab === "overview" ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}
              >
                <Radio size={14} />
                Kênh kết nối
              </button>
              <button
                onClick={() => setActiveTab("posts")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${activeTab === "posts" ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-300"}`}
              >
                <FileText size={14} />
                Bài đăng
              </button>
            </div>

            {activeTab === "overview" && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Kênh đã kết nối</h3>
                {[
                  { name: "Facebook Page", status: "active", posts: 24, connected: "01/03/2026" },
                  { name: "Instagram", status: "expired", posts: 18, connected: "01/03/2026" },
                  { name: "LinkedIn", status: "active", posts: 8, connected: "15/03/2026" },
                ].map((ch, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{ch.name}</p>
                      <p className="text-xs text-gray-400">Kết nối: {ch.connected} · {ch.posts} bài</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ch.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {ch.status === "active" ? "Active" : "Hết hạn"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "posts" && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg text-xs">
                    Chế độ đọc — Admin không thể chỉnh sửa bài
                  </p>
                </div>
                <div className="divide-y divide-gray-50">
                  {userPosts.map((post) => (
                    <div key={post.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 text-sm truncate">{post.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getStatusColor(post.status)}`}>
                            {getStatusLabel(post.status)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-2">
                          <span>{post.platforms.map(getPlatformName).join(", ")}</span>
                          <span>·</span>
                          <span>{post.scheduledAt ? formatDate(post.scheduledAt) : "—"}</span>
                        </div>
                        {post.status === "failed" && post.failReason && (
                          <p className="text-xs text-red-500 mt-1">{post.failReason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Promote modal */}
        {showPromoteModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={() => setShowPromoteModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield size={24} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-900 text-center mb-2">Gán role Admin?</h3>
              <p className="text-sm text-gray-500 text-center mb-5">
                User <strong>{user.name}</strong> sẽ có toàn quyền admin. Xác nhận?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowPromoteModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
                  Hủy
                </button>
                <button onClick={() => setShowPromoteModal(false)} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium cursor-pointer transition-colors">
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
