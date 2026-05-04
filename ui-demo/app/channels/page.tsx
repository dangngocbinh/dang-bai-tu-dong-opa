"use client";

import AppLayout from "@/components/layout/AppLayout";
import { MOCK_CHANNELS, PLATFORMS, getPlatformColor, getPlatformName } from "@/lib/mock-data";
import PlatformIcon from "@/components/PlatformIcon";
import {
  Plus, Search, Filter, CheckCircle, XCircle, Wifi, Trash2, RefreshCw,
  Clock, AlertCircle, Pencil, Power, ChevronRight, ArrowLeft, Check, X
} from "lucide-react";
import { useState } from "react";

// ─── Channel status badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "active")
    return <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200"><CheckCircle size={10} />Active</span>;
  if (status === "expired")
    return <span className="flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full font-medium border border-red-200"><XCircle size={10} />Hết hạn</span>;
  return <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium"><Power size={10} />Tạm tắt</span>;
}

// ─── Add Channel Wizard ────────────────────────────────────────────────────────
const CONN_TYPES: Record<string, string> = {
  facebook: "webhook", instagram: "webhook", linkedin: "webhook",
  youtube: "oauth", threads: "api", x: "api",
};
const CONN_LABELS: Record<string, string> = {
  webhook: "Webhook (Make.com)", oauth: "OAuth (Google)", api: "API Key / Access Token",
};

function AddChannelWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [connType, setConnType] = useState("");
  const [config, setConfig] = useState("");
  const [channelName, setChannelName] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  function selectPlatform(id: string) {
    setSelectedPlatform(id);
    setConnType(CONN_TYPES[id] ?? "webhook");
    setStep(2);
  }

  function handleTest() {
    setTestStatus("testing");
    setTimeout(() => setTestStatus("ok"), 1500);
  }

  const platformName = getPlatformName(selectedPlatform);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Wizard header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Thêm Kênh mới</h3>
            <p className="text-slate-400 text-xs mt-0.5">Bước {step} / 5</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer p-1"><X size={18} /></button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div className="h-1 bg-indigo-600 transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
        </div>

        <div className="p-6">
          {/* Step 1 — Chọn nền tảng */}
          {step === 1 && (
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Chọn nền tảng</h4>
              <p className="text-sm text-gray-500 mb-4">Kênh này sẽ đăng bài lên nền tảng nào?</p>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPlatform(p.id)}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-400 cursor-pointer transition-all hover:bg-indigo-50"
                  >
                    <PlatformIcon platform={p.id} size={36} />
                    <span className="text-xs font-medium text-gray-700">{p.name}</span>
                  </button>
                ))}
                {/* TikTok soon */}
                <div className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl opacity-40 cursor-not-allowed">
                  <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center text-white text-xs font-bold">T</div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500">TikTok</div>
                    <div className="text-xs text-orange-500">Sắp ra mắt</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Loại kết nối */}
          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 cursor-pointer mb-3">
                <ArrowLeft size={14} /> Quay lại
              </button>
              <h4 className="font-semibold text-gray-900 mb-1">Loại kết nối — <span className="text-indigo-600">{platformName}</span></h4>
              <p className="text-sm text-gray-500 mb-4">Phương thức xác thực để OPA đăng bài lên {platformName}</p>
              <div className="space-y-3">
                {[CONN_TYPES[selectedPlatform]].map((ct) => (
                  <div key={ct} className="p-4 border-2 border-indigo-500 bg-indigo-50 rounded-xl cursor-pointer">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <span className="font-medium text-gray-800 text-sm">{CONN_LABELS[ct]}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 ml-6">
                      {ct === "webhook" && "Tạo Scenario trên Make.com, dán Webhook URL vào đây. Make.com sẽ xử lý việc đăng bài."}
                      {ct === "oauth" && "Đăng nhập Google và cấp quyền youtube.upload. Token được lưu encrypted."}
                      {ct === "api" && "Tạo Developer App trên Developer Portal, nhập API Key + Access Token."}
                    </p>
                  </div>
                ))}
              </div>
              <button onClick={() => setStep(3)} className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors flex items-center justify-center gap-2">
                Tiếp theo <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Step 3 — Nhập config */}
          {step === 3 && (
            <div>
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 cursor-pointer mb-3">
                <ArrowLeft size={14} /> Quay lại
              </button>
              <h4 className="font-semibold text-gray-900 mb-1">Cấu hình kết nối</h4>
              <p className="text-sm text-gray-500 mb-4">
                {connType === "webhook" && "Dán Webhook URL từ Make.com Scenario của bạn"}
                {connType === "oauth" && "Click để xác thực qua Google OAuth"}
                {connType === "api" && "Nhập API Key và Access Token từ Developer Portal"}
              </p>

              {connType === "webhook" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook URL</label>
                  <input
                    type="url"
                    value={config}
                    onChange={(e) => setConfig(e.target.value)}
                    placeholder="https://hook.make.com/..."
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <a href="#" className="text-xs text-indigo-600 mt-1.5 block hover:text-indigo-700 cursor-pointer">
                    Xem hướng dẫn tạo Make.com Scenario →
                  </a>
                </div>
              )}
              {connType === "oauth" && (
                <button className="w-full py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-center gap-2">
                  <div className="w-5 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">G</div>
                  Đăng nhập với Google
                </button>
              )}
              {connType === "api" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
                    <input type="password" placeholder="••••••••••••••••" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Access Token</label>
                    <input type="password" placeholder="••••••••••••••••" className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                </div>
              )}
              <button onClick={() => setStep(4)} className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium cursor-pointer transition-colors flex items-center justify-center gap-2">
                Tiếp theo <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Step 4 — Đặt tên Kênh */}
          {step === 4 && (
            <div>
              <button onClick={() => setStep(3)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 cursor-pointer mb-3">
                <ArrowLeft size={14} /> Quay lại
              </button>
              <h4 className="font-semibold text-gray-900 mb-1">Đặt tên Kênh</h4>
              <p className="text-sm text-gray-500 mb-4">Tên này giúp bạn nhận ra Kênh khi soạn bài</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tên Kênh <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder={`VD: Shop Cưng ${platformName}`}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1.5">Gợi ý tên hay dùng:</p>
                <div className="flex flex-wrap gap-2">
                  {["Shop Cưng", "Kênh cá nhân của tôi", "Giải Trí Thể Thao"].map((s) => (
                    <button key={s} onClick={() => setChannelName(s)} className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg hover:border-indigo-300 cursor-pointer transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setStep(5)}
                disabled={!channelName.trim()}
                className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                Tiếp theo <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Step 5 — Xác nhận & Test */}
          {step === 5 && (
            <div>
              <button onClick={() => setStep(4)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 cursor-pointer mb-3">
                <ArrowLeft size={14} /> Quay lại
              </button>
              <h4 className="font-semibold text-gray-900 mb-1">Xác nhận & Test kết nối</h4>
              <p className="text-sm text-gray-500 mb-4">Kiểm tra trước khi lưu</p>

              <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
                {[
                  { label: "Kênh", value: channelName },
                  { label: "Nền tảng", value: getPlatformName(selectedPlatform) },
                  { label: "Loại kết nối", value: CONN_LABELS[connType] },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-gray-400">{row.label}</span>
                    <span className="font-medium text-gray-800">{row.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleTest}
                disabled={testStatus === "testing"}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer transition-colors flex items-center justify-center gap-2 mb-3"
              >
                {testStatus === "testing" ? (
                  <><div className="w-3.5 h-3.5 border border-gray-400 border-t-transparent rounded-full animate-spin" /> Đang test...</>
                ) : testStatus === "ok" ? (
                  <><Check size={14} className="text-emerald-600" /> Kết nối thành công — 120ms</>
                ) : testStatus === "fail" ? (
                  <><XCircle size={14} className="text-red-500" /> Kết nối thất bại</>
                ) : (
                  <><Wifi size={14} /> Test kết nối (khuyên dùng)</>
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold cursor-pointer transition-colors"
              >
                Lưu Kênh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function ChannelsPage() {
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showWizard, setShowWizard] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = MOCK_CHANNELS.filter((ch) => {
    const matchSearch = !search || ch.name.toLowerCase().includes(search.toLowerCase());
    const matchPlatform = platformFilter === "all" || ch.platform === platformFilter;
    const matchStatus = statusFilter === "all" || ch.status === statusFilter;
    return matchSearch && matchPlatform && matchStatus;
  });

  const expiredChannels = MOCK_CHANNELS.filter((c) => c.status === "expired");

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kênh kết nối</h1>
            <p className="text-gray-500 text-sm mt-0.5">{MOCK_CHANNELS.length} kênh · Chọn kênh khi soạn bài</p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-colors shadow-sm"
          >
            <Plus size={16} />
            Thêm Kênh
          </button>
        </div>

        {/* Expired warning banner */}
        {expiredChannels.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                {expiredChannels.length} kênh hết hạn cần kết nối lại
              </p>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {expiredChannels.map((ch) => (
                  <button key={ch.id} className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-2.5 py-1 rounded-lg cursor-pointer transition-colors flex items-center gap-1">
                    <RefreshCw size={10} /> {ch.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Concept info box */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-indigo-800">
            <strong>Kênh</strong> = 1 tài khoản social cụ thể, có tên riêng bạn đặt.
            Bạn có thể tạo nhiều Kênh cùng nền tảng — vd: <em>"Shop Cưng"</em> và <em>"Giải Trí Thể Thao"</em> đều là Kênh Facebook riêng biệt.
          </p>
        </div>

        {MOCK_CHANNELS.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus size={28} className="text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Bạn chưa có Kênh nào</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">Tạo Kênh đầu tiên để bắt đầu lên lịch và đăng bài tự động</p>
            <div className="flex flex-wrap gap-2 justify-center mb-6 text-xs text-gray-400">
              <span>Gợi ý tên:</span>
              {["Shop Cưng", "Kênh cá nhân của tôi", "Giải Trí Thể Thao"].map((n) => (
                <span key={n} className="bg-gray-100 px-2 py-0.5 rounded-md">{n}</span>
              ))}
            </div>
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
            >
              <Plus size={16} /> Thêm Kênh đầu tiên
            </button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 mb-5 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên kênh..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-gray-400" />
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả nền tảng</option>
                  {PLATFORMS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Active</option>
                  <option value="expired">Hết hạn</option>
                  <option value="inactive">Tạm tắt</option>
                </select>
              </div>
            </div>

            {/* Channel list */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-50">
                {filtered.map((ch) => (
                  <div key={ch.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group">
                    {/* Platform icon + name */}
                    <PlatformIcon platform={ch.platform} size={40} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{ch.name}</span>
                        <StatusBadge status={ch.status} />
                        {ch.labels.map((l) => (
                          <span key={l} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">{l}</span>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        <span>{getPlatformName(ch.platform)}</span>
                        <span>·</span>
                        <span className="capitalize">
                          {ch.connType === "webhook" ? "Make.com Webhook" : ch.connType === "oauth" ? "OAuth" : "API Key"}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5"><Clock size={10} /> Tạo: {ch.connectedAt}</span>
                        <span>·</span>
                        <span>{ch.postsCount} bài · {ch.successRate}% thành công</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                        title="Test kết nối"
                      >
                        <Wifi size={13} /> Test
                      </button>

                      {ch.status === "expired" && (
                        <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg cursor-pointer transition-colors">
                          <RefreshCw size={13} /> Reconnect
                        </button>
                      )}

                      <button
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        title="Đổi tên / cập nhật credential"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        className={`p-1.5 rounded-lg cursor-pointer transition-colors ${ch.status === "active" ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"}`}
                        title={ch.status === "active" ? "Tạm tắt kênh" : "Kích hoạt lại"}
                      >
                        <Power size={14} />
                      </button>

                      <button
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        title="Xóa kênh"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Group by platform summary */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              {PLATFORMS.filter((p) => MOCK_CHANNELS.some((ch) => ch.platform === p.id)).map((p) => {
                const chs = MOCK_CHANNELS.filter((ch) => ch.platform === p.id);
                return (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                    <PlatformIcon platform={p.id} size={32} />
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{p.name}</div>
                      <div className="text-xs text-gray-400">{chs.length} kênh</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showWizard && <AddChannelWizard onClose={() => setShowWizard(false)} />}
    </AppLayout>
  );
}
