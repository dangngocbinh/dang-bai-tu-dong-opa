# TDD — OPA (Open Publishing Assistant)

> Technical Design Document — dựa trên PRD v4.1
> Các quyết định kỹ thuật đã được phỏng vấn và chốt ngày 2026-04-17.

---

## Mục lục

0. [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
1. [Tech Stack & Quyết định kỹ thuật](#1-tech-stack--quyết-định-kỹ-thuật)
2. [Database Schema](#2-database-schema)
3. [API Routes](#3-api-routes)
4. [Data Flow Diagrams](#4-data-flow-diagrams)
5. [Frontend Architecture](#5-frontend-architecture)
6. [Implementation Notes per Feature](#6-implementation-notes-per-feature)
7. [Environment Variables](#7-environment-variables)
8. [Build Order](#8-build-order)

---

## Kiến trúc tổng quan

Sơ đồ dưới đây tóm tắt các thành phần chính, ranh giới tin cậy và các luồng giao tiếp quan trọng nhất của OPA. Đọc cùng [1. Tech Stack](#1-tech-stack--quyết-định-kỹ-thuật) và [4. Data Flow Diagrams](#4-data-flow-diagrams) để thấy bức tranh đầy đủ.

```mermaid
flowchart TB
    subgraph Browser["Client Browser"]
        UI["Next.js UI<br/>React · Tailwind · FullCalendar"]
        ES["EventSource (SSE)"]
    end

    subgraph VPS["VPS — chost.mecode.pro"]
        subgraph App["Next.js App (App Router)"]
            MW["Middleware<br/>JWT · role · user.status"]
            API["API Routes<br/>auth · posts · channels · upload<br/>callback · sse · admin · telegram · cron"]
            SSEMap[("SSE Map in-memory<br/>userId → writer")]
            Crypto["lib/crypto.ts<br/>AES-256-GCM"]
        end
        Cron["System cron — mỗi 1 phút<br/>POST /api/cron/process-scheduled"]
    end

    subgraph Storage["Storage"]
        DB[("PostgreSQL<br/>users · channels · posts<br/>post_channels · reset_tokens")]
        S3[("AWS S3<br/>uploads/{userId}/...")]
    end

    subgraph Ext["External Services"]
        Make["Make.com<br/>Facebook · Instagram · LinkedIn"]
        Direct["Direct APIs<br/>Threads · X · YouTube"]
        TG["Telegram Bot API"]
        SMTP["SMTP Server"]
    end

    UI -->|HTTPS + JWT cookie| MW
    MW --> API
    ES -.->|text/event-stream| API
    API <--> SSEMap
    API <--> DB
    API --> Crypto
    Crypto --> DB

    API -->|presigned PUT URL| S3
    UI -.->|PUT file trực tiếp| S3

    Cron -->|header X-Cron-Secret| API
    API -->|webhook payload| Make
    API -->|direct call + credentials| Direct
    Make -->|callback?token=...| API
    API -->|notify success/fail| TG
    TG -->|/start webhook| API
    API -->|reset password email| SMTP
```

### Ghi chú đọc sơ đồ

- **Ranh giới tin cậy** nằm giữa `VPS` và `External Services`: mọi traffic đi qua đó phải ký/xác thực được — callback token per-row cho Make.com, `X-Cron-Secret` cho cron, API key hoặc OAuth cho Direct APIs, signature check cho Telegram webhook.
- **SSE Map là in-memory**, chỉ đúng khi Next.js chạy 1 instance. Nếu scale horizontal sau này (PM2 cluster, multi-pod), phải chuyển sang Redis pub/sub — cần thiết kế sẵn interface để thay thế.
- **Media upload không đi qua Next.js**: client lấy presigned URL rồi PUT thẳng vào S3, giảm tải băng thông VPS và né giới hạn body size của Next.js.
- **Hai đường public vào `API`** là Make.com callback và Telegram webhook — đây là 2 endpoint không có JWT session, bắt buộc xác thực bằng token hoặc signature, và phải rate-limit riêng.
- **Cron là thành phần duy nhất khởi xướng outbound call tới Make.com/Direct APIs** — khi user submit bài, Next.js chỉ ghi DB rồi đợi cron claim (`SELECT FOR UPDATE SKIP LOCKED`); điều này giúp retry/timeout tập trung ở một nơi thay vì rải rác trong request handler.
- **`Crypto` nằm giữa `API` và `DB`** trên mọi đường đọc/ghi `channels.credentials`: đây là điểm mà bug encryption (IV reuse, auth tag validation sai) sẽ gây rò credentials — cần unit test kỹ module này.

---

## 1. Tech Stack & Quyết định kỹ thuật

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, routing, API routes dùng chung repo |
| Styling | Tailwind CSS | Nhanh, không cần design system |
| Database | PostgreSQL (self-hosted VPS) | Full control, không vendor lock-in |
| ORM | Prisma | Type-safe, migration tốt, AI tools biết rõ |
| Auth | NextAuth.js v5 — **JWT session** | Đơn giản, không cần bảng sessions |
| File storage | AWS S3 — **Presigned URL** | Client upload thẳng, không qua server |
| Scheduling | **Cron polling 1 phút** + `SELECT FOR UPDATE SKIP LOCKED` | Không cần Redis, đủ cho MVP |
| Calendar UI | **FullCalendar** (React) | Built-in drag-drop, external events |
| Real-time | **Server-Sent Events (SSE)** | Push trạng thái bài đăng về client |
| Callback security | **Token ngẫu nhiên per-bài** trong URL | Không cần config phía Make.com |
| Job queue | Không dùng — cron + Postgres đủ | Tránh thêm Redis infra |
| Notifications | Telegram Bot API | Đơn giản, không cần email server |
| Hosting | VPS (chost.mecode.pro) | Self-hosted, chi phí thấp |

---

## 2. Database Schema

### Tổng quan quan hệ

```
users
  ├── channels (1:N)
  ├── posts (1:N)
  └── password_reset_tokens (1:N)

posts
  └── post_channels (1:N) ←→ channels (N:1)
```

---

### 2.1 Bảng `users`

```sql
CREATE TABLE users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       TEXT NOT NULL,
  display_name        VARCHAR(100),
  role                VARCHAR(20) NOT NULL DEFAULT 'user',    -- 'user' | 'admin'
  status              VARCHAR(20) NOT NULL DEFAULT 'active',  -- 'active' | 'inactive'
  timezone            VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  telegram_chat_id    VARCHAR(50),
  telegram_settings   JSONB NOT NULL DEFAULT '{
    "notify_success": true,
    "notify_fail": true,
    "daily_report": true,
    "report_time": "22:00"
  }',
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

**Ghi chú:**
- `role`: chỉ có 2 giá trị `user` và `admin` — không cần ENUM để dễ migrate sau
- `telegram_settings`: JSONB để tránh tạo nhiều cột boolean
- `status = inactive`: user bị admin khoá — không đăng nhập được, bài scheduled không chạy

---

### 2.2 Bảng `password_reset_tokens`

```sql
CREATE TABLE password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(64) UNIQUE NOT NULL,  -- random hex 32 bytes
  expires_at  TIMESTAMPTZ NOT NULL,         -- NOW() + 15 minutes
  used_at     TIMESTAMPTZ,                  -- NULL = chưa dùng
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prt_token ON password_reset_tokens(token);
CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
```

**Ghi chú:**
- Khi tạo token mới → invalidate token cũ của cùng user bằng cách set `used_at = NOW()`
- Token hết hạn sau 15 phút (`expires_at`)
- Kiểm tra hợp lệ: `used_at IS NULL AND expires_at > NOW()`

---

### 2.3 Bảng `channels`

```sql
CREATE TABLE channels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  platform         VARCHAR(30) NOT NULL,   -- 'facebook'|'instagram'|'linkedin'|'youtube'|'threads'|'x'
  connection_type  VARCHAR(20) NOT NULL,   -- 'webhook'|'api'|'oauth'
  webhook_url      TEXT,                   -- chỉ dùng khi connection_type = 'webhook'
  credentials      JSONB,                  -- encrypted ở app layer (AES-256)
                                           -- webhook: null
                                           -- api: {api_key, access_token, api_secret?}
                                           -- oauth: {access_token, refresh_token, expires_at}
  status           VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active'|'expired'|'inactive'
  last_tested_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_channel_name_per_user UNIQUE (user_id, name)
);

CREATE INDEX idx_channels_user_id ON channels(user_id);
CREATE INDEX idx_channels_status ON channels(status);
CREATE INDEX idx_channels_platform ON channels(platform);
```

**Ghi chú:**
- `credentials` lưu encrypted ở **application layer** (không dùng pgcrypto) — dùng `crypto` module của Node với AES-256-GCM, key lấy từ env var `ENCRYPTION_KEY`
- `CONSTRAINT uq_channel_name_per_user`: tên Kênh phải unique trong phạm vi 1 user
- Không lưu `total_posts_count` trực tiếp — tính bằng query từ `post_channels` để tránh inconsistency

---

### 2.4 Bảng `posts`

```sql
CREATE TABLE posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL DEFAULT '',
  media_urls    JSONB NOT NULL DEFAULT '[]',  -- [{url, type, size, key}]
  scheduled_at  TIMESTAMPTZ,                  -- NULL = draft
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',
                -- 'draft' | 'scheduled' | 'processing' | 'published' | 'failed'
                -- Status tổng: tính từ post_channels
                --   published = TẤT CẢ channels published
                --   failed    = ÍT NHẤT 1 channel failed, không có pending
                --   processing = ít nhất 1 channel đang xử lý
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_scheduled_at ON posts(scheduled_at)
  WHERE status = 'scheduled';  -- partial index — chỉ index bài chờ đăng
```

**Ghi chú về `media_urls` JSONB structure:**
```json
[
  {
    "key": "uploads/user-uuid/filename.jpg",
    "url": "https://bucket.s3.amazonaws.com/...",
    "type": "image",
    "size": 2048576,
    "name": "filename.jpg"
  }
]
```

**Ghi chú về `status` tổng:**
- Được tính toán và cập nhật sau mỗi lần `post_channels` thay đổi trạng thái
- Logic: nếu có bất kỳ channel nào `processing` → `processing`; nếu tất cả `published` → `published`; nếu tất cả `published` hoặc `failed` (và ít nhất 1 `failed`) → `failed`

---

### 2.5 Bảng `post_channels` ⭐ (junction table chính)

```sql
CREATE TABLE post_channels (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id          UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  channel_id       UUID NOT NULL REFERENCES channels(id) ON DELETE RESTRICT,
                   -- RESTRICT: không cho xóa channel nếu có post scheduled
                   -- (phải chuyển sang failed trước)
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
                   -- 'pending' | 'processing' | 'published' | 'failed'
  callback_token   VARCHAR(64) UNIQUE,     -- token để verify Make.com callback
  published_url    TEXT,                   -- URL bài đã đăng trên nền tảng
  error_message    TEXT,                   -- lý do lỗi nếu failed
  retry_count      INTEGER NOT NULL DEFAULT 0,
  locked_at        TIMESTAMPTZ,            -- cron job lock — tránh double-process
  published_at     TIMESTAMPTZ,
  timeline         JSONB NOT NULL DEFAULT '[]',
                   -- [{event, at, note}] — audit trail
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_post_channel UNIQUE (post_id, channel_id)
);

CREATE INDEX idx_pc_post_id ON post_channels(post_id);
CREATE INDEX idx_pc_channel_id ON post_channels(channel_id);
CREATE INDEX idx_pc_status ON post_channels(status);
CREATE INDEX idx_pc_callback_token ON post_channels(callback_token)
  WHERE callback_token IS NOT NULL;

-- Index cho cron job: tìm bài cần đăng
CREATE INDEX idx_pc_pending_scheduled ON post_channels(post_id)
  WHERE status = 'pending' AND locked_at IS NULL;
```

**Ghi chú về `timeline` JSONB structure:**
```json
[
  {"event": "scheduled",   "at": "2026-04-17T10:00:00Z", "note": "Lên lịch lúc 20:00"},
  {"event": "processing",  "at": "2026-04-17T13:00:00Z", "note": "Cron job xử lý"},
  {"event": "webhook_sent","at": "2026-04-17T13:00:01Z", "note": "Đã gọi Make.com webhook"},
  {"event": "published",   "at": "2026-04-17T13:00:05Z", "note": "Make.com callback OK"},
  {"event": "reschedule",  "at": "2026-04-17T09:00:00Z", "note": "Reschedule từ 2026-04-17 sang 2026-04-18"}
]
```

**Ghi chú về `locked_at`:**
- Cron job dùng `SELECT ... FOR UPDATE SKIP LOCKED` để claim row
- Set `locked_at = NOW()` khi bắt đầu xử lý
- Sau 10 phút nếu không có callback → cron tiếp theo sẽ detect `locked_at < NOW() - INTERVAL '10 minutes'` và đánh dấu `failed`

---

### 2.6 Schema tóm tắt (Prisma-style)

```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  passwordHash      String
  displayName       String?
  role              String    @default("user")
  status            String    @default("active")
  timezone          String    @default("Asia/Ho_Chi_Minh")
  telegramChatId    String?
  telegramSettings  Json      @default("{...}")
  lastLoginAt       DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  channels          Channel[]
  posts             Post[]
  resetTokens       PasswordResetToken[]
}

model Channel {
  id              String    @id @default(uuid())
  userId          String
  name            String
  platform        String
  connectionType  String
  webhookUrl      String?
  credentials     Json?
  status          String    @default("active")
  lastTestedAt    DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User          @relation(fields: [userId], references: [id])
  postChannels    PostChannel[]

  @@unique([userId, name])
}

model Post {
  id           String    @id @default(uuid())
  userId       String
  content      String    @default("")
  mediaUrls    Json      @default("[]")
  scheduledAt  DateTime?
  status       String    @default("draft")
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  user         User          @relation(fields: [userId], references: [id])
  postChannels PostChannel[]
}

model PostChannel {
  id             String    @id @default(uuid())
  postId         String
  channelId      String
  status         String    @default("pending")
  callbackToken  String?   @unique
  publishedUrl   String?
  errorMessage   String?
  retryCount     Int       @default(0)
  lockedAt       DateTime?
  publishedAt    DateTime?
  timeline       Json      @default("[]")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  post           Post    @relation(fields: [postId], references: [id])
  channel        Channel @relation(fields: [channelId], references: [id])

  @@unique([postId, channelId])
}

model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user      User @relation(fields: [userId], references: [id])
}
```

---

## 3. API Routes

### Convention chung

- Base path: `/api/`
- Auth: tất cả route (trừ auth + setup + callback) yêu cầu JWT session hợp lệ
- Response format:
```json
{ "data": {...}, "error": null }
{ "data": null, "error": {"code": "NOT_FOUND", "message": "..."} }
```
- HTTP status codes chuẩn: 200, 201, 400, 401, 403, 404, 409, 500

---

### 3.1 Auth Routes

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Đăng ký tài khoản mới | ❌ |
| POST | `/api/auth/[...nextauth]` | NextAuth handler (login/logout/session) | ❌ |
| POST | `/api/auth/forgot-password` | Gửi email reset password | ❌ |
| POST | `/api/auth/reset-password` | Đặt lại password bằng token | ❌ |
| POST | `/api/auth/change-password` | Đổi password (đang đăng nhập) | ✅ |

**POST `/api/auth/register`**
```typescript
// Request
{ email: string, password: string }
// Validation: email hợp lệ, password >= 8 ký tự
// Response 201: { data: { id, email, createdAt } }
// Errors: 409 email đã tồn tại | 400 validation fail
```

**POST `/api/auth/forgot-password`**
```typescript
// Request: { email: string }
// Luôn trả về 200 dù email có tồn tại hay không (tránh enumeration attack)
// Response 200: { data: { message: "Đã gửi email nếu tài khoản tồn tại" } }
// Side effect: nếu email tồn tại → tạo token 15 phút, gửi email reset
```

**POST `/api/auth/reset-password`**
```typescript
// Request: { token: string, password: string }
// Response 200: { data: { message: "Đặt lại mật khẩu thành công" } }
// Errors: 400 token hết hạn hoặc đã dùng | 400 password không hợp lệ
```

---

### 3.2 Setup Routes

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/setup/status` | Kiểm tra hệ thống đã có user chưa | ❌ |
| POST | `/api/setup` | Tạo admin đầu tiên | ❌ |

**Logic:**
- `GET /api/setup/status` → `{ hasUsers: boolean }`
- `POST /api/setup` → chỉ hoạt động khi `hasUsers = false`; sau khi tạo xong trả 404 mãi mãi
- Middleware redirect: nếu `hasUsers = false` → mọi route redirect về `/setup`

---

### 3.3 Channel Routes

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/channels` | Lấy danh sách kênh của user | ✅ |
| POST | `/api/channels` | Tạo kênh mới | ✅ |
| GET | `/api/channels/:id` | Chi tiết 1 kênh | ✅ |
| PATCH | `/api/channels/:id` | Cập nhật tên/credential/status | ✅ |
| DELETE | `/api/channels/:id` | Xóa kênh | ✅ |
| POST | `/api/channels/:id/test` | Test kết nối | ✅ |

**DELETE `/api/channels/:id` — Logic quan trọng:**
```typescript
// 1. Tìm tất cả post_channels có status 'pending' của channel này
// 2. Chuyển chúng sang 'failed', ghi timeline
// 3. Cập nhật status tổng của posts liên quan
// 4. Xóa channel
// Response: { data: { message: "Đã xóa kênh và hủy X bài đang lên lịch" } }
```

**POST `/api/channels/:id/test` — Response:**
```typescript
{
  data: {
    success: boolean,
    responseTime: number, // ms
    error?: string
  }
}
// webhook: gửi POST test payload, đợi 30s
// api: gọi /profile hoặc /me endpoint
// oauth (youtube): verify + refresh access_token nếu cần
```

---

### 3.4 Post Routes

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/posts` | Danh sách bài (filter/search/paginate) | ✅ |
| POST | `/api/posts` | Tạo bài mới | ✅ |
| GET | `/api/posts/:id` | Chi tiết bài + post_channels + timeline | ✅ |
| PATCH | `/api/posts/:id` | Cập nhật (chỉ khi draft/scheduled) | ✅ |
| DELETE | `/api/posts/:id` | Xóa bài | ✅ |
| POST | `/api/posts/:id/publish-now` | Đăng ngay lập tức | ✅ |
| POST | `/api/posts/:id/duplicate` | Nhân bản bài → draft mới | ✅ |
| POST | `/api/posts/:id/retry` | Retry các channel bị failed | ✅ |

**GET `/api/posts` — Query params:**
```
?status=scheduled
&platform=facebook
&channelId=uuid1,uuid2
&from=2026-04-01&to=2026-04-30
&search=keyword
&sort=scheduledAt&order=desc
&page=1&limit=20
```

**POST `/api/posts` — Request:**
```typescript
{
  content: string,
  mediaUrls: Array<{ key, url, type, size, name }>,
  channelIds: string[],  // ít nhất 1
  scheduledAt?: string   // ISO 8601; null = lưu draft
}
// Logic: tạo post + tạo post_channel cho mỗi channelId
// scheduledAt có → status = 'scheduled'; không có → 'draft'
```

**POST `/api/posts/:id/retry`**
```typescript
// Chỉ retry post_channels có status = 'failed' VÀ retryCount < 3
// Response: { data: { retriedChannels: number } }
// Error 400: đã retry 3 lần → yêu cầu kiểm tra kết nối
```

---

### 3.5 Upload Routes

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/upload/presign` | Lấy presigned URL upload S3 | ✅ |

**POST `/api/upload/presign`**
```typescript
// Request: { filename: string, contentType: string, size: number }
// Validation: image <= 10MB | video <= 500MB | contentType whitelist
// Response 200:
{
  data: {
    presignedUrl: string,  // PUT URL, hết hạn sau 15 phút
    key: string,           // uploads/{userId}/{uuid}/{filename}
    publicUrl: string      // URL công khai sau khi upload
  }
}
```

---

### 3.6 Callback Route (Make.com → OPA)

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/posts/callback?token={token}` | Make.com báo kết quả | Token |

```typescript
// Request body từ Make.com:
{ status: 'published' | 'failed', publishedUrl?: string, errorMessage?: string }

// Logic:
// 1. Tìm post_channel theo callbackToken
// 2. Verify token tồn tại + chưa dùng
// 3. Cập nhật status + publishedUrl/errorMessage
// 4. Ghi timeline event
// 5. Invalidate callbackToken (set NULL)
// 6. Cập nhật status tổng của post
// 7. Gửi Telegram notification
// 8. Trigger SSE event cho user tương ứng

// Luôn trả 200 để Make.com không retry
{ data: { received: true } }
```

---

### 3.7 SSE Route (Real-time)

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/sse` | EventSource endpoint | ✅ |

```typescript
// Response: text/event-stream
// Events:

// 1. post_status_changed
event: post_status_changed
data: { "postId": "uuid", "status": "published", "channels": [...] }

// 2. channel_expired
event: channel_expired
data: { "channelId": "uuid", "channelName": "Shop Cưng" }

// 3. heartbeat (mỗi 30s để giữ connection)
event: heartbeat
data: { "ts": 1713340800 }

// Implementation notes:
// - Next.js Route Handler + ReadableStream
// - Lưu connections trong Map<userId, WritableStreamDefaultWriter> (in-memory, single instance)
// - Cleanup khi client disconnect (request.signal.addEventListener('abort'))
```

---

### 3.8 Admin Routes

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| GET | `/api/admin/users` | Danh sách users | Admin |
| GET | `/api/admin/users/:id` | Chi tiết user | Admin |
| PATCH | `/api/admin/users/:id` | Khoá/mở khoá, đổi role | Admin |
| POST | `/api/admin/users/:id/reset-password` | Reset password | Admin |
| GET | `/api/admin/dashboard` | Thống kê hệ thống | Admin |

**GET `/api/admin/dashboard` — Response:**
```typescript
{
  data: {
    users: { total: number, newLast7Days: number },
    posts: {
      today: { total, success, failed },
      last7Days: { total, success, failed }
    },
    successRateByPlatform: { facebook: 95.2, instagram: 91.0, ... },
    recentFailedPosts: [{ postId, userId, userEmail, platform, channelName, errorMessage, failedAt }]
  }
}
```

---

### 3.9 Telegram + Settings Routes

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/telegram/test` | Gửi test message | ✅ |
| POST | `/api/telegram/webhook` | Nhận `/start` từ Bot | ❌ |
| GET | `/api/settings` | Lấy settings | ✅ |
| PATCH | `/api/settings` | Cập nhật settings | ✅ |

---

### 3.10 Cron Route (internal)

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/cron/process-scheduled` | Xử lý bài đến giờ đăng | Secret header |

```typescript
// Auth: header X-Cron-Secret = CRON_SECRET env var
// Gọi bởi: cron job trên VPS mỗi 1 phút (*/1 * * * *)

// Bước 1 — Xử lý bài mới:
SELECT pc.* FROM post_channels pc
JOIN posts p ON p.id = pc.post_id
JOIN channels c ON c.id = pc.channel_id
JOIN users u ON u.id = p.user_id
WHERE pc.status = 'pending'
  AND pc.locked_at IS NULL
  AND p.scheduled_at <= NOW()
  AND p.status = 'scheduled'
  AND c.status = 'active'
  AND u.status = 'active'
FOR UPDATE SKIP LOCKED
LIMIT 50;

// Bước 2 — Timeout detection:
UPDATE post_channels
SET status = 'failed', error_message = 'Timeout sau 10 phút'
WHERE status = 'processing'
  AND locked_at < NOW() - INTERVAL '10 minutes';
```

---

## 4. Data Flow Diagrams

### 4.1 Flow: Đăng bài qua Make.com (FB / IG / LinkedIn)

```
User soạn bài → chọn Kênh → đặt giờ
        │
        ▼
POST /api/posts
  → tạo post (status: scheduled)
  → tạo post_channel (status: pending, callbackToken: uuid)
        │
        ▼ (đến giờ hẹn)
Cron job chạy mỗi 1 phút
  → SELECT FOR UPDATE SKIP LOCKED
  → set locked_at = NOW()
  → set status = processing
  → ghi timeline 'processing'
        │
        ▼
OPA gọi POST {webhookUrl}
  payload: {
    content, mediaUrls,
    platform, channelName,
    callbackUrl: "/api/posts/callback?token={callbackToken}"
  }
        │
        ▼
Make.com nhận webhook
  → gọi FB/IG/LinkedIn API để đăng bài
        │
        ├── Thành công
        │     → Make.com POST /api/posts/callback?token=xxx
        │       body: { status: "published", publishedUrl: "..." }
        │     → OPA cập nhật post_channel: published
        │     → cập nhật post status tổng
        │     → gửi Telegram ✅
        │     → trigger SSE event
        │
        └── Thất bại
              → Make.com POST /api/posts/callback?token=xxx
                body: { status: "failed", errorMessage: "..." }
              → OPA cập nhật post_channel: failed
              → gửi Telegram ❌
              → trigger SSE event
```

---

### 4.2 Flow: Đăng bài Direct API (Threads / X.com)

```
Cron job xử lý post_channel
        │
        ▼
OPA gọi trực tiếp API nền tảng
  (Threads Graph API / X API v2)
  dùng credentials đã lưu (encrypted)
        │
        ├── Thành công → cập nhật published ngay, không cần callback
        │
        └── 401 Unauthorized
              → credentials hết hạn
              → set channel.status = 'expired'
              → set post_channel.status = 'failed'
              → gửi Telegram: "Credential hết hạn — cần cập nhật"
```

---

### 4.3 Flow: Upload File (Presigned URL)

```
Client chọn file
        │
        ▼
POST /api/upload/presign
  { filename, contentType, size }
        │
        ▼
Server validate + tạo S3 presigned PUT URL
  key = uploads/{userId}/{uuid}/{filename}
        │
        ▼
Client PUT file thẳng lên S3
  (không qua server OPA)
        │
        ▼
Client nhận 200 từ S3
  → lưu { key, publicUrl } vào state
  → khi submit bài: gửi mediaUrls[] có chứa key + publicUrl
```

---

### 4.4 Flow: SSE Real-time

```
Client mở trang Posts/Dashboard
        │
        ▼
Browser tạo EventSource("/api/sse")
        │
        ▼
Server lưu connection vào Map<userId, writer>
        │
        ▼ (khi callback route nhận kết quả)
/api/posts/callback xử lý xong
        │
        ▼
Tìm writer theo userId trong Map
  → writer.write("event: post_status_changed\ndata: {...}\n\n")
        │
        ▼
Browser nhận event
  → React Query invalidate query 'posts'
  → UI cập nhật card bài tự động
```

---

### 4.5 Flow: First-run Setup

```
Request bất kỳ đến server
        │
        ▼
Middleware kiểm tra: có user nào trong DB chưa?
        │
        ├── Chưa có → redirect toàn bộ về /setup
        │
        └── Đã có → tiếp tục bình thường
                (route /setup trả 404)
```

---

## 5. Frontend Architecture

### 5.1 Cấu trúc thư mục (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   └── reset-password/page.tsx
├── (app)/                          ← protected routes
│   ├── layout.tsx                  ← sidebar + SSE connection
│   ├── dashboard/page.tsx
│   ├── posts/
│   │   ├── page.tsx                ← danh sách bài
│   │   ├── new/page.tsx            ← soạn bài mới
│   │   └── [id]/page.tsx           ← chi tiết bài
│   ├── calendar/page.tsx           ← FullCalendar + sidebar drafts
│   └── channels/
│       ├── page.tsx                ← danh sách kênh
│       └── new/page.tsx            ← wizard thêm kênh
├── (admin)/                        ← admin-only routes
│   ├── layout.tsx                  ← kiểm tra role admin
│   ├── admin/dashboard/page.tsx
│   └── admin/users/
│       ├── page.tsx
│       └── [id]/page.tsx
├── setup/page.tsx                  ← first-run setup
└── api/                            ← tất cả API routes ở đây
```

---

### 5.2 State Management

**Không dùng Redux / Zustand toàn cục.** Dùng:
- **React Query (TanStack Query)** — server state: fetch, cache, invalidate
- **React `useState` / `useReducer`** — local UI state (form, modal open/close)
- **URL search params** — filter/search state (bookmark được)

```typescript
// Ví dụ: posts list với filter
const { data, isLoading } = useQuery({
  queryKey: ['posts', filters],
  queryFn: () => fetchPosts(filters),
  refetchOnWindowFocus: true,
})

// SSE hook — đặt trong (app)/layout.tsx
useSSE({
  onPostStatusChanged: (event) => {
    queryClient.invalidateQueries({ queryKey: ['posts'] })
    queryClient.invalidateQueries({ queryKey: ['post', event.postId] })
  }
})
```

---

### 5.3 Các component chính

| Component | Vị trí | Mô tả |
|---|---|---|
| `PostEditor` | `components/posts/PostEditor.tsx` | Editor soạn bài: text + media + channel picker |
| `ChannelPicker` | `components/posts/ChannelPicker.tsx` | Chọn Kênh, group theo platform, search |
| `PostPreview` | `components/posts/PostPreview.tsx` | Preview mock UI từng nền tảng |
| `CalendarView` | `components/calendar/CalendarView.tsx` | FullCalendar wrapper, xử lý drag events |
| `DraftSidebar` | `components/calendar/DraftSidebar.tsx` | Panel bài draft bên phải calendar |
| `PostPopupEditor` | `components/calendar/PostPopupEditor.tsx` | Popup overlay edit bài trên calendar |
| `ChannelWizard` | `components/channels/ChannelWizard.tsx` | Wizard 5 bước thêm kênh |
| `SSEProvider` | `components/providers/SSEProvider.tsx` | Context + EventSource lifecycle |
| `TelegramConnect` | `components/settings/TelegramConnect.tsx` | Flow kết nối Telegram Bot |

---

### 5.4 Calendar — Chi tiết kỹ thuật (FullCalendar)

```typescript
// Cấu hình FullCalendar
<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
  initialView="dayGridMonth"
  editable={true}          // cho drag bài trên calendar
  droppable={true}         // nhận external drag từ DraftSidebar
  eventDrop={handleEventDrop}       // drag giữa các ngày
  drop={handleExternalDrop}         // drag từ sidebar vào
  eventClick={handleEventClick}     // mở PostPopupEditor
  events={scheduledPosts}
/>

// DraftSidebar: dùng @fullcalendar/interaction Draggable
// để mark các element là draggable external events
useEffect(() => {
  new Draggable(sidebarRef.current, {
    itemSelector: '.draft-card',
    eventData: (el) => ({ id: el.dataset.postId, title: el.dataset.title })
  })
}, [])
```

**PostPopupEditor — không rời trang:**
- Dùng `Dialog` (Radix UI / shadcn) render as overlay
- URL **không thay đổi** khi mở/đóng
- State quản lý bằng `useState` trong `CalendarView`
- Khi lưu: gọi `PATCH /api/posts/:id` → invalidate React Query → FullCalendar re-render events

---

## 6. Implementation Notes per Feature

### Feature 0: Auth

**Thứ tự build:**
1. Setup NextAuth.js với Credentials provider + JWT
2. Tạo `POST /api/auth/register`
3. Tạo middleware kiểm tra session
4. Tạo forgot/reset password flow
5. Tạo `/setup` route + middleware first-run

**Gotchas:**
- NextAuth v5 (Auth.js) có breaking changes so với v4 — dùng đúng docs v5
- `NEXTAUTH_SECRET` bắt buộc có trong production
- Middleware Next.js chạy trên Edge Runtime — không dùng Prisma trực tiếp; gọi API route để check `hasUsers`
- Email reset password: dùng Nodemailer với SMTP thay vì dịch vụ ngoài (đơn giản hơn cho MVP)

---

### Feature 1: Soạn bài

**Thứ tự build:**
1. `PostEditor` component với textarea + channel picker
2. Upload flow: presign → PUT S3 → lưu key
3. Auto-save draft mỗi 10s (debounce `PATCH /api/posts/:id`)
4. Preview panel (mock UI đơn giản cho từng platform)

**Gotchas:**
- Auto-save cần debounce 10s từ lần thay đổi cuối, không phải interval cứng
- Media upload: track upload progress bằng `XMLHttpRequest` (fetch không hỗ trợ progress)
- Channel picker: group theo platform, search client-side (không cần server search nếu < 50 kênh)
- Validate caption length client-side: X.com 280, Threads 500, LinkedIn 3000

---

### Feature 2: Lịch & Drag-drop

**Thứ tự build:**
1. Calendar view cơ bản với FullCalendar (hiện scheduled posts)
2. Draft sidebar bên phải
3. Drag từ sidebar → calendar (external drop)
4. Drag giữa các ngày (event drop)
5. PostPopupEditor overlay
6. Drag ngược calendar → sidebar (huỷ lịch)

**Gotchas:**
- FullCalendar cần cài đủ packages: `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`
- `Draggable` từ `@fullcalendar/interaction` cần gắn vào DOM element thật (không phải React virtual DOM) — dùng `useRef` + `useEffect`
- Khi drop vào ngày quá khứ: check trong `eventDrop` callback, gọi `revert()` nếu invalid
- PostPopupEditor: dùng `stopPropagation` để tránh click event bubble lên calendar

---

### Feature 3: Theo dõi bài đăng

**Thứ tự build:**
1. Posts list page với filter URL params
2. Post detail page với timeline
3. Retry button logic
4. SSE integration để cập nhật trạng thái real-time

**Gotchas:**
- Filter state phải sync với URL params để bookmark được
- Timeline render: sort theo `at` timestamp, format giờ theo timezone user
- Retry: check `retryCount < 3` ở cả client (disable button) và server (validate)

---

### Feature 4: Quản lý Kênh

**Thứ tự build:**
1. Channel list page
2. ChannelWizard 5 bước
3. Test connection logic (webhook + API)
4. Edit/delete channel
5. Expired channel banner trên dashboard

**Gotchas:**
- Credentials encryption: tạo `lib/crypto.ts` với AES-256-GCM, dùng cho tất cả read/write credentials
- Webhook test: cần Make.com Scenario trả về response trong 30s — nếu timeout → fail
- YouTube OAuth: cần Google OAuth App được duyệt — phức tạp nhất, build sau cùng
- Khi xóa channel: dùng transaction DB để update post_channels + xóa channel atomically

---

### Feature 5: Telegram

**Thứ tự build:**
1. Telegram Bot: tạo bot qua @BotFather, lấy token
2. Webhook endpoint nhận `/start` command → lưu chat_id
3. Flow kết nối trong Settings UI
4. Gửi notification sau callback
5. Daily report cron (chạy cùng cron server, check giờ theo user timezone)

**Gotchas:**
- `chat_id` âm = group chat, dương = personal chat — chỉ support personal
- Telegram Bot Webhook URL phải là HTTPS public — không test được localhost; dùng ngrok khi dev
- Daily report: cron chạy mỗi phút, check `telegram_settings.report_time` của từng user → gửi đúng giờ theo timezone

---

### Feature Admin

**Thứ tự build:**
1. Admin middleware: kiểm tra `role = 'admin'`
2. User list + detail
3. Lock/unlock user → invalidate sessions (với JWT: thêm `blockedAt` check vào middleware)
4. Dashboard thống kê

**Gotchas:**
- JWT không thể revoke ngay — để kick user bị khoá: thêm check `user.status` vào middleware mỗi request (query DB một lần)
- Admin tự khoá mình: check `session.user.id !== targetUserId` trước khi cho phép khoá

---

## 7. Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/opa"

# NextAuth
NEXTAUTH_SECRET="random-32-char-string"
NEXTAUTH_URL="https://opa.mecode.pro"

# AWS S3
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="ap-southeast-1"
AWS_S3_BUCKET="opa-media"
AWS_S3_PUBLIC_URL="https://opa-media.s3.amazonaws.com"

# Encryption (credentials lưu trong DB)
ENCRYPTION_KEY="random-32-char-key-for-aes256"

# Cron security
CRON_SECRET="random-secret-for-cron-endpoint"

# Telegram Bot
TELEGRAM_BOT_TOKEN=""
TELEGRAM_BOT_USERNAME="OpaBot"

# Email (SMTP cho reset password)
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@opa.mecode.pro"

# App
NEXT_PUBLIC_APP_URL="https://opa.mecode.pro"
```

---

## 8. Build Order

> Thứ tự build khuyến nghị cho solo dev — mỗi bước là 1 milestone có thể demo được.

```
Sprint 1 (Tuần 1): Nền tảng
  ✦ Setup Next.js + Prisma + PostgreSQL
  ✦ Feature 0: Auth (register, login, JWT session)
  ✦ Feature A1: Setup admin first-run
  ✦ Feature 4: Quản lý Kênh (CRUD + test connection)

Sprint 2 (Tuần 2): Soạn & Đăng
  ✦ Feature 1: Soạn bài (editor + channel picker + S3 upload)
  ✦ Feature 2: Lên lịch cơ bản (date picker + scheduled status)
  ✦ Cron job + Make.com webhook flow
  ✦ Callback endpoint + update status

Sprint 3 (Tuần 3): Calendar & Real-time
  ✦ Feature 2: Calendar FullCalendar + drag-drop
  ✦ SSE real-time updates
  ✦ Feature 3: Theo dõi bài (list + filter + timeline + retry)

Sprint 4 (Tuần 4): Admin & Notifications
  ✦ Feature A2 + A3: Admin user list + dashboard
  ✦ Feature 5: Telegram notifications
  ✦ Feature 7: Settings & Profile

Sprint 5 (Tuần 5-6): Polish & Direct API
  ✦ YouTube OAuth flow
  ✦ Threads + X.com direct API
  ✦ Feature 6: Báo cáo hiệu quả
  ✦ Edge cases + error handling
  ✦ Performance + security audit
```

---

*TDD v1.0 — 2026-04-17 — Bình*

