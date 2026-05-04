"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronRight, Wifi, Check, XCircle, Loader2, X,
} from "lucide-react";
import PlatformIcon, { PLATFORMS } from "@/components/PlatformIcon";

const CONN_TYPES: Record<string, string> = {
  facebook: "webhook",
  instagram: "webhook",
  linkedin: "webhook",
  youtube: "oauth",
  threads: "api",
  x: "api",
};

const CONN_LABELS: Record<string, string> = {
  webhook: "Webhook (Make.com)",
  oauth: "OAuth (Google)",
  api: "API Key / Access Token",
};

const CONN_DESC: Record<string, string> = {
  webhook:
    "Tạo Scenario trên Make.com, dán Webhook URL vào đây. Make.com sẽ xử lý việc đăng bài.",
  oauth: "Đăng nhập Google và cấp quyền youtube.upload. Token được lưu encrypted.",
  api: "Tạo Developer App trên Developer Portal, nhập API Key + Access Token.",
};

type TestStatus = "idle" | "testing" | "ok" | "fail";

export default function NewChannelPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [connType, setConnType] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [channelName, setChannelName] = useState("");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMessage, setTestMessage] = useState("");
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);

  const platformName =
    PLATFORMS.find((p) => p.id === selectedPlatform)?.name ?? selectedPlatform;

  function selectPlatform(id: string) {
    setSelectedPlatform(id);
    setConnType(CONN_TYPES[id] ?? "webhook");
    setStep(2);
  }

  function buildCredentials(): Record<string, string> | undefined {
    if (connType === "webhook") return undefined;
    if (connType === "api") {
      return { apiKey, accessToken };
    }
    return undefined;
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    const body: Record<string, unknown> = {
      name: channelName.trim(),
      platform: selectedPlatform,
      connectionType: connType,
    };
    if (connType === "webhook" && webhookUrl) body.webhookUrl = webhookUrl;
    const creds = buildCredentials();
    if (creds) body.credentials = creds;

    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();

    if (!res.ok) {
      setSaveError(json.error?.message ?? "Tạo Kênh thất bại");
      setSaving(false);
      return;
    }

    setCreatedId(json.data.id);
    setStep(5);
    setSaving(false);
  }

  async function handleTest() {
    if (!createdId) return;
    setTestStatus("testing");
    setTestMessage("");
    setTestLatency(null);

    const res = await fetch(`/api/channels/${createdId}/test`, { method: "POST" });
    const json = await res.json();

    if (json.data?.success) {
      setTestStatus("ok");
      setTestMessage(json.data.message ?? "Kết nối thành công");
      setTestLatency(json.data.latencyMs ?? null);
    } else {
      setTestStatus("fail");
      setTestMessage(json.data?.message ?? json.error?.message ?? "Kết nối thất bại");
    }
  }

  const progress = (step / 5) * 100;

  return (
    <div className="p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Thêm Kênh mới</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4">
          <p className="text-white font-semibold text-sm">
            {step === 1 && "Chọn nền tảng"}
            {step === 2 && "Loại kết nối"}
            {step === 3 && "Cấu hình kết nối"}
            {step === 4 && "Đặt tên Kênh"}
            {step === 5 && "Test & Hoàn thành"}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">Bước {step} / 5</p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-1 bg-indigo-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step 1 — Chọn nền tảng */}
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Kênh này sẽ đăng bài lên nền tảng nào?
              </p>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPlatform(p.id)}
                    className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-400 transition-all hover:bg-indigo-50"
                  >
                    <PlatformIcon platform={p.id} size={36} />
                    <span className="text-xs font-medium text-gray-700">{p.name}</span>
                  </button>
                ))}
                {/* TikTok — coming soon */}
                <div className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-200 rounded-xl opacity-40 cursor-not-allowed">
                  <div className="w-9 h-9 bg-black rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    T
                  </div>
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
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"
              >
                <ArrowLeft size={14} /> Quay lại
              </button>
              <p className="text-sm text-gray-500 mb-4">
                Phương thức xác thực để OPA đăng bài lên{" "}
                <strong className="text-indigo-600">{platformName}</strong>
              </p>
              <div className="p-4 border-2 border-indigo-500 bg-indigo-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                  <span className="font-medium text-gray-800 text-sm">
                    {CONN_LABELS[connType]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5 ml-6">{CONN_DESC[connType]}</p>
              </div>
              <button
                onClick={() => setStep(3)}
                className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                Tiếp theo <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Step 3 — Nhập config */}
          {step === 3 && (
            <div>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"
              >
                <ArrowLeft size={14} /> Quay lại
              </button>
              <p className="text-sm text-gray-500 mb-4">
                {connType === "webhook" && "Dán Webhook URL từ Make.com Scenario của bạn"}
                {connType === "oauth" && "Click để xác thực qua Google OAuth"}
                {connType === "api" && "Nhập API Key và Access Token từ Developer Portal"}
              </p>

              {connType === "webhook" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://hook.make.com/..."
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              )}
              {connType === "oauth" && (
                <button className="w-full py-3 border-2 border-gray-200 rounded-xl text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                  <div className="w-5 h-5 bg-red-500 rounded text-white text-xs flex items-center justify-center font-bold">
                    G
                  </div>
                  Đăng nhập với Google
                </button>
              )}
              {connType === "api" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Access Token
                    </label>
                    <input
                      type="password"
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              )}
              <button
                onClick={() => setStep(4)}
                disabled={
                  connType === "webhook" && !webhookUrl.trim()
                    ? true
                    : connType === "api" && (!apiKey.trim() || !accessToken.trim())
                    ? true
                    : false
                }
                className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                Tiếp theo <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Step 4 — Đặt tên + Save */}
          {step === 4 && (
            <div>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4"
              >
                <ArrowLeft size={14} /> Quay lại
              </button>
              <p className="text-sm text-gray-500 mb-4">
                Tên này giúp bạn nhận ra Kênh khi soạn bài
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tên Kênh <span className="text-red-500">*</span>
                </label>
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
                  {[`${platformName} chính`, "Shop Cưng", "Kênh cá nhân"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setChannelName(s)}
                      className="text-xs bg-white border border-gray-200 px-2.5 py-1 rounded-lg hover:border-indigo-300 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {saveError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm flex items-center gap-2">
                  <XCircle size={14} /> {saveError}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={!channelName.trim() || saving}
                className="w-full mt-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    Tiếp theo <ChevronRight size={15} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 5 — Test & Done */}
          {step === 5 && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Kênh đã được tạo. Kiểm tra kết nối trước khi sử dụng.
              </p>

              <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2">
                {[
                  { label: "Kênh", value: channelName },
                  {
                    label: "Nền tảng",
                    value: PLATFORMS.find((p) => p.id === selectedPlatform)?.name ?? selectedPlatform,
                  },
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
                className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 mb-3 disabled:opacity-50"
              >
                {testStatus === "testing" ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Đang test...
                  </>
                ) : testStatus === "ok" ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700">
                      {testMessage}
                      {testLatency != null && ` — ${testLatency}ms`}
                    </span>
                  </>
                ) : testStatus === "fail" ? (
                  <>
                    <XCircle size={14} className="text-red-500" />
                    <span className="text-red-600">{testMessage}</span>
                  </>
                ) : (
                  <>
                    <Wifi size={14} /> Test kết nối (khuyên dùng)
                  </>
                )}
              </button>

              <button
                onClick={() => router.push("/channels")}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Xong — Về danh sách Kênh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
