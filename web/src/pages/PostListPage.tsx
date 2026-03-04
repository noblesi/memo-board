import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { listPosts } from "../lib/api";
import type { PostSummary } from "../lib/api";

function parseNonNegInt(v: string | null, fallback: number) {
  const n = v == null ? NaN : Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 0 ? i : fallback;
}

type ListState = {
  items: PostSummary[];
  totalPages: number;
  totalElements: number;
};

export default function PostListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.pathname + location.search;
  const [sp, setSp] = useSearchParams();

  // URL -> 상태(소스오브트루스)
  const qParam = sp.get("q") ?? "";
  const pageParam = useMemo(() => parseNonNegInt(sp.get("page"), 0), [sp]);

  // 입력 중인 검색어(즉시 URL에 반영하지 않고, "검색" 버튼 눌렀을 때 반영)
  const [draftQ, setDraftQ] = useState(qParam);
  useEffect(() => setDraftQ(qParam), [qParam]);

  const [data, setData] = useState<ListState | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dtf = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [],
  );

  function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.valueOf())) return iso;
    return dtf.format(d);
  }

  async function load(p: number, query: string) {
    setLoading(true);
    setErr(null);
    try {
      const trimmed = query.trim();
      const res = await listPosts({ page: p, size: 20, q: trimmed ? trimmed : undefined });
      setData({
        items: res.items,
        totalPages: res.page.totalPages,
        totalElements: res.page.totalElements,
      });
    } catch (e) {
      setErr(String((e as any)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  function setQueryPage(nextQ: string, nextPage: number) {
    const trimmed = nextQ.trim();
    const next: Record<string, string> = { page: String(Math.max(0, nextPage)) };
    if (trimmed) next.q = trimmed; // q가 비면 URL에서 제거
    setSp(next);
  }

  // URL이 바뀌면 다시 로드 (새로고침/뒤로가기/링크 공유 포함)
  useEffect(() => {
    load(pageParam, qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParam, qParam]);

  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const totalCountText = loading && !data ? "…" : String(data?.totalElements ?? 0);

  const showLoadingFirst = loading && !data;
  const showEmpty = !loading && !!data && data.items.length === 0;

  return (
    <div>
      <div className="card cardPad" style={{ marginBottom: 12 }}>
        <div className="rowControls">
          <input
            className="input"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="검색(제목/내용)"
            onKeyDown={(e) => {
              if (e.key === "Enter") setQueryPage(draftQ, 0);
            }}
          />
          <button className="btn btnPrimary" onClick={() => setQueryPage(draftQ, 0)} disabled={loading}>
            검색
          </button>
        </div>

        <div className="row" style={{ marginTop: 10, justifyContent: "space-between" }}>
          <span className="pill">총 {totalCountText}개</span>
          <span className="muted" style={{ fontSize: 12 }}>
            검색/페이지가 URL에 반영됩니다.
          </span>
        </div>
      </div>

      {err && (
        <div className="error" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {showLoadingFirst && (
        <div className="card cardPad emptyState" style={{ marginBottom: 12 }}>
          <div className="emptyTitle">불러오는 중…</div>
          <div className="muted">게시글 목록을 가져오고 있습니다.</div>
        </div>
      )}

      {showEmpty && (
        <div className="card cardPad emptyState" style={{ marginBottom: 12 }}>
          <div className="emptyTitle">게시글이 없습니다</div>
          <div className="muted">첫 글을 작성해보세요.</div>
          <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
            <Link to="/new" state={{ from }} className="btn btnPrimary">
              새 글 작성
            </Link>
          </div>
        </div>
      )}

      {!showLoadingFirst && !showEmpty && (
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 90 }}>ID</th>
                <th>제목</th>
                <th style={{ width: 220 }}>수정일</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((p) => (
                <tr
                  key={p.id}
                  className="tableRowClickable"
                  onClick={() => navigate(`/posts/${p.id}`, { state: { from } })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") navigate(`/posts/${p.id}`, { state: { from } });
                  }}
                  tabIndex={0}
                  role="link"
                  aria-label={`게시글 ${p.id} 열기`}
                >
                  <td className="mono">{p.id}</td>
                  <td style={{ fontWeight: 600 }}>
                    <Link to={`/posts/${p.id}`} state={{ from }} onClick={(e) => e.stopPropagation()}>
                      {p.title}
                    </Link>
                  </td>
                  <td className="muted">{formatDate(p.updatedAt)}</td>
                </tr>
              ))}

              {data && data.items.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    게시글이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <button
          className="btn"
          disabled={loading || pageParam <= 0}
          onClick={() => setQueryPage(qParam, pageParam - 1)}
        >
          이전
        </button>

        <span className="muted">
          {Math.min(pageParam + 1, totalPages)} / {totalPages}
        </span>

        <button
          className="btn"
          disabled={loading || (data ? pageParam >= totalPages - 1 : true)}
          onClick={() => setQueryPage(qParam, pageParam + 1)}
        >
          다음
        </button>
      </div>
    </div>
  );
}