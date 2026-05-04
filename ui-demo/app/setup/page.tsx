"use client";

import { useState } from "react";
import { Zap, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import Link from "next/link";

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "Ít nhất 8 ký tự", ok: password.length >= 8 },
    { label: "Có chữ hoa", ok: /[A-Z]/.test(password) },
    { label: "Có số hoặc ký tự đặc biệt", ok: /[0-9!@#$%]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-red-400", "bg-amber-400", "bg-emerald-500"];
  const labels = ["Yếu", "Trung bình", "Mạnh"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < score ? colors[score - 1] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      {score > 0 && (
        <p className={`text-xs font-medium ${score === 3 ? "text-emerald-600" : score === 2 ? "text-amber-600" : "text-red-500"}`}>
          {labels[score - 1]}
        </p>
      )}
      <ul className="space-y-0.5">
        {checks.map((c) => (
          <li key={c.label} className={`text-xs flex items-center gap-1 ${c.ok ? "text-emerald-600" : "text-gray-400"}`}>
            <Check size={10} className={c.ok ? "opacity-100" : "opacity-0"} />
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-emerald-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Hệ thống đã sẵn sàng!</h2>
          <p className="text-gray-500 text-sm mb-6">Tài khoản Admin đã được tạo. Chào mừng Admin — hệ thống đã sẵn sàng.</p>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
          >
            Vào Admin Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Khởi tạo tài khoản Admin đầu tiên</h1>
          <p className="text-gray-500 text-sm mt-2 max-w-xs mx-auto">
            Đây là tài khoản sẽ quản lý toàn bộ hệ thống. Sau khi tạo, trang này sẽ bị khoá.
          </p>
        </div>

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 mb-6">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-sm">
            Bạn đang thiết lập lần đầu. Hãy dùng email và mật khẩu mạnh để bảo mật hệ thống.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Admin</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourcompany.com"
              required
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu mạnh ≥ 8 ký tự"
                required
                className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              required
              className={`w-full border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-colors focus:ring-2 ${
                confirm && confirm !== password
                  ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
                  : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/20"
              }`}
            />
            {confirm && confirm !== password && (
              <p className="text-red-500 text-xs mt-1">Mật khẩu không khớp</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!email || !password || password !== confirm || password.length < 8}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors"
          >
            Tạo tài khoản Admin
          </button>
        </form>
      </div>
    </div>
  );
}
