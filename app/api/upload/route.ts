import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { ok, err } from "@/lib/response";
import { s3Client } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 500 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return err("UNAUTHORIZED", "Chưa đăng nhập", 401);

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return err("MISSING_FILE", "Không có file", 400);
  }

  const { name, type, size } = file;

  if (!ALLOWED_TYPES.includes(type)) {
    return err("INVALID_TYPE", "Định dạng file không được hỗ trợ", 400);
  }

  const isVideo = type.startsWith("video/");
  const maxSize = isVideo ? MAX_VIDEO : MAX_IMAGE;
  if (size > maxSize) {
    return err(
      "FILE_TOO_LARGE",
      isVideo ? "Video tối đa 500MB" : "Ảnh tối đa 10MB",
      400
    );
  }

  const ext = name.split(".").pop() ?? "bin";
  const key = `uploads/${session.user.id}/${randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: type,
    })
  );

  const publicUrl = `${process.env.AWS_S3_PUBLIC_URL}/${key}`;

  return ok({
    key,
    url: publicUrl,
    type: isVideo ? "video" : "image",
    size,
    name,
  });
}
