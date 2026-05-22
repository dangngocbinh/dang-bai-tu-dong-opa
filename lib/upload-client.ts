export type MediaItem = {
  key: string;
  url: string;
  type: "image" | "video";
  size: number;
  name: string;
};

export async function uploadFile(file: File): Promise<MediaItem> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.error?.message ?? "Không thể upload file");
  }

  const { data } = await res.json();
  return data as MediaItem;
}
