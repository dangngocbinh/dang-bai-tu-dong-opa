import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { auth } from "@/auth";
import { ok, err } from "@/lib/response";
import { createPresignedPutUrl } from "@/lib/s3";

const MAX_IMAGE = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO = 500 * 1024 * 1024; // 500 MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

const schema = z.object({
  filename: z.string().min(1),
  contentType: z.string(),
  size: z.number().positive(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err("VALIDATION_ERROR", parsed.error.errors[0].message, 400);
  }

  const { filename, contentType, size } = parsed.data;

  if (!ALLOWED_TYPES.includes(contentType)) {
    return err("INVALID_TYPE", "Định dạng file không được hỗ trợ", 400);
  }

  const isVideo = contentType.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO : MAX_IMAGE;
  if (size > maxSize) {
    return err(
      "FILE_TOO_LARGE",
      isVideo ? "Video tối đa 500MB" : "Ảnh tối đa 10MB",
      400
    );
  }

  const ext = filename.split(".").pop() ?? "bin";
  const key = `uploads/${session.user.id}/${randomUUID()}.${ext}`;

  const presignedUrl = await createPresignedPutUrl(key, contentType);
  const publicUrl = `${process.env.AWS_S3_PUBLIC_URL}/${key}`;

  return ok({ presignedUrl, key, publicUrl });
}
