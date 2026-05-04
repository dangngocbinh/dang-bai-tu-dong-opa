export const PLATFORMS = [
  { id: "facebook", name: "Facebook", color: "#1877F2" },
  { id: "instagram", name: "Instagram", color: "#E1306C" },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2" },
  { id: "youtube", name: "YouTube", color: "#FF0000" },
  { id: "threads", name: "Threads", color: "#000000" },
  { id: "x", name: "X.com", color: "#1D9BF0" },
];

// Channel = 1 instance kết nối tới 1 tài khoản social cụ thể, có tên riêng
export const MOCK_CHANNELS = [
  {
    id: "ch1",
    name: "Shop Cưng",
    platform: "facebook",
    status: "active",
    connType: "webhook",
    connectedAt: "2026-03-01",
    updatedAt: "2026-03-01",
    postsCount: 24,
    successRate: 96,
    labels: ["Shop Cưng"],
  },
  {
    id: "ch2",
    name: "Shop Cưng IG",
    platform: "instagram",
    status: "expired",
    connType: "webhook",
    connectedAt: "2026-03-01",
    updatedAt: "2026-04-01",
    postsCount: 18,
    successRate: 88,
    labels: ["Shop Cưng"],
  },
  {
    id: "ch3",
    name: "Giải Trí Thể Thao",
    platform: "facebook",
    status: "active",
    connType: "webhook",
    connectedAt: "2026-03-10",
    updatedAt: "2026-03-10",
    postsCount: 11,
    successRate: 100,
    labels: ["Giải Trí"],
  },
  {
    id: "ch4",
    name: "Bình Nguyễn — LinkedIn",
    platform: "linkedin",
    status: "active",
    connType: "webhook",
    connectedAt: "2026-03-15",
    updatedAt: "2026-03-15",
    postsCount: 8,
    successRate: 100,
    labels: [],
  },
  {
    id: "ch5",
    name: "Bình Vlog YouTube",
    platform: "youtube",
    status: "active",
    connType: "oauth",
    connectedAt: "2026-03-20",
    updatedAt: "2026-03-20",
    postsCount: 3,
    successRate: 100,
    labels: [],
  },
  {
    id: "ch6",
    name: "@binh_personal",
    platform: "x",
    status: "inactive",
    connType: "api",
    connectedAt: "2026-03-25",
    updatedAt: "2026-03-25",
    postsCount: 5,
    successRate: 90,
    labels: [],
  },
];

export const MOCK_POSTS = [
  {
    id: "1",
    title: "Combo áo thun mùa hè 2026",
    caption: "Hè này cần gì? Cần áo thun mát mẻ, cần style xịn, cần giá tốt...",
    status: "published",
    channelIds: ["ch1", "ch2"],
    scheduledAt: "2026-04-15T20:00:00",
    publishedAt: "2026-04-15T20:00:23",
    postUrl: "https://facebook.com/post/123",
    images: ["/placeholder-1.jpg"],
    createdAt: "2026-04-15T10:00:00",
  },
  {
    id: "2",
    title: "Ra mắt bộ sưu tập thu đông",
    caption: "Thu đông năm nay OPA mang đến bộ sưu tập đặc biệt...",
    status: "scheduled",
    channelIds: ["ch1", "ch2", "ch4"],
    scheduledAt: "2026-04-18T08:00:00",
    images: ["/placeholder-2.jpg"],
    createdAt: "2026-04-16T14:00:00",
  },
  {
    id: "3",
    title: "Tips viết caption thu hút",
    caption: "3 bí quyết viết caption không bao giờ lỗi thời...",
    status: "draft",
    channelIds: ["ch4", "ch6"],
    images: [],
    createdAt: "2026-04-17T09:00:00",
  },
  {
    id: "4",
    title: "Video unboxing sản phẩm mới",
    caption: "Hôm nay mình unbox thứ gì đây? Xem video để biết nhé!",
    status: "failed",
    channelIds: ["ch2"],
    scheduledAt: "2026-04-16T12:00:00",
    failReason: "Kênh 'Shop Cưng IG' — token hết hạn. Vui lòng kết nối lại.",
    images: [],
    createdAt: "2026-04-16T09:00:00",
  },
  {
    id: "5",
    title: "Flash sale cuối tuần",
    caption: "Flash sale 48h! Giảm đến 50% toàn bộ sản phẩm...",
    status: "published",
    channelIds: ["ch1", "ch3", "ch6"],
    scheduledAt: "2026-04-14T09:00:00",
    publishedAt: "2026-04-14T09:00:15",
    postUrl: "https://facebook.com/post/456",
    images: ["/placeholder-3.jpg"],
    createdAt: "2026-04-13T15:00:00",
  },
  {
    id: "6",
    title: "Hướng dẫn chọn size áo",
    caption: "Chọn size áo đúng không hề khó nếu bạn biết cách...",
    status: "scheduled",
    channelIds: ["ch5"],
    scheduledAt: "2026-04-20T12:00:00",
    images: [],
    createdAt: "2026-04-17T11:00:00",
  },
];

export const MOCK_USERS = [
  {
    id: "u1",
    email: "binh@example.com",
    name: "Nguyễn Văn Bình",
    role: "admin",
    status: "active",
    postsCount: 47,
    lastLogin: "2026-04-17T08:30:00",
    registeredAt: "2026-03-01",
  },
  {
    id: "u2",
    email: "nam@example.com",
    name: "Trần Văn Nam",
    role: "user",
    status: "active",
    postsCount: 23,
    lastLogin: "2026-04-16T14:20:00",
    registeredAt: "2026-03-05",
  },
  {
    id: "u3",
    email: "linh@example.com",
    name: "Nguyễn Thị Linh",
    role: "user",
    status: "active",
    postsCount: 15,
    lastLogin: "2026-04-15T09:00:00",
    registeredAt: "2026-03-10",
  },
  {
    id: "u4",
    email: "hung@example.com",
    name: "Lê Mạnh Hùng",
    role: "user",
    status: "inactive",
    postsCount: 4,
    lastLogin: "2026-04-01T12:00:00",
    registeredAt: "2026-03-15",
  },
  {
    id: "u5",
    email: "mai@example.com",
    name: "Phạm Thị Mai",
    role: "user",
    status: "active",
    postsCount: 31,
    lastLogin: "2026-04-17T07:45:00",
    registeredAt: "2026-03-20",
  },
];

export const ADMIN_STATS = {
  totalUsers: 12,
  newUsersLast7Days: 3,
  totalPostsToday: 28,
  successPostsToday: 25,
  failedPostsToday: 3,
  totalPostsLast7Days: 187,
  successRateByPlatform: [
    { platform: "Facebook", success: 45, failed: 2, rate: 95.7 },
    { platform: "Instagram", success: 38, failed: 5, rate: 88.4 },
    { platform: "LinkedIn", success: 22, failed: 1, rate: 95.6 },
    { platform: "YouTube", success: 8, failed: 0, rate: 100 },
    { platform: "Threads", success: 18, failed: 2, rate: 90.0 },
    { platform: "X.com", success: 14, failed: 1, rate: 93.3 },
  ],
  recentErrors: [
    { id: "e1", user: "linh@example.com", platform: "Instagram", reason: "Token hết hạn", time: "2026-04-17T07:30:00" },
    { id: "e2", user: "hung@example.com", platform: "X.com", reason: "Rate limit exceeded", time: "2026-04-17T06:15:00" },
    { id: "e3", user: "nam@example.com", platform: "Instagram", reason: "Media format không hợp lệ", time: "2026-04-16T22:00:00" },
  ],
};

// Helper: get channel by id
export function getChannel(id: string) {
  return MOCK_CHANNELS.find((c) => c.id === id);
}

// Helper: get channels for a post
export function getPostChannels(channelIds: string[]) {
  return channelIds.map((id) => MOCK_CHANNELS.find((c) => c.id === id)).filter(Boolean) as typeof MOCK_CHANNELS;
}

export function getStatusColor(status: string) {
  switch (status) {
    case "published": return "bg-emerald-100 text-emerald-700";
    case "scheduled": return "bg-blue-100 text-blue-700";
    case "draft": return "bg-gray-100 text-gray-600";
    case "failed": return "bg-red-100 text-red-700";
    case "processing": return "bg-amber-100 text-amber-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export function getStatusLabel(status: string) {
  switch (status) {
    case "published": return "Đã đăng";
    case "scheduled": return "Đã lên lịch";
    case "draft": return "Nháp";
    case "failed": return "Lỗi";
    case "processing": return "Đang xử lý";
    default: return status;
  }
}

export function getPlatformColor(platformId: string) {
  return PLATFORMS.find((p) => p.id === platformId)?.color ?? "#6B7280";
}

export function getPlatformName(platformId: string) {
  return PLATFORMS.find((p) => p.id === platformId)?.name ?? platformId;
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Group channels by platform
export function getChannelsByPlatform() {
  const groups: Record<string, typeof MOCK_CHANNELS> = {};
  MOCK_CHANNELS.forEach((ch) => {
    if (!groups[ch.platform]) groups[ch.platform] = [];
    groups[ch.platform].push(ch);
  });
  return groups;
}
