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

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    // 백엔드 에러 포맷이 있으면 여기서 파싱해서 메시지 개선 가능
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
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