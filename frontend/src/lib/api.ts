const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("solace_token");
}

export function setToken(token: string) {
  localStorage.setItem("solace_token", token);
}

export function clearToken() {
  localStorage.removeItem("solace_token");
  localStorage.removeItem("solace_user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem("solace_user");
  return data ? JSON.parse(data) : null;
}

export function setUser(user: Record<string, unknown>) {
  localStorage.setItem("solace_user", JSON.stringify(user));
}

export async function apiFetch(
  endpoint: string,
  options: RequestOptions = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }

  return response;
}

export async function apiJSON<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const response = await apiFetch(endpoint, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

// Auth
export async function register(data: {
  email: string;
  password: string;
  display_name: string;
  timezone: string;
}) {
  return apiJSON<{
    access_token: string;
    user: Record<string, unknown>;
  }>("/auth/register", { method: "POST", body: data });
}

export async function login(data: { email: string; password: string }) {
  return apiJSON<{
    access_token: string;
    user: Record<string, unknown>;
  }>("/auth/login", { method: "POST", body: data });
}

// Chat — SSE streaming
export function chatStream(
  content: string,
  sessionId: string | null,
  onEvent: (event: string, data: string) => void,
  onError: (error: Error) => void,
  onDone: () => void
): AbortController {
  const controller = new AbortController();
  const token = getToken();

  fetch(`${API_BASE}/chat/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content, session_id: sessionId }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            const nextLine = lines[lines.indexOf(line) + 1];
            const data = nextLine?.startsWith("data: ")
              ? nextLine.slice(6)
              : "";
            onEvent(eventType, data);
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split("\n");
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            onEvent(eventType, "");
          }
        }
      }

      onDone();
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        onError(error);
      }
    });

  return controller;
}

// Sessions
export async function getSessions() {
  return apiJSON<
    Array<{
      id: string;
      started_at: string;
      summary_text: string | null;
      dominant_emotion: string | null;
      turn_count: number;
    }>
  >("/sessions/");
}

export async function getSessionDetail(sessionId: string) {
  return apiJSON(`/sessions/${sessionId}`);
}

export async function getChatHistory(sessionId: string) {
  return apiJSON<
    Array<{
      id: string;
      role: string;
      content: string;
      emotion_state: Record<string, unknown> | null;
      created_at: string | null;
    }>
  >(`/chat/history/${sessionId}`);
}
