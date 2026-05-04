"use client";

import { useApp, Role, AuthState } from "@/lib/context";
import { Settings, User, Shield, Monitor, LogIn, Wrench } from "lucide-react";
import { useState } from "react";

const SCREENS: { label: string; path: string; role?: Role; auth?: AuthState }[] = [
  // Auth screens
  { label: "Landing Page", path: "/", auth: "landing" },
  { label: "First-run Setup", path: "/setup", auth: "setup" },
  { label: "Đăng nhập", path: "/login", auth: "login" },
  { label: "Đăng ký", path: "/register", auth: "login" },
  { label: "Quên mật khẩu", path: "/forgot-password", auth: "login" },
  // User screens
  { label: "Dashboard", path: "/dashboard", role: "user", auth: "app" },
  { label: "Danh sách bài đăng", path: "/posts", role: "user", auth: "app" },
  { label: "Soạn bài mới", path: "/posts/new", role: "user", auth: "app" },
  { label: "Chi tiết bài đăng", path: "/posts/1", role: "user", auth: "app" },
  { label: "Lịch đăng bài", path: "/calendar", role: "user", auth: "app" },
  { label: "Kết nối kênh", path: "/channels", role: "user", auth: "app" },
  { label: "Báo cáo hiệu quả", path: "/reports", role: "user", auth: "app" },
  { label: "Settings", path: "/settings", role: "user", auth: "app" },
  // Admin screens
  { label: "Admin Dashboard", path: "/admin/dashboard", role: "admin", auth: "app" },
  { label: "Danh sách Users", path: "/admin/users", role: "admin", auth: "app" },
  { label: "Chi tiết User", path: "/admin/users/u2", role: "admin", auth: "app" },
];

export default function RoleSwitcher() {
  const { role, setRole, setAuthState } = useApp();
  const [open, setOpen] = useState(false);

  function navigate(path: string, screenRole?: Role, auth?: AuthState) {
    if (screenRole) setRole(screenRole);
    if (auth) setAuthState(auth);
    window.location.href = path;
    setOpen(false);
  }

  const authScreens = SCREENS.filter((s) => !s.role);
  const userScreens = SCREENS.filter((s) => s.role === "user");
  const adminScreens = SCREENS.filter((s) => s.role === "admin");

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg cursor-pointer transition-all duration-200 hover:scale-105"
        title="Switch screens"
      >
        <Monitor size={24} />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 w-72 max-h-[70vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-indigo-600 rounded-t-2xl">
            <div className="flex items-center gap-2 text-white">
              <Monitor size={18} />
              <span className="font-semibold text-sm">OPA Screen Navigator</span>
            </div>
            <p className="text-indigo-200 text-xs mt-1">Xem nhanh tất cả màn hình</p>
          </div>

          {/* Role toggle */}
          <div className="px-4 py-3 border-b border-gray-100 flex gap-2">
            <button
              onClick={() => setRole("user")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <User size={13} /> User
            </button>
            <button
              onClick={() => setRole("admin")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                role === "admin"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Shield size={13} /> Admin
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            {/* Auth screens */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <LogIn size={11} /> Auth / Public
              </p>
            </div>
            {authScreens.map((s) => (
              <button
                key={s.path}
                onClick={() => navigate(s.path, s.role, s.auth)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                {s.label}
              </button>
            ))}

            {/* User screens */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <User size={11} /> User Screens
              </p>
            </div>
            {userScreens.map((s) => (
              <button
                key={s.path}
                onClick={() => navigate(s.path, s.role, s.auth)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                {s.label}
              </button>
            ))}

            {/* Admin screens */}
            <div className="px-4 pt-3 pb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Shield size={11} /> Admin Screens
              </p>
            </div>
            {adminScreens.map((s) => (
              <button
                key={s.path}
                onClick={() => navigate(s.path, s.role, s.auth)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 cursor-pointer transition-colors flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0" />
                {s.label}
              </button>
            ))}
            <div className="h-3" />
          </div>
        </div>
      )}
    </>
  );
}
