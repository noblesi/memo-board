export type PostSummary = {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Post = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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

  constructor(message: string, status: number, fieldErrors: ApiFieldError[] = [], path?: string, raw?: unknown) {
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
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  const text = await res.text().catch(() => "");
  const contentType = res.headers.get("content-type") ?? "";

  // 에러 응답: JSON(ErrorRes)면 파싱해서 ApiError로 던짐
  if (!res.ok) {
    if (contentType.includes("application/json") && text) {
      try {
        const data = JSON.parse(text) as Partial<ApiErrorRes>;
        const msg = typeof data.message === "string" ? data.message : `HTTP ${res.status}`;

        const fields: ApiFieldError[] = Array.isArray(data.fieldErrors)
          ? data.fieldErrors
              .filter((x) => x && typeof x.field === "string" && typeof x.message === "string")
              .map((x) => ({ field: x.field, message: x.message }))
          : [];

        throw new ApiError(msg, res.status, fields, typeof data.path === "string" ? data.path : path, data);
      } catch {
        // 파싱 실패하면 fallthrough
      }
    }

    throw new ApiError(text || `HTTP ${res.status}`, res.status, [], path, text);
  }

  // 204 또는 빈 바디면 JSON 파싱하지 않음
  if (res.status === 204 || text.trim() === "") {
    return undefined as T;
  }

  // 정상 응답은 기본 JSON
  if (contentType.includes("application/json")) {
    return JSON.parse(text) as T;
  }

  return text as unknown as T;
}

export function listPosts(params: { page?: number; size?: number; q?: string } = {}) {
  const usp = new URLSearchParams();
  if (params.page != null) usp.set("page", String(params.page));
  if (params.size != null) usp.set("size", String(params.size));
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