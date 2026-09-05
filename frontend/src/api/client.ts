// One place that knows how to talk to the backend: attaches the login token to
// every request, and turns a backend error into a JS exception the UI can catch.
export const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

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

// For endpoints that return a file (a job's ZIP result) instead of JSON - still
// needs the auth header, so a plain <a href> or window.open can't be used.
// Also hands back the server's own filename (from Content-Disposition) so the
// saved file keeps its unique, timestamped name instead of a hardcoded one.
export async function requestBlob(path: string): Promise<{ blob: Blob; filename: string | null }> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { headers });
  if (!res.ok) throw new ApiError("DOWNLOAD_FAILED", "Could not download the file", res.status);

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  return { blob: await res.blob(), filename: match ? match[1] : null };
}

// For file uploads (bulk CSV import) - no Content-Type header here, the
// browser sets its own multipart boundary when the body is a FormData.
export async function requestUpload<T>(path: string, file: File): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}${path}`, { method: "POST", headers, body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error;
    throw new ApiError(err?.code ?? "UNKNOWN_ERROR", err?.message ?? "Upload failed", res.status);
  }
  return json as T;
}
