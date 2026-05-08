/**
 * Test tích hợp cho chức năng TEL-001: Thông báo Telegram
 *
 * Cách chạy:
 *   TELEGRAM_BOT_TOKEN="..." NEXT_PUBLIC_APP_URL="http://localhost:3000" node scripts/test-tel001.mjs
 *
 * Yêu cầu:
 *   - Server đang chạy ở localhost:3000
 *   - DB PostgreSQL đang chạy
 *   - Tài khoản admin@opa.app tồn tại
 *
 * Script này KHÔNG mock gì cả — nó gọi thẳng vào server thật và kiểm tra kết quả thật.
 * Giống như một người dùng thao tác từng bước, nhưng tự động.
 */

const BASE = "http://localhost:3000";      // Địa chỉ server đang chạy
let passed = 0, failed = 0;               // Đếm kết quả
let authCookie = "";                       // Cookie đăng nhập, dùng cho các request cần auth

// Hàm in kết quả PASS / FAIL
function ok(label) { console.log(`  ✅ ${label}`); passed++; }
function fail(label, detail) { console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`); failed++; }
function section(name) { console.log(`\n── ${name} ──`); }

/**
 * Gọi API vào server.
 * Tương đương với việc bạn dùng fetch() trong trình duyệt,
 * nhưng ở đây chạy trong Node.js để test tự động.
 *
 * @param method  - Loại request: GET, POST, PATCH, DELETE
 * @param path    - Đường dẫn API, ví dụ: /api/telegram/connect
 * @param body    - Dữ liệu gửi lên (nếu có), sẽ được chuyển thành JSON
 * @param cookie  - Cookie đăng nhập (authCookie), cần thiết cho các route bảo mật
 */
async function api(method, path, body, cookie) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),  // Chỉ gắn Cookie nếu có
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",  // Không tự động follow redirect — để test kiểm soát được status code 307/302
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}  // Nếu response không phải JSON thì json = null
  return { status: res.status, json, headers: res.headers };
}

// ── Bước 0: Xoá kết nối Telegram cũ nếu có (dọn dẹp trước khi test) ─────────
// Đảm bảo mỗi lần chạy test đều bắt đầu từ trạng thái sạch
await api("DELETE", "/api/telegram/connect", null, authCookie);

// ══════════════════════════════════════════════════════════════════════════════
// PHẦN 1: ĐĂNG NHẬP (AUTH)
// Cần đăng nhập trước để lấy cookie, rồi dùng cookie đó cho các test tiếp theo.
// NextAuth v5 dùng quy trình 2 bước: (1) lấy CSRF token, (2) POST thông tin đăng nhập.
// ══════════════════════════════════════════════════════════════════════════════
section("Auth");
{
  // Bước 1: Lấy CSRF token
  // CSRF (Cross-Site Request Forgery) là cơ chế bảo mật — server cần xác nhận
  // request đến từ trang hợp lệ chứ không phải từ trang lạ.
  // Chúng ta phải lấy token này rồi gửi kèm theo khi đăng nhập.
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  // Lấy đúng cookies cần thiết từ response CSRF
  // getSetCookie() trả về mảng tất cả cookies mà server muốn lưu vào trình duyệt
  const csrfAllCookies = csrfRes.headers.getSetCookie();
  // Chỉ lấy cookie authjs.csrf-token cuối cùng (NextAuth có thể tạo nhiều — dùng cái mới nhất)
  const csrfCookie = csrfAllCookies.filter((c) => c.startsWith("authjs.csrf-token")).at(-1)?.split(";")[0] ?? "";
  // Cookie callback-url cũng cần thiết cho NextAuth
  const callbackCookie = csrfAllCookies.find((c) => c.startsWith("authjs.callback-url"))?.split(";")[0] ?? "";
  const csrfCookieHeader = [csrfCookie, callbackCookie].filter(Boolean).join("; ");

  // Bước 2: Đăng nhập bằng email + password
  // Gửi form đăng nhập kèm theo CSRF token và cookie vừa lấy
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: csrfCookieHeader },
    body: new URLSearchParams({ email: "admin@opa.app", password: "Admin@123", csrfToken, callbackUrl: BASE }),
    redirect: "manual",  // Không follow redirect — server sẽ trả 302 kèm session cookie
  });

  // Lấy session cookie từ response — đây là "thẻ đăng nhập" cho các request tiếp theo
  const loginCookies = loginRes.headers.getSetCookie();
  const sessionCookie = loginCookies.find((c) => c.includes("session-token"))?.split(";")[0] ?? "";

  if (sessionCookie) {
    // Ghép CSRF cookie + session cookie lại — cả 2 đều cần gửi kèm trong mỗi request
    authCookie = [csrfCookieHeader, sessionCookie].join("; ");
    ok("NextAuth login — session cookie OK");
  } else {
    fail("NextAuth login", `status=${loginRes.status} loc=${loginRes.headers.get("location")}`);
  }
}

// Dọn sạch lần nữa sau khi đã đăng nhập (lần này với authCookie hợp lệ)
await api("DELETE", "/api/telegram/connect", null, authCookie);

// ══════════════════════════════════════════════════════════════════════════════
// PHẦN 2: HAPPY PATH — Các tình huống bình thường, người dùng làm đúng
// ══════════════════════════════════════════════════════════════════════════════
section("Happy Path");

// ── TC-01: Tạo deeplink kết nối Telegram ─────────────────────────────────────
// Khi người dùng bấm "Kết nối Telegram", server tạo 1 link đặc biệt
// dạng t.me/OpaBot?start=TOKEN để mở bot Telegram.
let deeplink = "";
let token = "";
{
  const r = await api("POST", "/api/telegram/connect", null, authCookie);

  // Kỳ vọng: response thành công (200) và có deeplink hợp lệ chứa "t.me/"
  if (r.status === 200 && r.json?.data?.deeplink?.includes("t.me/")) {
    deeplink = r.json.data.deeplink;
    token = deeplink.split("start=")[1];  // Tách token ra khỏi URL để dùng cho test sau
    ok("TC-01: POST /api/telegram/connect → deeplink hợp lệ");
  } else {
    fail("TC-01: POST /api/telegram/connect", `status=${r.status} body=${JSON.stringify(r.json)}`);
  }
}

// ── TC-02: Kiểm tra trạng thái TRƯỚC khi kết nối ─────────────────────────────
// Trước khi người dùng bấm Start trên Telegram, trạng thái phải là "chưa kết nối".
{
  const r = await api("GET", "/api/telegram/connect", null, authCookie);

  // Kỳ vọng: connected = false vì chưa có ai bấm Start trên bot
  if (r.status === 200 && r.json?.data?.connected === false) {
    ok("TC-02: GET /api/telegram/connect → connected: false trước khi kết nối");
  } else {
    fail("TC-02: GET /api/telegram/connect", `connected=${r.json?.data?.connected}`);
  }
}

// ── TC-03: Giả lập người dùng bấm Start trên Telegram ────────────────────────
// Khi người dùng bấm Start trên bot, Telegram gửi webhook POST đến server OPA.
// Webhook này chứa chatId (số định danh của người dùng Telegram) và token.
// Server phải xác thực token, lưu chatId vào DB, rồi trả 200 cho Telegram.
const TEST_CHAT_ID = "999888777";  // chatId giả để test (không phải số thật)
{
  const r = await api("POST", "/api/telegram/webhook", {
    message: {
      text: `/start ${token}`,            // Lệnh Telegram bot nhận được
      chat: { id: TEST_CHAT_ID, username: "testuser", first_name: "Test" },
    },
  });
  // Kỳ vọng: 200 và { ok: true } — Telegram yêu cầu phải luôn trả 200
  // để không bị retry tự động
  if (r.status === 200 && r.json?.data?.ok === true) {
    ok("TC-03: Webhook /start token hợp lệ → 200 ok");
  } else {
    fail("TC-03: Webhook /start token hợp lệ", `status=${r.status}`);
  }
}

// ── TC-04: Kiểm tra trạng thái SAU khi kết nối ───────────────────────────────
// Sau khi webhook xử lý xong, GET phải trả về connected: true.
// UI dùng polling (gọi API này mỗi 3 giây) để tự cập nhật trạng thái.
{
  const r = await api("GET", "/api/telegram/connect", null, authCookie);

  // Kỳ vọng: connected = true vì chatId đã được lưu từ bước webhook
  if (r.status === 200 && r.json?.data?.connected === true) {
    ok("TC-04: GET /api/telegram/connect → connected: true sau khi kết nối");
  } else {
    fail("TC-04: GET /api/telegram/connect sau webhook", `connected=${r.json?.data?.connected}`);
  }
}

// ── TC-05: Gửi tin nhắn test ──────────────────────────────────────────────────
// Người dùng bấm "Gửi test" trong Settings để kiểm tra bot có hoạt động không.
// Nếu đã kết nối thì không được trả lỗi NOT_CONNECTED.
{
  const r = await api("POST", "/api/telegram/test", null, authCookie);
  // Kỳ vọng: không phải lỗi NOT_CONNECTED
  // (Bot có thể không gửi được vì chatId test không thật, nhưng phải đi đến bước đó)
  if (r.status !== 400 || r.json?.error?.code !== "NOT_CONNECTED") {
    ok("TC-05: POST /api/telegram/test — không bị NOT_CONNECTED (đã có chatId)");
  } else {
    fail("TC-05: POST /api/telegram/test", `error=${r.json?.error?.code}`);
  }
}

// ── TC-06: Lưu tùy chọn thông báo ────────────────────────────────────────────
// Người dùng điều chỉnh toggle trong Settings:
// - Tắt thông báo khi đăng thành công
// - Giờ báo cáo hàng ngày = 09:00
// Server phải lưu đúng và trả lại giá trị đã lưu.
{
  const r = await api("PATCH", "/api/settings", {
    telegramSettings: {
      notify_success: false,   // Tắt thông báo thành công
      notify_fail: true,       // Giữ thông báo lỗi
      daily_report: true,      // Giữ báo cáo hàng ngày
      weekly_report: false,    // Tắt báo cáo hàng tuần
      report_time: "09:00",    // Đổi giờ gửi báo cáo
    },
  }, authCookie);
  // Kỳ vọng: response trả lại đúng giá trị đã PATCH
  if (
    r.status === 200 &&
    r.json?.data?.telegramSettings?.notify_success === false &&
    r.json?.data?.telegramSettings?.report_time === "09:00"
  ) {
    ok("TC-06: PATCH /api/settings telegramSettings → lưu đúng");
  } else {
    fail("TC-06: PATCH /api/settings", `body=${JSON.stringify(r.json?.data?.telegramSettings)}`);
  }
}

// ── TC-07: Ngắt kết nối Telegram ─────────────────────────────────────────────
// Người dùng bấm "Ngắt kết nối" — server phải xóa chatId khỏi DB.
{
  const r = await api("DELETE", "/api/telegram/connect", null, authCookie);
  // Kỳ vọng: { disconnected: true }
  if (r.status === 200 && r.json?.data?.disconnected === true) {
    ok("TC-07: DELETE /api/telegram/connect → disconnected: true");
  } else {
    fail("TC-07: DELETE /api/telegram/connect", `status=${r.status}`);
  }
}

// ── TC-07b: Xác nhận đã ngắt kết nối ─────────────────────────────────────────
// Ngay sau khi ngắt, GET phải trả về connected: false.
{
  const r = await api("GET", "/api/telegram/connect", null, authCookie);
  if (r.json?.data?.connected === false) {
    ok("TC-07b: GET sau disconnect → connected: false");
  } else {
    fail("TC-07b: GET sau disconnect", `connected=${r.json?.data?.connected}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PHẦN 3: EDGE CASES — Các tình huống bất thường, người dùng làm sai
// ══════════════════════════════════════════════════════════════════════════════
section("Edge Cases");

// ── TC-08: Webhook gửi token giả (không tồn tại trong DB) ────────────────────
// Nếu ai đó tự tạo link giả với token bịa đặt, server phải bỏ qua.
{
  const r = await api("POST", "/api/telegram/webhook", {
    message: {
      text: "/start deadbeefdeadbeefdeadbeefdeadbeef",  // Token không tồn tại
      chat: { id: "111", username: "hacker" },
    },
  });
  // Kiểm tra user admin không bị kết nối nhầm với chatId của kẻ giả mạo
  const verify = await api("GET", "/api/telegram/connect", null, authCookie);
  if (r.status === 200 && verify.json?.data?.connected === false) {
    ok("TC-08: Webhook token không tồn tại → 200, không lưu chatId");
  } else {
    fail("TC-08: Webhook token không tồn tại", `webhook=${r.status} connected=${verify.json?.data?.connected}`);
  }
}

// ── TC-09: Webhook gửi token đã hết hạn (> 15 phút) ─────────────────────────
// Token chỉ có hiệu lực 15 phút. Nếu quá hạn, server phải từ chối.
{
  // Tạo token mới để test
  const connectRes = await api("POST", "/api/telegram/connect", null, authCookie);
  const expiredToken = connectRes.json?.data?.deeplink?.split("start=")[1];

  if (expiredToken) {
    // Giả lập token hết hạn bằng cách trực tiếp sửa DB (đặt thời gian = năm 2000)
    // Trong test thực tế, chúng ta không thể "chờ 15 phút" nên phải làm cách này.
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: "postgresql://binhpc@localhost:5432/opa_new2" });
    await client.connect();
    await client.query(
      `UPDATE "TelegramConnectToken" SET "expiresAt" = '2000-01-01 00:00:00'::timestamp WHERE token = $1`,
      [expiredToken]
    );
    await client.end();

    // Gửi webhook với token đã hết hạn
    const r = await api("POST", "/api/telegram/webhook", {
      message: {
        text: `/start ${expiredToken}`,
        chat: { id: "222", username: "lateuser" },
      },
    });
    // Kỳ vọng: 200 (luôn trả 200 cho Telegram) nhưng chatId KHÔNG được lưu
    const verify = await api("GET", "/api/telegram/connect", null, authCookie);
    if (r.status === 200 && verify.json?.data?.connected === false) {
      ok("TC-09: Webhook token hết hạn → 200, không lưu chatId");
    } else {
      fail("TC-09: Webhook token hết hạn", `connected=${verify.json?.data?.connected}`);
    }
  } else {
    fail("TC-09: Webhook token hết hạn", "không tạo được token test");
  }
}

// ── TC-10: Webhook nhận /start không có token ─────────────────────────────────
// Người dùng tự tìm bot và gõ /start (không qua deeplink của OPA).
// Server phải trả về tin chào hướng dẫn, không crash.
{
  const r = await api("POST", "/api/telegram/webhook", {
    message: {
      text: "/start",  // Không có token đi kèm
      chat: { id: "333", username: "newuser" },
    },
  });
  // Kỳ vọng: 200, bot gửi tin hướng dẫn
  if (r.status === 200) {
    ok("TC-10: Webhook /start không có token → 200 (greeting)");
  } else {
    fail("TC-10: Webhook /start không có token", `status=${r.status}`);
  }
}

// ── TC-11: Người dùng đã kết nối rồi, lại bấm Start lần nữa ─────────────────
// Nếu chatId đã tồn tại, bot nhắn "bạn đã kết nối rồi" thay vì tạo kết nối trùng.
{
  // Kết nối user trước
  const c = await api("POST", "/api/telegram/connect", null, authCookie);
  const t = c.json?.data?.deeplink?.split("start=")[1];
  if (t) {
    await api("POST", "/api/telegram/webhook", {
      message: { text: `/start ${t}`, chat: { id: TEST_CHAT_ID, username: "testuser" } },
    });

    // Tạo token mới và thử kết nối lại (giả lập user bấm Start lần 2)
    const c2 = await api("POST", "/api/telegram/connect", null, authCookie);
    const t2 = c2.json?.data?.deeplink?.split("start=")[1];
    if (t2) {
      const r = await api("POST", "/api/telegram/webhook", {
        message: { text: `/start ${t2}`, chat: { id: TEST_CHAT_ID, username: "testuser" } },
      });
      // Kỳ vọng: 200 — không crash, không tạo kết nối trùng
      if (r.status === 200) {
        ok("TC-11: Webhook user đã kết nối → 200 (bot nhắn 'đã kết nối')");
      } else {
        fail("TC-11: Webhook user đã kết nối", `status=${r.status}`);
      }
    }
  }
}

// ── TC-12: Gửi test message khi chưa kết nối Telegram ────────────────────────
// Người dùng chưa kết nối Telegram, không thể gửi test.
// Server phải trả lỗi rõ ràng thay vì crash.
{
  // Ngắt kết nối trước để đảm bảo trạng thái
  await api("DELETE", "/api/telegram/connect", null, authCookie);
  const r = await api("POST", "/api/telegram/test", null, authCookie);
  // Kỳ vọng: 400 với mã lỗi NOT_CONNECTED
  if (r.status === 400 && r.json?.error?.code === "NOT_CONNECTED") {
    ok("TC-12: POST /api/telegram/test chưa kết nối → NOT_CONNECTED");
  } else {
    fail("TC-12: POST /api/telegram/test chưa kết nối", `status=${r.status} code=${r.json?.error?.code}`);
  }
}

// ── TC-13: Bấm "Kết nối" 2 lần → chỉ tạo 1 token, không nhân đôi ────────────
// Nếu bấm lại (ví dụ link cũ chưa dùng), server phải cập nhật token cũ (upsert)
// chứ không tạo thêm token mới — tránh rác trong DB.
{
  await api("POST", "/api/telegram/connect", null, authCookie);        // Lần 1
  const r2 = await api("POST", "/api/telegram/connect", null, authCookie);  // Lần 2

  if (r2.status === 200 && r2.json?.data?.deeplink) {
    // Kiểm tra DB: chỉ được có đúng 1 token cho user này
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: "postgresql://binhpc@localhost:5432/opa_new2" });
    await client.connect();
    const { rows } = await client.query(
      `SELECT COUNT(*) FROM "TelegramConnectToken" WHERE "userId" = (SELECT id FROM "User" WHERE email = 'admin@opa.app')`
    );
    await client.end();
    if (parseInt(rows[0].count) === 1) {
      ok("TC-13: POST /api/telegram/connect 2 lần → chỉ 1 token (upsert)");
    } else {
      fail("TC-13: Upsert token", `count=${rows[0].count}`);
    }
  } else {
    fail("TC-13: POST /api/telegram/connect lần 2", `status=${r2.status}`);
  }
}

// ── TC-14: Gọi API không có đăng nhập → 401 ──────────────────────────────────
// Nếu request không có cookie đăng nhập, server phải từ chối với mã 401 (Unauthorized).
// Quan trọng: API route phải trả 401 chứ không được redirect về trang login (307).
{
  const r = await api("POST", "/api/telegram/connect", null, "");  // Gửi request không có cookie
  // Kỳ vọng: 401 Unauthorized
  if (r.status === 401) {
    ok("TC-14: POST /api/telegram/connect không auth → 401");
  } else {
    fail("TC-14: Unauthenticated", `status=${r.status}`);
  }
}

// ── TC-15: Nhập giờ báo cáo không hợp lệ ─────────────────────────────────────
// report_time phải là giờ hợp lệ (00:00 đến 23:59).
// Nếu nhập "25:99" (giờ không tồn tại), server phải từ chối.
{
  const r = await api("PATCH", "/api/settings", {
    telegramSettings: { report_time: "25:99" },  // Giờ không hợp lệ
  }, authCookie);
  // Kỳ vọng: 400 Bad Request
  if (r.status === 400) {
    ok("TC-15: PATCH /api/settings report_time không hợp lệ → 400");
  } else {
    fail("TC-15: PATCH /api/settings invalid report_time", `status=${r.status}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// KẾT QUẢ TỔNG HỢP
// ══════════════════════════════════════════════════════════════════════════════
console.log(`\n${"─".repeat(40)}`);
console.log(`Kết quả: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);  // Exit code 1 để CI/CD biết có lỗi
