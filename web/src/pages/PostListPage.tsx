import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { listPosts } from "../lib/api";
import { rememberLastList, restoreScroll, saveScroll } from "../lib/navMemory";
import type { PostSummary } from "../lib/api";

function parseNonNegInt(v: string | null, fallback: number) {
  const n = v == null ? NaN : Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 0 ? i : fallback;
}

function escapeRegExp(s: string) {
  // eslint-disable-next-line no-useless-escape
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;

  const tokens = q
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (tokens.length === 0) return text;

  const lowerTokens = tokens.map((t) => t.toLowerCase());
  const re = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(re);

  return parts.map((part, idx) => {
    const isHit = lowerTokens.includes(part.toLowerCase());
    if (!isHit) return <span key={idx}>{part}</span>;
    return (
      <mark key={idx} className="hl">
        {part}
      </mark>
    );
  });
}

type ListState = {
  items: PostSummary[];
  totalPages: number;
  totalElements: number;
};

const SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_SIZE = 20;

const SORT_OPTIONS = [
  { value: "id,desc", label: "임시ID 최신" },
  { value: "updatedAt,desc", label: "수정일 최신" },
  { value: "createdAt,desc", label: "생성일 최신" },
  { value: "title,asc", label: "제목 A→Z" },
] as const;

const DEFAULT_SORT = "id,desc";

function normalizeSize(n: number) {
  return (SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_SIZE;
}

function normalizeSort(s: string) {
  return SORT_OPTIONS.some((o) => o.value === s) ? s : DEFAULT_SORT;
}

export default function PostListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.pathname + location.search;

  // ✅ 이 페이지가 마운트될 때의 목록 URL(검색/페이지/정렬/size 포함)
  const mountFromRef = useRef(from);
  const restoredRef = useRef(false);

  const [sp, setSp] = useSearchParams();

  // URL -> 상태(소스오브트루스)
  const qParam = sp.get("q") ?? "";
  const pageParam = useMemo(() => parseNonNegInt(sp.get("page"), 0), [sp]);
  const sizeParam = useMemo(() => normalizeSize(parseNonNegInt(sp.get("size"), DEFAULT_SIZE)), [sp]);
  const sortParam = useMemo(() => normalizeSort(sp.get("sort") ?? DEFAULT_SORT), [sp]);

  // 입력 중인 검색어(즉시 URL에 반영하지 않고, "검색" 버튼 눌렀을 때 반영)
  const [draftQ, setDraftQ] = useState(qParam);
  useEffect(() => setDraftQ(qParam), [qParam]);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // ✅ 마지막으로 본 목록 URL 저장(상세/작성/수정에서 fallback용)
  useEffect(() => {
    rememberLastList(from);
  }, [from]);

  // ✅ 목록을 떠날 때(언마운트) 스크롤 위치 저장
  useEffect(() => {
    return () => {
      saveScroll(from);
    };
  }, [from]);

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

  async function load(p: number, query: string, size: number, sort: string) {
    setLoading(true);
    setErr(null);
    try {
      const trimmed = query.trim();
      const res = await listPosts({
        page: p,
        size,
        sort,
        q: trimmed ? trimmed : undefined,
      });

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

  function setListParams(next: Partial<{ q: string; page: number; size: number; sort: string }>) {
    const q = (next.q ?? qParam).trim();
    const page = Math.max(0, next.page ?? pageParam);
    const size = normalizeSize(next.size ?? sizeParam);
    const sort = normalizeSort(next.sort ?? sortParam);

    const params: Record<string, string> = {
      page: String(page),
      size: String(size),
      sort,
    };
    if (q) params.q = q;

    setSp(params);
  }

  function clearSearch(apply = true) {
    setDraftQ("");
    if (apply) setListParams({ q: "", page: 0 });
    inputRef.current?.focus();
  }

  // URL이 바뀌면 다시 로드 (새로고침/뒤로가기/링크 공유 포함)
  useEffect(() => {
    load(pageParam, qParam, sizeParam, sortParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParam, qParam, sizeParam, sortParam]);

  // ✅ 처음 로드가 끝난 뒤(데이터/에러가 확정된 뒤) 스크롤 복원 (1회만)
  useEffect(() => {
    if (restoredRef.current) return;
    if (data || err) {
      restoreScroll(mountFromRef.current);
      restoredRef.current = true;
    }
  }, [data, err]);

  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const totalCountText = loading && !data ? "…" : String(data?.totalElements ?? 0);

  const showLoadingFirst = loading && !data;
  const showEmpty = !loading && !!data && data.items.length === 0;

  return (
    <div>
      {/* 상단 검색/액션 */}
      <div className="card cardPad" style={{ marginBottom: 12 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div className="rowControls" style={{ flex: 1 }}>
            <input
              ref={inputRef}
              className="input"
              value={draftQ}
              onChange={(e) => setDraftQ(e.target.value)}
              placeholder="검색(제목/내용)"
              onKeyDown={(e) => {
                if (e.key === "Enter") setListParams({ q: draftQ, page: 0 });
                if (e.key === "Escape") clearSearch(true);
              }}
            />

            {draftQ.trim().length > 0 && (
              <button
                type="button"
                className="btn btnIcon"
                title="검색어 지우기 (Esc)"
                aria-label="검색어 지우기"
                onClick={() => clearSearch(true)}
                disabled={loading}
              >
                ✕
              </button>
            )}

            <button className="btn btnPrimary" onClick={() => setListParams({ q: draftQ, page: 0 })} disabled={loading}>
              검색
            </button>
          </div>

          {/* 새 글 작성 */}
          <Link to="/new" state={{ from }} className="btn">
            새 글
          </Link>
        </div>

        {/* 옵션 바 */}
        <div
          className="row"
          style={{ marginTop: 10, justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}
        >
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="pill">총 {totalCountText}개</span>
            {qParam.trim() && <span className="pill">검색: {qParam.trim()}</span>}
          </div>

          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: 12 }}>
              정렬
            </span>
            <select
              className="select"
              value={sortParam}
              onChange={(e) => setListParams({ sort: e.target.value, page: 0 })}
              disabled={loading}
              style={{ width: 160 }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <span className="muted" style={{ fontSize: 12 }}>
              표시
            </span>
            <select
              className="select"
              value={String(sizeParam)}
              onChange={(e) => setListParams({ size: Number(e.target.value), page: 0 })}
              disabled={loading}
              style={{ width: 120 }}
            >
              {SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}개
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row" style={{ marginTop: 8, justifyContent: "flex-end" }}>
          <span className="muted" style={{ fontSize: 12 }}>
            검색/정렬/표시개수/페이지가 URL에 반영됩니다.
          </span>
        </div>
      </div>

      {/* 에러 */}
      {err && (
        <div className="error" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {/* 최초 로딩 */}
      {showLoadingFirst && (
        <div className="card cardPad emptyState" style={{ marginBottom: 12 }}>
          <div className="emptyTitle">불러오는 중…</div>
          <div className="muted">게시글 목록을 가져오고 있습니다.</div>
        </div>
      )}

      {/* 빈 상태 */}
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

      {/* 목록(카드/프리뷰) */}
      {!showLoadingFirst && !showEmpty && (
        <div className="postList">
          {(data?.items ?? []).map((p) => {
            // 2순위에서 summary를 서버가 내려주면 여기가 진짜 미리보기로 채워짐
            const preview = String((p as any).summary ?? "").trim() || "…";

            return (
              <article
                key={p.id}
                className="card cardPad postCard"
                tabIndex={0}
                role="link"
                aria-label={`게시글 ${p.id} 열기`}
                onClick={() => navigate(`/posts/${p.id}`, { state: { from } })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate(`/posts/${p.id}`, { state: { from } });
                }}
              >
                <div className="postTop">
                  <div className="postTitle">
                    <Link
                      to={`/posts/${p.id}`}
                      state={{ from }}
                      className="postTitleLink"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {highlightText(p.title, qParam)}
                    </Link>
                  </div>
                  <span className="pill mono">임시ID #{p.id}</span>
                </div>

                <div className="postPreview">{highlightText(preview, qParam)}</div>

                <div className="postMeta">
                  <span className="muted">수정 {formatDate(p.updatedAt)}</span>
                  <span className="muted">·</span>
                  <span className="muted">클릭해서 열기</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <button className="btn" disabled={loading || pageParam <= 0} onClick={() => setListParams({ page: pageParam - 1 })}>
          이전
        </button>

        <span className="muted">
          {Math.min(pageParam + 1, totalPages)} / {totalPages}
        </span>

        <button
          className="btn"
          disabled={loading || (data ? pageParam >= totalPages - 1 : true)}
          onClick={() => setListParams({ page: pageParam + 1 })}
        >
          다음
        </button>
      </div>
    </div>
  );
}