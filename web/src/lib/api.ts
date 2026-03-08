export type UserRole = "USER" | "ADMIN";

export type PostSummary = {
  id: number;
  title: string;
  summary: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Post = {
  id: number;
  title: string;
  content: string;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthUser = {
  authenticated: boolean;
  id: number;
  loginId: string;
  role: UserRole;
};

export type SignupRes = {
  id: number;
  loginId: string;
  role: UserRole;
};

export type PageRes<T> = {
  items: T[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
};

export type ApiFieldError = { field: string; message: string };

export type ApiErrorRes = {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors: ApiFieldError[];
};

export class ApiError extends Error {
  status: number;
  path?: string;
  fieldErrors: ApiFieldError[];
  raw?: unknown;

  constructor(
    message: string,
    status: number,
    fieldErrors: ApiFieldError[] = [],
    path?: string,
    raw?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.path = path;
    this.raw = raw;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body != null;
  const headers = new Headers(init?.headers ?? undefined);

  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });

  const text = await res.text().catch(() => "");
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    let parsed: Partial<ApiErrorRes> | null = null;

    if (contentType.includes("application/json") && text) {
      try {
        parsed = JSON.parse(text) as Partial<ApiErrorRes>;
      } catch {
        parsed = null;
      }
    }

    if (parsed) {
      const msg = typeof parsed.message === "string" ? parsed.message : `HTTP ${res.status}`;
      const fields: ApiFieldError[] = Array.isArray(parsed.fieldErrors)
        ? parsed.fieldErrors
            .filter((x) => x && typeof x.field === "string" && typeof x.message === "string")
            .map((x) => ({ field: x.field, message: x.message }))
        : [];

      throw new ApiError(
        msg,
        res.status,
        fields,
        typeof parsed.path === "string" ? parsed.path : path,
        parsed,
      );
    }

    throw new ApiError(text || `HTTP ${res.status}`, res.status, [], path, text);
  }

  if (res.status === 204 || text.trim() === "") {
    return undefined as T;
  }

  if (contentType.includes("application/json")) {
    return JSON.parse(text) as T;
  }

  return text as unknown as T;
}

export function listPosts(params: { page?: number; size?: number; q?: string; sort?: string } = {}) {
  const usp = new URLSearchParams();
  if (params.page != null) usp.set("page", String(params.page));
  if (params.size != null) usp.set("size", String(params.size));
  if (params.sort) usp.set("sort", params.sort);
  if (params.q) usp.set("q", params.q);

  const qs = usp.toString();
  return request<PageRes<PostSummary>>(`/posts${qs ? `?${qs}` : ""}`);
}

export function getPost(id: number) {
  return request<Post>(`/posts/${id}`);
}

export function createPost(input: { title: string; content: string }) {
  return request<Post>(`/posts`, { method: "POST", body: JSON.stringify(input) });
}

export function updatePost(id: number, input: { title: string; content: string }) {
  return request<Post>(`/posts/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deletePost(id: number) {
  return request<void>(`/posts/${id}`, { method: "DELETE" });
}

export function signup(input: { loginId: string; password: string }) {
  return request<SignupRes>(`/api/auth/signup`, { method: "POST", body: JSON.stringify(input) });
}

export function login(input: { loginId: string; password: string }) {
  return request<AuthUser>(`/api/auth/login`, { method: "POST", body: JSON.stringify(input) });
}

export function getMe() {
  return request<AuthUser>(`/api/auth/me`);
}

export function logout() {
  return request<void>(`/api/auth/logout`, { method: "POST" });
}