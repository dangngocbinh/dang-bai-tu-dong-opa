# Tài liệu dự án
Các tài liệu nằm trong repo — đọc khi cần, không phải mỗi lần:
- PRD (yêu cầu sản phẩm): docs/PRD.md
- TDD (thiết kế kỹ thuật): docs/TDD.md
- UI Demo (prototype thiết kế sẵn): ui-demo/

# Database Migration
- Mọi thay đổi schema phải đi qua migration — không dùng `prisma db push` để thay thế migration
- Quy trình chuẩn: sửa `schema.prisma` → chạy `prisma migrate dev --name <tên>` → commit cả file migration
- Nếu `migrate dev` báo drift (migration trong DB nhưng thiếu file local): **dừng lại, báo ngay cho người dùng** thay vì tự chuyển sang `db push`
- Trường hợp không thể `migrate dev`: tạo file SQL thủ công trong `prisma/migrations/<timestamp>_<tên>/migration.sql` rồi dùng `prisma migrate resolve --applied <tên>` — không bao giờ bỏ qua migration

# Nguyên tắc khi implement
- Trước khi code một User Story: đọc story đó trong PRD và phần kỹ thuật liên quan trong TDD
- Implement đầy đủ theo từng tiêu chí "Done khi" trong story
- Tham chiếu TDD cho mọi quyết định kỹ thuật: tech stack, DB schema, API design
- Đọc UI trong ui-demo/ trước khi viết layout — không tự sáng tạo layout mới
- Hỏi trước khi làm nếu có gì chưa rõ trong PRD hoặc TDD
