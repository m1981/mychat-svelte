export const BASE_URL = 'http://localhost:5173';

export async function api(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> ?? {})
  };
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await api(path, init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function streamChat(chatId: string, text: string): Promise<string[]> {
  const res = await api(`/api/chat/${chatId}`, {
    method: 'POST',
    body: JSON.stringify({
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'user',
          parts: [{ type: 'text', text }]
        }
      ]
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`streamChat HTTP ${res.status}: ${body}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const events: string[] = [];
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data:')) {
        events.push(line.slice(5).trim());
      }
    }
  }

  return events;
}

export function j(body: unknown): RequestInit {
  return {
    method: 'POST',
    body: JSON.stringify(body)
  };
}
