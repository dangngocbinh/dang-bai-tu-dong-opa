"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Upload, Save, AlertTriangle, X, Check, Search, ImageIcon, Clock,
  Loader2, Trash2,
} from "lucide-react";
import PlatformIcon, { PLATFORMS } from "@/components/PlatformIcon";
import { uploadFile, type MediaItem } from "@/lib/upload-client";

type Channel = {
  id: string;
  name: string;
  platform: string;
  connectionType: string;
  status: string;
};

const CHAR_LIMITS: Record<string, number> = {
  x: 280,
  threads: 500,
  linkedin: 3000,
  facebook: 63206,
  instagram: 2200,
  youtube: 5000,
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function NewPostPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [channelSearch, setChannelSearch] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ["channels"],
    queryFn: async () => {
      const res = await fetch("/api/channels");
      const json = await res.json();
      return (json.data ?? []).filter((c: Channel) => c.status !== "inactive");
    },
  });

  const activeChannels = channels;
  const filteredChannels = channelSearch
    ? activeChannels.filter((c) =>
        c.name.toLowerCase().includes(channelSearch.toLowerCase())
      )
    : activeChannels;

  const selectedChannels = activeChannels.filter((c) => selectedIds.includes(c.id));

  function toggleChannel(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const charWarnings = selectedChannels.filter((ch) => {
    const lim = CHAR_LIMITS[ch.platform];
    return lim && content.length > lim;
  });

  // Auto-save draft
  const doSave = useCallback(
    async (currentContent: string, currentMedia: MediaItem[], currentIds: string[]) => {
      setSaveState("saving");
      try {
        const body = {
          content: currentContent,
          mediaUrls: currentMedia,
          channelIds: currentIds,
        };

        let res: Response;
        if (postId) {
          res = await fetch(`/api/posts/${postId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } else {
          res = await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            const json = await res.json();
            setPostId(json.data.id);
          }
        }

        if (res.ok) {
          setSaveState("saved");
          setSavedAt(new Date());
        } else {
          setSaveState("error");
        }
      } catch {
        setSaveState("error");
      }
    },
    [postId]
  );

  // Debounce auto-save on content/channels change
  useEffect(() => {
    if (!content && media.length === 0 && selectedIds.length === 0) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveState("idle");
    autoSaveTimer.current = setTimeout(() => {
      doSave(content, media, selectedIds);
    }, 10_000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [content, media, selectedIds, doSave]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError("");

    const hasVideo = media.some((m) => m.type === "video");
    if (hasVideo) {
      setUploadError("Không thể thêm file khi đã có video");
      return;
    }

    const arr = Array.from(files);
    const isVideo = arr.some((f) => f.type.startsWith("video/"));

    if (isVideo && (media.length > 0 || arr.length > 1)) {
      setUploadError("Video phải upload riêng, không kèm ảnh");
      return;
    }
    if (!isVideo && media.length + arr.length > 10) {
      setUploadError("Tối đa 10 ảnh");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(arr.map(uploadFile));
      setMedia((prev) => [...prev, ...uploaded]);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Upload thất bại");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmitDraft() {
    if (selectedIds.length === 0 && content.trim() === "") {
      setSubmitError("Nhập nội dung hoặc chọn ít nhất 1 Kênh");
      return;
    }
    setSubmitting(true);
    setSubmitError("");

    const body = {
      content,
      mediaUrls: media,
      channelIds: selectedIds,
    };

    let res: Response;
    if (postId) {
      res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    if (res.ok) {
      router.push("/posts");
    } else {
      const json = await res.json();
      setSubmitError(json.error?.message ?? "Lưu thất bại");
      setSubmitting(false);
    }
  }

  function formatSavedAt(d: Date): string {
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── LEFT: Writing area ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-gray-100 bg-white z-10 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-400 min-w-[80px]">
            {saveState === "saving" && (
              <>
                <Loader2 size={11} className="animate-spin" /> Đang lưu...
              </>
            )}
            {saveState === "saved" && savedAt && (
              <>
                <Check size={11} className="text-emerald-500" /> Đã lưu lúc{" "}
                {formatSavedAt(savedAt)}
              </>
            )}
            {saveState === "error" && (
              <span className="text-red-400">Lưu thất bại</span>
            )}
          </div>
          <h1 className="text-sm font-semibold text-gray-700">Soạn bài mới</h1>
          <div className="min-w-[80px]" />
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-2xl space-y-5">
            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Nội dung
                </span>
                <span
                  className={`text-xs ${content.length > 2200 ? "text-red-500" : "text-gray-400"}`}
                >
                  {content.length}
                </span>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Hôm nay bạn muốn chia sẻ gì?"
                rows={8}
                className="w-full text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15 resize-none leading-relaxed transition-colors"
              />
              {charWarnings.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {charWarnings.map((ch) => (
                    <span
                      key={ch.id}
                      className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-lg"
                    >
                      <AlertTriangle size={10} /> {ch.name}: vượt{" "}
                      {CHAR_LIMITS[ch.platform]} ký tự
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Media upload */}
            <div>
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                  isDragging.current
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                } group`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  isDragging.current = true;
                }}
                onDragLeave={() => {
                  isDragging.current = false;
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  isDragging.current = false;
                  handleFiles(e.dataTransfer.files);
                }}
              >
                {uploading ? (
                  <Loader2
                    size={20}
                    className="animate-spin text-indigo-400 mx-auto mb-2"
                  />
                ) : (
                  <Upload
                    size={20}
                    className="text-gray-300 group-hover:text-indigo-400 mx-auto mb-2 transition-colors"
                  />
                )}
                <p className="text-sm text-gray-400">
                  {uploading ? "Đang upload..." : "Kéo thả ảnh / video vào đây"}
                </p>
                <p className="text-xs text-gray-300 mt-0.5">
                  JPG, PNG (10MB) · MP4 (500MB) · tối đa 10 ảnh
                </p>
                {!uploading && (
                  <span className="mt-2 inline-block text-xs text-indigo-500 hover:text-indigo-600 font-medium">
                    Hoặc click để chọn file
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {uploadError && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle size={11} /> {uploadError}
                </p>
              )}

              {/* Media preview */}
              {media.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {media.map((m) => (
                    <div
                      key={m.key}
                      className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                    >
                      {m.type === "image" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.url}
                          alt={m.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <ImageIcon size={20} className="text-gray-400" />
                          <span className="text-xs text-gray-400 mt-1">Video</span>
                        </div>
                      )}
                      <button
                        onClick={() =>
                          setMedia((prev) => prev.filter((x) => x.key !== m.key))
                        }
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedChannels.some((c) => c.platform === "youtube") && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                <AlertTriangle size={13} />
                Kênh YouTube chỉ hỗ trợ video
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Controls panel ── */}
      <div className="w-72 flex-shrink-0 border-l border-gray-100 bg-white flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-4 space-y-5">
          {/* Channel selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Kênh đăng
              </span>
              <Link
                href="/channels/new"
                className="text-xs text-indigo-500 hover:text-indigo-600"
              >
                + Thêm
              </Link>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-4 px-2 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700 mb-2">
                  Bạn chưa có Kênh nào
                </p>
                <Link
                  href="/channels/new"
                  className="text-xs text-indigo-600 font-medium hover:underline"
                >
                  Tạo Kênh trước →
                </Link>
              </div>
            ) : (
              <>
                {activeChannels.length > 4 && (
                  <div className="relative mb-2">
                    <Search
                      size={12}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                      placeholder="Tìm kênh..."
                      className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                )}

                <div className="space-y-0.5">
                  {PLATFORMS.filter((p) =>
                    filteredChannels.some((ch) => ch.platform === p.id)
                  ).map((p) => (
                    <div key={p.id}>
                      <div className="flex items-center gap-1.5 py-1 px-0.5">
                        <PlatformIcon platform={p.id} size={14} />
                        <span className="text-xs text-gray-400 font-medium">
                          {p.name}
                        </span>
                      </div>
                      {filteredChannels
                        .filter((ch) => ch.platform === p.id)
                        .map((ch) => {
                          const on = selectedIds.includes(ch.id);
                          return (
                            <button
                              key={ch.id}
                              onClick={() => toggleChannel(ch.id)}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all mb-0.5 ${
                                on
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "text-gray-600 hover:bg-gray-50"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                                  on
                                    ? "bg-indigo-600"
                                    : "border border-gray-300 bg-white"
                                }`}
                              >
                                {on && <Check size={9} className="text-white" />}
                              </div>
                              <span className="text-xs font-medium truncate">
                                {ch.name}
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  ))}
                </div>

                {selectedChannels.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-1">
                    {selectedChannels.map((ch) => (
                      <span
                        key={ch.id}
                        className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-600 pl-1.5 pr-1 py-0.5 rounded-full"
                      >
                        <PlatformIcon platform={ch.platform} size={12} />
                        {ch.name}
                        <button
                          onClick={() => toggleChannel(ch.id)}
                          className="ml-0.5 text-indigo-300 hover:text-indigo-500"
                        >
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Schedule mode — draft only for POST-001; schedule/now disabled until SCH-001 */}
          <div>
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
              Thời gian đăng
            </span>
            <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 flex items-center gap-2">
              <Clock size={13} className="text-gray-400" />
              Lên lịch đăng bài sẽ sớm ra mắt
            </div>
          </div>

          {/* Mini preview */}
          {selectedChannels.length > 0 && content && (
            <div>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide block mb-2">
                Preview
              </span>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-2.5 border-b border-gray-100 flex items-center gap-2">
                  <PlatformIcon platform={selectedChannels[0].platform} size={24} />
                  <div className="text-xs font-medium text-gray-800">
                    {selectedChannels[0].name}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs text-gray-700 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                    {content}
                  </p>
                  {media.length > 0 && (
                    <div className="mt-2 bg-gray-100 rounded h-12 flex items-center justify-center">
                      <ImageIcon size={14} className="text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="p-4 border-t border-gray-100">
          {submitError && (
            <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
              <AlertTriangle size={11} /> {submitError}
            </p>
          )}
          <button
            onClick={handleSubmitDraft}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-gray-800 hover:bg-gray-900 text-white transition-colors disabled:opacity-50 shadow-sm"
          >
            {submitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {submitting ? "Đang lưu..." : "Lưu nháp"}
          </button>
        </div>
      </div>
    </div>
  );
}
