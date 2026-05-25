-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "status" TEXT NOT NULL DEFAULT 'active',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    "telegramChatId" TEXT,
    "telegramSettings" JSONB NOT NULL DEFAULT '{"notify_success":true,"notify_fail":true,"daily_report":true,"weekly_report":true,"report_time":"22:00"}',
    "zaloPhone" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "connectionType" TEXT NOT NULL,
    "platformId" TEXT,
    "webhookUrl" TEXT,
    "credentials" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "mediaUrls" JSONB NOT NULL DEFAULT '[]',
    "scheduledAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostChannel" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "callbackToken" TEXT,
    "publishedUrl" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramConnectToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramConnectToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "Channel_userId_idx" ON "Channel"("userId");

-- CreateIndex
CREATE INDEX "Channel_status_idx" ON "Channel"("status");

-- CreateIndex
CREATE INDEX "Channel_platform_idx" ON "Channel"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_userId_name_key" ON "Channel"("userId", "name");

-- CreateIndex
CREATE INDEX "Post_userId_idx" ON "Post"("userId");

-- CreateIndex
CREATE INDEX "Post_status_idx" ON "Post"("status");

-- CreateIndex
CREATE INDEX "Post_scheduledAt_idx" ON "Post"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostChannel_callbackToken_key" ON "PostChannel"("callbackToken");

-- CreateIndex
CREATE INDEX "PostChannel_postId_idx" ON "PostChannel"("postId");

-- CreateIndex
CREATE INDEX "PostChannel_channelId_idx" ON "PostChannel"("channelId");

-- CreateIndex
CREATE INDEX "PostChannel_status_idx" ON "PostChannel"("status");

-- CreateIndex
CREATE INDEX "PostChannel_callbackToken_idx" ON "PostChannel"("callbackToken");

-- CreateIndex
CREATE UNIQUE INDEX "PostChannel_postId_channelId_key" ON "PostChannel"("postId", "channelId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramConnectToken_userId_key" ON "TelegramConnectToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramConnectToken_token_key" ON "TelegramConnectToken"("token");

-- CreateIndex
CREATE INDEX "TelegramConnectToken_token_idx" ON "TelegramConnectToken"("token");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostChannel" ADD CONSTRAINT "PostChannel_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostChannel" ADD CONSTRAINT "PostChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramConnectToken" ADD CONSTRAINT "TelegramConnectToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

