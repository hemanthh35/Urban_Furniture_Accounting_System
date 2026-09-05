// One place that knows how to talk to the backend: attaches the login token to
// every request, and turns a backend error into a JS exception the UI can catch.
const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem("uf_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("uf_token", token);
  else localStorage.removeItem("uf_token");
}

type Options = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { method = "GET", body } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(err?.code ?? "UNKNOWN_ERROR", err?.message ?? "Something went wrong", res.status);
  }

  return json as T;
}
