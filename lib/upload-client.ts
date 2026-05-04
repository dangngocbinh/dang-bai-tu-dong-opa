export type MediaItem = {
  key: string;
  url: string;
  type: "image" | "video";
  size: number;
  name: string;
};

export async function uploadFile(file: File): Promise<MediaItem> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });

  if (!presignRes.ok) {
    const json = await presignRes.json();
    throw new Error(json.error?.message ?? "Không thể upload file");
  }

  const { data } = await presignRes.json();
  const { presignedUrl, key, publicUrl } = data;

  const uploadRes = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error("Upload lên S3 thất bại");
  }

  return {
    key,
    url: publicUrl,
    type: file.type.startsWith("video/") ? "video" : "image",
    size: file.size,
    name: file.name,
  };
}
