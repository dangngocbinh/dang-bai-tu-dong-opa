const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function sendMessage(
  chatId: string,
  text: string,
  options?: { parse_mode?: "HTML" | "Markdown" }
): Promise<boolean> {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode ?? "HTML",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getChatInfo(
  chatId: string
): Promise<{ username?: string; first_name?: string } | null> {
  try {
    const res = await fetch(`${TELEGRAM_API}/getChat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ?? null;
  } catch {
    return null;
  }
}

export function buildDeeplink(token: string): string {
  return `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=${token}`;
}
