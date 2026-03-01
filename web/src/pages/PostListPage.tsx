import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPosts } from "../lib/api";
import type { PostSummary } from "../lib/api";

export default function PostListPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{
    items: PostSummary[];
    totalPages: number;
    totalElements: number;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load(p: number, query: string) {
    setErr(null);
    const res = await listPosts({ page: p, size: 20, q: query || undefined });
    setData({
      items: res.items,
      totalPages: res.page.totalPages,
      totalElements: res.page.totalElements,
    });
  }

  useEffect(() => {
    load(page, q).catch((e) => setErr(String((e as any)?.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="검색(제목/내용)"
          style={{ flex: 1, padding: 8 }}
        />
        <button
          onClick={() => {
            setPage(0);
            load(0, q).catch((e) => setErr(String((e as any)?.message ?? e)));
          }}
        >
          검색
        </button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      <div style={{ marginBottom: 8 }}>총 {data?.totalElements ?? 0}개</div>

      <div style={{ border: "1px solid #ddd", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f7f7f7" }}>
              <th style={{ textAlign: "left", padding: 10, width: 90 }}>ID</th>
              <th style={{ textAlign: "left", padding: 10 }}>제목</th>
              <th style={{ textAlign: "left", padding: 10, width: 220 }}>수정일</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: 10 }}>{p.id}</td>
                <td style={{ padding: 10 }}>
                  <Link to={`/posts/${p.id}`}>{p.title}</Link>
                </td>
                <td style={{ padding: 10 }}>{new Date(p.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 12, color: "#666" }}>
                  게시글이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <button disabled={page <= 0} onClick={() => setPage((x) => Math.max(0, x - 1))}>
          이전
        </button>
        <div>
          {page + 1} / {data?.totalPages ?? 1}
        </div>
        <button disabled={data ? page >= data.totalPages - 1 : true} onClick={() => setPage((x) => x + 1)}>
          다음
        </button>
      </div>
    </div>
  );
}