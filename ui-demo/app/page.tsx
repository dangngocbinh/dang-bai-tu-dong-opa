"use client";

import Link from "next/link";
import { Zap, CheckCircle, ArrowRight, Calendar, Bell, BarChart2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-gray-100 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">OPA</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm cursor-pointer transition-colors">
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors"
            >
              Dùng thử miễn phí
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border border-indigo-200">
          <Zap size={12} />
          Pay-as-you-go — không phí cố định
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6 max-w-3xl mx-auto">
          Soạn 1 bài,{" "}
          <span className="text-indigo-600">đăng khắp nơi</span>
          <br />tự động, không cần ngồi chờ
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
          Đăng bài lên Facebook, Instagram, LinkedIn, YouTube, Threads, X.com chỉ với một lần soạn.
          Hẹn giờ, tự động đăng, nhận báo cáo qua Telegram.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl text-base font-semibold cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-indigo-200 flex items-center gap-2"
          >
            Bắt đầu miễn phí
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-indigo-600 px-6 py-3.5 rounded-xl text-base font-medium cursor-pointer transition-colors flex items-center gap-2 border border-gray-200 hover:border-indigo-200"
          >
            Xem demo
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-14">
            Mọi thứ bạn cần để đăng bài hiệu quả
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Calendar className="text-indigo-600" size={28} />,
                title: "Lên lịch thông minh",
                desc: "Đặt giờ vàng một lần, hệ thống tự đăng đúng giờ. Kéo thả lịch trực quan.",
              },
              {
                icon: <Bell className="text-indigo-600" size={28} />,
                title: "Thông báo Telegram",
                desc: "Nhận kết quả ngay qua Telegram khi bài đăng xong. Báo cáo tổng hợp cuối ngày.",
              },
              {
                icon: <BarChart2 className="text-indigo-600" size={28} />,
                title: "Báo cáo hiệu quả",
                desc: "Theo dõi like, comment, reach từng nền tảng ngay trên OPA. Biết bài nào hiệu quả.",
              },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 transition-colors cursor-default">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-5">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platforms */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
          Hỗ trợ 6 nền tảng phổ biến
        </h2>
        <p className="text-center text-gray-500 mb-12">Chỉ cần kết nối một lần, đăng bài mãi mãi</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { name: "Facebook", color: "#1877F2", abbr: "f" },
            { name: "Instagram", color: "#E1306C", abbr: "in" },
            { name: "LinkedIn", color: "#0A66C2", abbr: "li" },
            { name: "YouTube", color: "#FF0000", abbr: "yt" },
            { name: "Threads", color: "#000000", abbr: "th" },
            { name: "X.com", color: "#000000", abbr: "x" },
          ].map((p) => (
            <div key={p.name} className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-gray-200 transition-colors cursor-default">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: p.color }}
              >
                {p.abbr}
              </div>
              <span className="text-xs font-medium text-gray-700">{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-indigo-600 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-indigo-200 text-sm font-medium mb-4">Người dùng nói gì về OPA</p>
          <blockquote className="text-white text-2xl font-medium leading-relaxed mb-6">
            "Trước đây mất 2 tiếng/ngày để đăng bài thủ công. Giờ OPA làm hết trong 5 phút. Quá tiện!"
          </blockquote>
          <p className="text-indigo-200 text-sm">— Nguyễn Minh Tú, chủ shop thời trang online</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Sẵn sàng tiết kiệm 2 tiếng mỗi ngày?</h2>
        <p className="text-gray-500 mb-8">Đăng ký miễn phí, chỉ trả tiền theo lượng bài đăng thực tế.</p>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl text-base font-semibold cursor-pointer transition-colors"
        >
          Bắt đầu ngay <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center">
        <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
          <div className="w-5 h-5 bg-indigo-600 rounded flex items-center justify-center">
            <Zap size={11} className="text-white" />
          </div>
          <span>OPA — Open Publishing Assistant © 2026</span>
        </div>
      </footer>
    </div>
  );
}
