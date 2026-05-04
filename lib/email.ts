import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@opa.mecode.pro",
    to,
    subject,
    html,
  });
}

export function resetPasswordEmail(resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1e293b;">Đặt lại mật khẩu OPA</h2>
      <p style="color: #475569;">Nhấn vào nút bên dưới để đặt lại mật khẩu. Link có hiệu lực trong 15 phút.</p>
      <a href="${resetUrl}"
         style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
        Đặt lại mật khẩu
      </a>
      <p style="color: #94a3b8; font-size: 13px;">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
    </div>
  `;
}

export function passwordChangedEmail(): string {
  return `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1e293b;">Mật khẩu đã được thay đổi</h2>
      <p style="color: #475569;">Mật khẩu tài khoản OPA của bạn vừa được thay đổi thành công.</p>
      <p style="color: #475569;">Nếu bạn không thực hiện thay đổi này, hãy liên hệ với chúng tôi ngay lập tức.</p>
    </div>
  `;
}
