"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, ArrowLeft, Mail, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 800);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 cursor-pointer">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-xl">OPA</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
          <p className="text-gray-500 text-sm mt-1">Nhập email để nhận link đặt lại</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="text-emerald-600" size={28} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Đã gửi email!</h3>
              <p className="text-gray-500 text-sm mb-1">
                Nếu email <strong>{email}</strong> tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại mật khẩu.
              </p>
              <p className="text-gray-400 text-xs mt-3">Link có hiệu lực trong 15 phút.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@email.com"
                    required
                    className="w-full border border-gray-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer flex items-center justify-center gap-1">
            <ArrowLeft size={14} />
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
