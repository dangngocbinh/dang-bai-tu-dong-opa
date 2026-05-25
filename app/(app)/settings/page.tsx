"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  User, Shield, Bell, Radio, BarChart2, Save, Eye, EyeOff, Check,
  Smartphone, LogOut, Send, Copy, ExternalLink, Link2, Unlink,
  CheckCircle2, Clock, Calendar, BellRing, BellOff, RefreshCw,
  AlertCircle, Loader2, CheckCheck, X,
} from "lucide-react";

type Tab = "profile" | "security" | "notifications" | "channels" | "account";
type TelegramStatus = "disconnected" | "connecting" | "expired" | "connected";
type TestStatus = "idle" | "sending" | "sent" | "failed";

interface ChannelSummary {
  id: string;
  name: string;
  platform: string;
  status: string;
}

interface UserSettings {
  id: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  timezone: string;
  zaloPhone: string | null;
  telegramChatId: string | null;
  telegramSettings: {
    notify_success: boolean;
    notify_fail: boolean;
    daily_report: boolean;
    weekly_report: boolean;
    report_time: string;
  };
  createdAt: string;
  lastLoginAt: string | null;
  stats: {
    total_posts: number;
    connected_channels: number;
    storage_used_mb: number;
  };
  channels: ChannelSummary[];
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Hồ sơ", icon: User },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "channels", label: "Kênh", icon: Radio },
  { id: "account", label: "Tài khoản", icon: BarChart2 },
];

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  threads: "Threads",
  x: "X",
};

const CHANNEL_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Hoạt động", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  expired: { label: "Hết hạn", className: "bg-red-100 text-red-700 border-red-200" },
  inactive: { label: "Tắt", className: "bg-gray-100 text-gray-600 border-gray-200" },
};

const TIMEZONES = [
  { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (GMT+7)" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok (GMT+7)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (GMT+8)" },
  { value: "America/New_York", label: "America/New_York (GMT-5)" },
  { value: "Europe/London", label: "Europe/London (GMT+0/+1)" },
];

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
  const [userData, setUserData] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [zaloPhone, setZaloPhone] = useState("");
  const [zaloPhoneError, setZaloPhoneError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Telegram state
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>("disconnected");
  const [deeplink, setDeeplink] = useState("");
  const [countdown, setCountdown] = useState(900);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Notification preferences
  const [notifSuccess, setNotifSuccess] = useState(true);
  const [notifFailed, setNotifFailed] = useState(true);
  const [notifDaily, setNotifDaily] = useState(true);
  const [notifWeekly, setNotifWeekly] = useState(false);
  const [dailyTime, setDailyTime] = useState("22:00");
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);

  // Test message
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");

  // Security
  const [showOldPw, setShowOldPw] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Load user settings
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          const u: UserSettings = res.data;
          setUserData(u);
          setDisplayName(u.displayName ?? "");
          setBio(u.bio ?? "");
          setTimezone(u.timezone);
          setZaloPhone(u.zaloPhone ?? "");
          if (u.telegramChatId) setTelegramStatus("connected");
          const s = u.telegramSettings;
          setNotifSuccess(s.notify_success ?? true);
          setNotifFailed(s.notify_fail ?? true);
          setNotifDaily(s.daily_report ?? true);
          setNotifWeekly(s.weekly_report ?? false);
          setDailyTime(s.report_time ?? "22:00");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Countdown timer while connecting
  useEffect(() => {
    if (telegramStatus !== "connecting") return;
    if (countdown <= 0) {
      setTelegramStatus("expired");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [telegramStatus, countdown]);

  // Poll for connection after deeplink generated
  useEffect(() => {
    if (telegramStatus !== "connecting") {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(async () => {
      const res = await fetch("/api/telegram/connect").then((r) => r.json());
      if (res.data?.connected) {
        setTelegramStatus("connected");
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [telegramStatus]);

  const handleConnect = useCallback(async () => {
    const res = await fetch("/api/telegram/connect", { method: "POST" }).then((r) => r.json());
    if (res.data?.deeplink) {
      setDeeplink(res.data.deeplink);
      setTelegramStatus("connecting");
      setCountdown(900);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    await fetch("/api/telegram/connect", { method: "DELETE" });
    setTelegramStatus("disconnected");
    setTestStatus("idle");
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(deeplink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [deeplink]);

  const handleTest = useCallback(async () => {
    setTestStatus("sending");
    const res = await fetch("/api/telegram/test", { method: "POST" }).then((r) => r.json());
    setTestStatus(res.data ? "sent" : "failed");
    setTimeout(() => setTestStatus("idle"), 4000);
  }, []);

  const handleSaveProfile = useCallback(async () => {
    setZaloPhoneError("");
    if (zaloPhone && !/^(0|\+84)[0-9]{8,10}$/.test(zaloPhone)) {
      setZaloPhoneError("Số điện thoại không hợp lệ (VD: 0901234567)");
      return;
    }
    setProfileSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, bio: bio || null, timezone, zaloPhone: zaloPhone || null }),
    });
    setProfileSaving(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }, [displayName, bio, timezone, zaloPhone]);

  const handleSaveNotifications = useCallback(async () => {
    setNotifSaving(true);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramSettings: {
          notify_success: notifSuccess,
          notify_fail: notifFailed,
          daily_report: notifDaily,
          weekly_report: notifWeekly,
          report_time: dailyTime,
        },
      }),
    });
    setNotifSaving(false);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 2000);
  }, [notifSuccess, notifFailed, notifDaily, notifWeekly, dailyTime]);

  const handleChangePassword = useCallback(async () => {
    setPwError("");
    if (newPw !== confirmPw) { setPwError("Mật khẩu mới không khớp"); return; }
    if (newPw.length < 8) { setPwError("Mật khẩu mới phải từ 8 ký tự"); return; }
    setPwSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: oldPw, newPassword: newPw }),
    }).then((r) => r.json());
    setPwSaving(false);
    if (res.error) { setPwError(res.error.message ?? "Lỗi đổi mật khẩu"); return; }
    setPwSaved(true);
    setOldPw(""); setNewPw(""); setConfirmPw("");
    setTimeout(() => setPwSaved(false), 3000);
  }, [oldPw, newPw, confirmPw]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }

  const isNewUser = !userData?.displayName || !userData?.timezone;

  return (
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
                    tab === t.id ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
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

          {/* ── Profile ── */}
          {tab === "profile" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
              {isNewUser && (
                <div className="flex items-center gap-2">
                  <div className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    Nên điền
                  </div>
                  <span className="text-sm text-gray-500">Hãy cập nhật tên hiển thị + timezone để OPA phục vụ bạn tốt hơn</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={userData?.email ?? ""}
                  readOnly
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Email không thể thay đổi.
                  {userData?.createdAt && ` Đăng ký từ ${new Date(userData.createdAt).toLocaleDateString("vi-VN")}.`}
                  {userData?.lastLoginAt && ` Đăng nhập gần nhất ${new Date(userData.lastLoginAt).toLocaleString("vi-VN")}.`}
                </p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tiểu sử</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Giới thiệu ngắn về bạn..."
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{bio.length}/500</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Múi giờ</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer bg-white"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Số điện thoại Zalo
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-blue-500 select-none">Z</span>
                  <input
                    type="tel"
                    value={zaloPhone}
                    onChange={(e) => { setZaloPhone(e.target.value); setZaloPhoneError(""); }}
                    placeholder="0901234567"
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                {zaloPhoneError && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle size={11} />
                    {zaloPhoneError}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">Dùng để gửi tin nhắn thông báo qua Zalo OA.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ngôn ngữ</label>
                <select className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 cursor-pointer bg-white">
                  <option>Tiếng Việt</option>
                  <option disabled>English (Sắp ra mắt)</option>
                </select>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors disabled:opacity-60"
              >
                {profileSaved ? <Check size={15} /> : profileSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {profileSaved ? "Đã lưu!" : "Lưu thay đổi"}
              </button>
            </div>
          )}

          {/* ── Security ── */}
          {tab === "security" && (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900">Đổi mật khẩu</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu hiện tại</label>
                  <div className="relative">
                    <input
                      type={showOldPw ? "text" : "password"}
                      value={oldPw}
                      onChange={(e) => setOldPw(e.target.value)}
                      placeholder="••••••••"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPw(!showOldPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                    >
                      {showOldPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {pwError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle size={14} />
                    {pwError}
                  </div>
                )}

                {pwSaved && (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <Check size={14} />
                    Đã đổi mật khẩu thành công
                  </div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors disabled:opacity-60"
                >
                  {pwSaving ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
                  Cập nhật mật khẩu
                </button>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {tab === "notifications" && (
            <div className="space-y-5">

              {/* Telegram Connection Card */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
                  {/* Disconnected */}
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

                  {/* Connecting */}
                  {telegramStatus === "connecting" && (
                    <div className="space-y-4">
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

                      <div className="space-y-3 mt-1">
                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-700 mb-2">Click link để mở OPA Bot trên Telegram:</p>
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                              <Link2 size={13} className="text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-600 font-mono flex-1 truncate">{deeplink.replace("https://", "")}</span>
                              <button
                                onClick={handleCopy}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors flex-shrink-0"
                              >
                                {copied ? <><CheckCheck size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                              </button>
                              <a
                                href={deeplink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-xs text-[#229ED9] hover:text-[#1a8bc4] cursor-pointer transition-colors flex-shrink-0"
                              >
                                <ExternalLink size={12} /> Mở
                              </a>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</div>
                          <p className="text-sm text-gray-700 mt-0.5">Nhấn nút <strong>Start</strong> trong Telegram</p>
                        </div>

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

                  {/* Expired */}
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

                  {/* Connected */}
                  {telegramStatus === "connected" && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-[#229ED9] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {(userData?.displayName ?? userData?.email ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">Đã kết nối Telegram</p>
                          <p className="text-xs text-gray-500">Thông báo đang hoạt động</p>
                        </div>
                        <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                      </div>

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

              {/* Notification Preferences */}
              <div className={`bg-white rounded-2xl border overflow-hidden transition-opacity duration-300 ${
                telegramStatus === "connected" ? "border-gray-100 opacity-100" : "border-gray-100 opacity-40 pointer-events-none"
              }`}>
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900 text-sm">Loại thông báo</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Chọn thông báo bạn muốn nhận qua Telegram</p>
                </div>

                <div className="divide-y divide-gray-50">
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
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/50">
                  <p className="text-xs font-medium text-gray-500 mb-2">Xem trước tin nhắn mẫu:</p>
                  <div className="bg-white border border-gray-200 rounded-xl p-3 text-xs text-gray-600 font-mono leading-relaxed">
                    {notifSuccess && (
                      <p>
                        ✅ <strong>Đăng thành công</strong> — &quot;5 tips viết content hay&quot;<br />
                        📌 Facebook · Shop Thời Trang<br />
                        🔗 https://fb.com/post/abc123<br />
                        ⏰ 09:35, 24/04/2026
                      </p>
                    )}
                    {!notifSuccess && !notifFailed && !notifDaily && !notifWeekly && (
                      <p className="text-gray-400 italic">Bạn chưa bật thông báo nào.</p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveNotifications}
                disabled={telegramStatus !== "connected" || notifSaving}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors ${
                  telegramStatus !== "connected"
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                } disabled:opacity-60`}
              >
                {notifSaved ? <Check size={15} /> : notifSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {notifSaved ? "Đã lưu!" : "Lưu thay đổi"}
              </button>
            </div>
          )}

          {/* ── Channels (status preview + quick link) ── */}
          {tab === "channels" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Kênh đã kết nối</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {userData?.channels.length ?? 0} kênh
                  </p>
                </div>
                <a
                  href="/channels"
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer transition-colors"
                >
                  Quản lý kênh
                  <ExternalLink size={13} />
                </a>
              </div>

              {!userData?.channels.length ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                    <Radio size={20} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Chưa kết nối kênh nào</p>
                  <p className="text-xs text-gray-400 mb-4">Thêm kênh mạng xã hội đầu tiên để bắt đầu đăng bài.</p>
                  <a
                    href="/channels/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors"
                  >
                    <Radio size={14} />
                    Kết nối kênh đầu tiên
                  </a>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {userData.channels.map((ch) => {
                    const badge = CHANNEL_STATUS_BADGE[ch.status] ?? CHANNEL_STATUS_BADGE.inactive;
                    return (
                      <div key={ch.id} className="flex items-center justify-between py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{ch.name}</p>
                          <p className="text-xs text-gray-400">
                            {PLATFORM_LABEL[ch.platform] ?? ch.platform}
                          </p>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border font-medium flex-shrink-0 ml-3 ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Account stats ── */}
          {tab === "account" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Thống kê tài khoản</h2>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{userData?.stats.total_posts ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Tổng bài đăng</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{userData?.stats.connected_channels ?? 0}</div>
                  <div className="text-xs text-gray-500 mt-1">Kênh kết nối</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {userData?.stats.storage_used_mb ?? 0}
                    <span className="text-sm font-medium text-gray-500 ml-1">MB</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Dung lượng đã dùng</div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">
                  {userData?.createdAt && `Tài khoản tạo ngày ${new Date(userData.createdAt).toLocaleDateString("vi-VN")}`}
                </p>
                {userData?.lastLoginAt && (
                  <p className="text-xs text-gray-400">
                    Đăng nhập lần cuối: {new Date(userData.lastLoginAt).toLocaleString("vi-VN")}
                  </p>
                )}
                <p className="text-xs text-gray-300 mt-3">Xóa tài khoản — Tính năng sẽ có trong bản cập nhật tiếp theo.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
