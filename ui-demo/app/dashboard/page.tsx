"use client";

import AppLayout from "@/components/layout/AppLayout";
import { MOCK_POSTS, getStatusColor, getStatusLabel, getPostChannels, formatDate } from "@/lib/mock-data";
import { Plus, AlertCircle, CheckCircle, Clock, FileText, TrendingUp, Radio, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const stats = [
  { label: "Bài đã đăng hôm nay", value: "3", icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Bài lên lịch sắp tới", value: "2", icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Bài nháp", value: "1", icon: FileText, color: "text-gray-600", bg: "bg-gray-100" },
  { label: "Tỉ lệ thành công", value: "94%", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
];

const recentPosts = MOCK_POSTS.slice(0, 4);

export default function DashboardPage() {
  const [showBanner, setShowBanner] = useState(true);
  const [onboardingStep] = useState(1); // 0 = done, 1-3 = in progress

  const steps = [
    { label: "Kết nối kênh đầu tiên", href: "/channels", done: false },
    { label: "Soạn bài đầu tiên", href: "/posts/new", done: false },
    { label: "Hẹn giờ đăng bài", href: "/calendar", done: false },
  ];

  return (
    <AppLayout>
      <div className="p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Xin chào, Bình!</h1>
            <p className="text-gray-500 text-sm mt-0.5">Thứ Năm, 17 tháng 4 năm 2026</p>
          </div>
          <Link
            href="/posts/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors shadow-sm"
          >
            <Plus size={16} />
            Soạn bài mới
          </Link>
        </div>

        {/* Credential expired banner */}
        {showBanner && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 mb-6">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-amber-800 text-sm flex-1">
              Kênh <strong>Instagram (@shopbinhfashion)</strong> đã hết hạn kết nối.{" "}
              <Link href="/channels" className="underline font-medium cursor-pointer">
                Kết nối lại ngay
              </Link>
            </p>
            <button
              onClick={() => setShowBanner(false)}
              className="text-amber-500 hover:text-amber-700 cursor-pointer ml-2"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Onboarding progress */}
        {onboardingStep > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">Bắt đầu với OPA</h2>
                <p className="text-sm text-gray-500 mt-0.5">Hoàn thành 3 bước để đăng bài đầu tiên</p>
              </div>
              <span className="text-xs text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full font-medium">
                0 / 3 hoàn thành
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {steps.map((step, i) => (
                <Link
                  key={i}
                  href={step.href}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    step.done
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-white border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    step.done ? "bg-emerald-500 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {step.done ? "✓" : i + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-700">{step.label}</span>
                  {!step.done && <ArrowRight size={14} className="text-gray-400 ml-auto" />}
                </Link>
              ))}
            </div>
            <button className="text-xs text-gray-400 hover:text-gray-600 mt-3 cursor-pointer">
              Bỏ qua hướng dẫn
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5">
                <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon size={18} className={s.color} />
                </div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            );
          })}
        </div>

        {/* Recent posts */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Bài đăng gần đây</h2>
            <Link href="/posts" className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentPosts.map((post) => (
              <Link key={post.id} href={`/posts/${post.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 cursor-pointer transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm truncate">{post.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${getStatusColor(post.status)}`}>
                      {getStatusLabel(post.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{getPostChannels(post.channelIds).map((ch) => ch.name).join(", ")}</span>
                    <span>•</span>
                    <span>{post.scheduledAt ? formatDate(post.scheduledAt) : "Chưa lên lịch"}</span>
                  </div>
                </div>
                {post.status === "failed" && (
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
