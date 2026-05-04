// In-memory SSE connection map: userId → writer
// NOTE: This only works with a single Next.js instance.
// For horizontal scaling, replace with Redis pub/sub.

type SSEWriter = (data: string) => void;

const connections = new Map<string, SSEWriter>();

export function registerSSE(userId: string, writer: SSEWriter): void {
  connections.set(userId, writer);
}

export function unregisterSSE(userId: string): void {
  connections.delete(userId);
}

export function sendSSE(userId: string, event: string, data: unknown): void {
  const writer = connections.get(userId);
  if (writer) {
    writer(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }
}

export function broadcastSSE(event: string, data: unknown): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  connections.forEach((writer) => writer(message));
}
