import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listPosts } from "../lib/api";
import type { PostSummary } from "../lib/api";

function parseNonNegInt(v: string | null, fallback: number) {
  const n = v == null ? NaN : Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 0 ? i : fallback;
}

export default function PostListPage() {
  const [sp, setSp] = useSearchParams();

  // URL -> 상태(소스오브트루스)
  const qParam = sp.get("q") ?? "";
  const pageParam = useMemo(() => parseNonNegInt(sp.get("page"), 0), [sp]);

  // 입력 중인 검색어(즉시 URL에 반영하지 않고, "검색" 버튼 눌렀을 때 반영)
  const [draftQ, setDraftQ] = useState(qParam);
  useEffect(() => setDraftQ(qParam), [qParam]);

  const [data, setData] = useState<{
    items: PostSummary[];
    totalPages: number;
    totalElements: number;
  } | null>(null);

  const [err, setErr] = useState<string | null>(null);

  async function load(p: number, query: string) {
    setErr(null);
    const res = await listPosts({ page: p, size: 20, q: query.trim() ? query.trim() : undefined });
    setData({
      items: res.items,
      totalPages: res.page.totalPages,
      totalElements: res.page.totalElements,
    });
  }

  function setQueryPage(nextQ: string, nextPage: number) {
    const trimmed = nextQ.trim();
    const next: Record<string, string> = { page: String(Math.max(0, nextPage)) };
    if (trimmed) next.q = trimmed; // q가 비면 URL에서 제거
    setSp(next);
  }

  // URL이 바뀌면 다시 로드 (새로고침/뒤로가기/링크 공유 포함)
  useEffect(() => {
    load(pageParam, qParam).catch((e) => setErr(String((e as any)?.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParam, qParam]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={draftQ}
          onChange={(e) => setDraftQ(e.target.value)}
          placeholder="검색(제목/내용)"
          style={{ flex: 1, padding: 8 }}
          onKeyDown={(e) => {
            if(e.key === "Enter") {
              setQueryPage(draftQ, 0);
            }
          }}
        />
        <button onClick={() => setQueryPage(draftQ, 0)}>검색</button>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      <div style={{ marginBottom: 8 }}>총 {data?.totalElements ?? 0}개</div>

      <div style={{ border: "1px solid #333", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1a1a1a" }}>
              <th style={{ textAlign: "left", padding: 10, width: 90 }}>ID</th>
              <th style={{ textAlign: "left", padding: 10 }}>제목</th>
              <th style={{ textAlign: "left", padding: 10, width: 220 }}>수정일</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #333" }}>
                <td style={{ padding: 10 }}>{p.id}</td>
                <td style={{ padding: 10 }}>
                  <Link to={`/posts/${p.id}`}>{p.title}</Link>
                </td>
                <td style={{ padding: 10 }}>{new Date(p.updatedAt).toLocaleString()}</td>
              </tr>
            ))}

            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 12, color: "rgba(255,255,255,0.6)" }}>
                  게시글이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <button disabled={pageParam <= 0} onClick={() => setQueryPage(qParam, pageParam - 1)}>
          이전
        </button>
        <div>
          {pageParam + 1} / {data?.totalPages ?? 1}
        </div>
        <button
          disabled={data ? pageParam >= data.totalPages - 1 : true}
          onClick={() => setQueryPage(qParam, pageParam + 1)}
        >
          다음
        </button>
      </div>
    </div>
  );
}