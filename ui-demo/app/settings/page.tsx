"use client";

import AppLayout from "@/components/layout/AppLayout";
import { useState, useEffect, useCallback } from "react";
import {
  User, Shield, Bell, Radio, BarChart2, Save, Eye, EyeOff, Check,
  Smartphone, LogOut, Send, Copy, ExternalLink, Link2, Unlink,
  CheckCircle2, Clock, Calendar, BellRing, BellOff, RefreshCw,
  AlertCircle, Loader2, CheckCheck, X,
} from "lucide-react";

type Tab = "profile" | "security" | "notifications" | "channels" | "account";
type TelegramStatus = "disconnected" | "connecting" | "expired" | "connected";
type TestStatus = "idle" | "sending" | "sent" | "failed";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Hồ sơ", icon: User },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "channels", label: "Kênh", icon: Radio },
  { id: "account", label: "Tài khoản", icon: BarChart2 },
];

const SESSIONS = [
  { device: "Chrome / macOS", ip: "113.185.xxx.xxx", lastUsed: "Hôm nay, 08:30", current: true },
  { device: "Safari / iPhone", ip: "113.185.xxx.xxx", lastUsed: "Hôm qua, 22:15", current: false },
  { device: "Chrome / Windows", ip: "14.225.xxx.xxx", lastUsed: "3 ngày trước", current: false },
];

const MOCK_DEEPLINK = "t.me/OpaBot?start=tok_abc123xyz";

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${on ? "bg-indigo-600" : "bg-gray-200"}`}
    >
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#229ED9" />
      <path d="M17.5 7L5.5 11.5l3.5 1.5 1.5 4 2-2.5 3.5 2.5 1.5-10z" fill="white" />
      <path d="M9 13l.5 3.5 1.5-2" fill="white" />
    </svg>
  );
}

function CountdownTimer({ seconds }: { seconds: number }) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  const urgent = seconds < 120;
  return (
    <span className={`font-mono text-sm font-semibold tabular-nums ${urgent ? "text-red-500" : "text-amber-600"}`}>
      {m}:{s}
    </span>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const [displayName, setDisplayName] = useState("Nguyễn Văn Bình");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");

  // Telegram state
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>("disconnected");
  const [countdown, setCountdown] = useState(900);
  const [copied, setCopied] = useState(false);

  // Notification preferences
  const [notifSuccess, setNotifSuccess] = useState(true);
  const [notifFailed, setNotifFailed] = useState(true);
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [dailyTime, setDailyTime] = useState("22:00");
  const [weeklyTime, setWeeklyTime] = useState("20:00");

  // Test message
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");

  const [showOldPw, setShowOldPw] = useState(false);
  const [saved, setSaved] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (telegramStatus !== "connecting") return;
    if (countdown <= 0) {
      setTelegramStatus("expired");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [telegramStatus, countdown]);

  const handleConnect = useCallback(() => {
    setTelegramStatus("connecting");
    setCountdown(900);
    // Simulate user clicking Start in Telegram after 4 seconds
    setTimeout(() => {
      setTelegramStatus("connected");
    }, 4000);
  }, []);

  const handleDisconnect = useCallback(() => {
    setTelegramStatus("disconnected");
    setTestStatus("idle");
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText("https://" + MOCK_DEEPLINK).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleTest = useCallback(() => {
    setTestStatus("sending");
    setTimeout(() => setTestStatus("sent"), 1800);
    setTimeout(() => setTestStatus("idle"), 4000);
  }, []);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm mt-0.5">Quản lý tài khoản, bảo mật và thông báo</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-0.5">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors ${
                      tab === t.id
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={15} />
                    {t.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {tab === "profile" && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                      Nên điền
                    </div>
                    <span className="text-sm text-gray-500">Hãy cập nhật tên hiển thị + timezone để OPA phục vụ bạn tốt hơn</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value="binh@example.com"
                    readOnly
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi. Đăng ký từ 01/03/2026.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên hiển thị</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Múi giờ</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer bg-white"
                  >
                    <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                    <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                    <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    <option value="America/New_York">America/New_York (GMT-5)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer bg-white">
                    <option>Tiếng Việt</option>
                    <option disabled>English (Sắp ra mắt)</option>
                  </select>
                </div>

                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors"
                >
                  {saved ? <Check size={15} /> : <Save size={15} />}
                  {saved ? "Đã lưu!" : "Lưu thay đổi"}
                </button>
              </div>
            )}

            {tab === "security" && (
              <div className="space-y-5">
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                  <h2 className="font-semibold text-gray-900">Đổi mật khẩu</h2>
                  {[
                    { label: "Mật khẩu hiện tại", show: showOldPw, toggle: () => setShowOldPw(!showOldPw) },
                    { label: "Mật khẩu mới" },
                    { label: "Xác nhận mật khẩu mới" },
                  ].map((f, i) => (
                    <div key={i}>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
                      <div className="relative">
                        <input
                          type={i === 0 && f.show ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pr-10"
                        />
                        {i === 0 && (
                          <button
                            type="button"
                            onClick={f.toggle}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                          >
                            {f.show ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors">
                    <Shield size={15} />
                    Cập nhật mật khẩu
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-gray-900">Phiên đăng nhập</h2>
                    <button className="text-xs text-red-500 hover:text-red-600 cursor-pointer flex items-center gap-1">
                      <LogOut size={12} />
                      Đăng xuất tất cả thiết bị khác
                    </button>
                  </div>
                  <div className="space-y-3">
                    {SESSIONS.map((s, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${s.current ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50"}`}>
                        <Smartphone size={18} className={s.current ? "text-emerald-600" : "text-gray-400"} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">{s.device}</p>
                          <p className="text-xs text-gray-400">{s.ip} · {s.lastUsed}</p>
                        </div>
                        {s.current ? (
                          <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">Hiện tại</span>
                        ) : (
                          <button className="text-xs text-red-500 hover:text-red-600 cursor-pointer">Đăng xuất</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "notifications" && (
              <div className="space-y-5">

                {/* ── Telegram Connection Card ── */}
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <TelegramIcon size={22} />
                      <div>
                        <h2 className="font-semibold text-gray-900 text-sm">Telegram Bot</h2>
                        <p className="text-xs text-gray-400">Nhận thông báo trực tiếp qua Telegram</p>
                      </div>
                    </div>
                    {telegramStatus === "connected" && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <CheckCircle2 size={11} />
                        Đã kết nối
                      </span>
                    )}
                    {telegramStatus === "connecting" && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        <Loader2 size={11} className="animate-spin" />
                        Đang chờ...
                      </span>
                    )}
                    {telegramStatus === "expired" && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                        <AlertCircle size={11} />
                        Link hết hạn
                      </span>
                    )}
                  </div>

                  <div className="p-6">
                    {/* State: disconnected */}
                    {telegramStatus === "disconnected" && (
                      <div className="flex flex-col items-center py-4 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-[#229ED9]/10 flex items-center justify-center mb-3">
                          <TelegramIcon size={30} />
                        </div>
                        <p className="text-sm font-medium text-gray-800 mb-1">Chưa kết nối Telegram</p>
                        <p className="text-xs text-gray-400 mb-5 max-w-xs">
                          Kết nối 1 chạm — OPA tự tạo link, bạn chỉ cần nhấn <strong>Start</strong> trong Telegram là xong.
                        </p>
                        <button
                          onClick={handleConnect}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#229ED9] hover:bg-[#1a8bc4] text-white rounded-xl text-sm font-semibold cursor-pointer transition-colors shadow-sm"
                        >
                          <TelegramIcon size={16} />
                          Kết nối Telegram
                        </button>
                      </div>
                    )}

                    {/* State: connecting */}
                    {telegramStatus === "connecting" && (
                      <div className="space-y-4">
                        {/* Timer bar */}
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-700">Mở Telegram và nhấn Start</p>
                          <div className="flex items-center gap-1.5">
                            <Clock size={13} className="text-amber-500" />
                            <CountdownTimer seconds={countdown} />
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-1.5 bg-amber-400 rounded-full transition-all duration-1000"
                            style={{ width: `${(countdown / 900) * 100}%` }}
                          />
                        </div>

                        {/* Steps */}
                        <div className="space-y-3 mt-1">
                          {/* Step 1 */}
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 mb-2">Click link để mở OPA Bot trên Telegram:</p>
                              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <Link2 size={13} className="text-gray-400 flex-shrink-0" />
                                <span className="text-xs text-gray-600 font-mono flex-1 truncate">{MOCK_DEEPLINK}</span>
                                <button
                                  onClick={handleCopy}
                                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors flex-shrink-0"
                                >
                                  {copied ? <><CheckCheck size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                                </button>
                                <a
                                  href={`https://${MOCK_DEEPLINK}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-[#229ED9] hover:text-[#1a8bc4] cursor-pointer transition-colors flex-shrink-0"
                                >
                                  <ExternalLink size={12} /> Mở
                                </a>
                              </div>
                            </div>
                          </div>

                          {/* Step 2 */}
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</div>
                            <p className="text-sm text-gray-700 mt-0.5">Nhấn nút <strong>Start</strong> trong Telegram</p>
                          </div>

                          {/* Step 3 */}
                          <div className="flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-400 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Loader2 size={13} className="text-gray-400 animate-spin" />
                              <p className="text-sm text-gray-400">Trang này tự cập nhật khi kết nối xong</p>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setTelegramStatus("disconnected")}
                          className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer transition-colors mt-1"
                        >
                          Huỷ
                        </button>
                      </div>
                    )}

                    {/* State: expired */}
                    {telegramStatus === "expired" && (
                      <div className="flex flex-col items-center py-4 text-center">
                        <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-3">
                          <AlertCircle size={22} className="text-red-500" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mb-1">Link đã hết hạn</p>
                        <p className="text-xs text-gray-400 mb-4">Link chỉ có hiệu lực trong 15 phút. Tạo link mới để tiếp tục.</p>
                        <button
                          onClick={handleConnect}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors"
                        >
                          <RefreshCw size={14} />
                          Tạo link mới
                        </button>
                      </div>
                    )}

                    {/* State: connected */}
                    {telegramStatus === "connected" && (
                      <div className="space-y-4">
                        {/* Connection info */}
                        <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <div className="w-9 h-9 rounded-full bg-[#229ED9] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">B</div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">@nguyenvanbinhvn</p>
                            <p className="text-xs text-gray-500">Kết nối lúc 09:30 · 24/04/2026</p>
                          </div>
                          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                        </div>

                        {/* Test message */}
                        <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Gửi tin nhắn thử</p>
                            <p className="text-xs text-gray-400">Kiểm tra bot có nhắn được cho bạn không</p>
                          </div>
                          <button
                            onClick={handleTest}
                            disabled={testStatus === "sending"}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors border ${
                              testStatus === "sent"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : testStatus === "failed"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                            } ${testStatus === "sending" ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            {testStatus === "sending" && <><Loader2 size={13} className="animate-spin" /> Đang gửi...</>}
                            {testStatus === "sent" && <><CheckCheck size={13} /> Đã gửi!</>}
                            {testStatus === "failed" && <><AlertCircle size={13} /> Gửi lỗi</>}
                            {testStatus === "idle" && <><Send size={13} /> Gửi test</>}
                          </button>
                        </div>

                        {/* Disconnect */}
                        <div className="flex justify-end">
                          <button
                            onClick={handleDisconnect}
                            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 cursor-pointer transition-colors"
                          >
                            <Unlink size={12} />
                            Ngắt kết nối Telegram
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Notification Preferences ── */}
                <div className={`bg-white rounded-2xl border overflow-hidden transition-opacity duration-300 ${
                  telegramStatus === "connected" ? "border-gray-100 opacity-100" : "border-gray-100 opacity-40 pointer-events-none"
                }`}>
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 text-sm">Loại thông báo</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Chọn thông báo bạn muốn nhận qua Telegram</p>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {/* Instant success */}
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <BellRing size={15} className="text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">Báo ngay khi đăng xong</p>
                            <p className="text-xs text-gray-400">Tên bài, nền tảng, link kết quả</p>
                          </div>
                        </div>
                        <Toggle on={notifSuccess} onToggle={() => setNotifSuccess(!notifSuccess)} />
                      </div>
                    </div>

                    {/* Instant fail */}
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                            <BellOff size={15} className="text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">Báo ngay khi đăng lỗi</p>
                            <p className="text-xs text-gray-400">Chi tiết lỗi để xử lý kịp thời</p>
                          </div>
                        </div>
                        <Toggle on={notifFailed} onToggle={() => setNotifFailed(!notifFailed)} />
                      </div>
                    </div>

                    {/* Daily report */}
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Clock size={15} className="text-indigo-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">Báo cáo tổng hợp hàng ngày</p>
                            <p className="text-xs text-gray-400">Tổng bài / thành công / lỗi trong ngày</p>
                          </div>
                        </div>
                        <Toggle on={notifDaily} onToggle={() => setNotifDaily(!notifDaily)} />
                      </div>
                      {notifDaily && (
                        <div className="mt-3 ml-11 flex items-center gap-2">
                          <Clock size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500">Gửi lúc</span>
                          <input
                            type="time"
                            value={dailyTime}
                            onChange={(e) => setDailyTime(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                          />
                          <span className="text-xs text-gray-400">mỗi ngày</span>
                        </div>
                      )}
                    </div>

                    {/* Weekly report */}
                    <div className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <Calendar size={15} className="text-purple-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">Báo cáo tổng hợp hàng tuần</p>
                            <p className="text-xs text-gray-400">Tổng kết 7 ngày qua, xu hướng nổi bật</p>
                          </div>
                        </div>
                        <Toggle on={notifWeekly} onToggle={() => setNotifWeekly(!notifWeekly)} />
                      </div>
                      {notifWeekly && (
                        <div className="mt-3 ml-11 flex items-center gap-2">
                          <Calendar size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500">Gửi vào Chủ nhật lúc</span>
                          <input
                            type="time"
                            value={weeklyTime}
                            onChange={(e) => setWeeklyTime(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview message */}
                  <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/50">
                    <p className="text-xs font-medium text-gray-500 mb-2">Xem trước tin nhắn mẫu:</p>
                    <div className="bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-600 font-mono leading-relaxed">
                      {notifSuccess && <p>✅ <strong>Đăng thành công</strong> — "5 tips viết content hay"<br/>📌 Facebook · Shop Thời Trang Bình<br/>🔗 https://fb.com/post/abc123<br/>⏰ 09:35, 24/04/2026</p>}
                      {!notifSuccess && !notifFailed && !notifDaily && !notifWeekly && (
                        <p className="text-gray-400 italic">Bạn chưa bật thông báo nào.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Save */}
                <button
                  onClick={handleSave}
                  disabled={telegramStatus !== "connected"}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                    telegramStatus !== "connected"
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  {saved ? <Check size={15} /> : <Save size={15} />}
                  {saved ? "Đã lưu!" : "Lưu thay đổi"}
                </button>
              </div>
            )}

            {tab === "channels" && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Kênh đã kết nối</h2>
                {[
                  { name: "Shop Thời Trang Bình", platform: "Facebook", status: "active" },
                  { name: "@shopbinhfashion", platform: "Instagram", status: "expired" },
                  { name: "Bình Nguyễn", platform: "LinkedIn", status: "active" },
                ].map((ch, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{ch.name}</p>
                      <p className="text-xs text-gray-400">{ch.platform}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ch.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {ch.status === "active" ? "Hoạt động" : "Hết hạn"}
                    </span>
                  </div>
                ))}
                <a href="/channels" className="block mt-4 text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer">
                  Quản lý kênh →
                </a>
              </div>
            )}

            {tab === "account" && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-5">Thống kê tài khoản</h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Tổng bài đăng", value: "47" },
                    { label: "Kênh đã kết nối", value: "4" },
                    { label: "Dung lượng đã dùng", value: "128 MB" },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                      <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-3">Tài khoản tạo ngày 01/03/2026 · Đăng nhập lần cuối hôm nay</p>
                  <p className="text-xs text-gray-300">Xóa tài khoản — Tính năng sẽ có trong bản cập nhật tiếp theo.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
