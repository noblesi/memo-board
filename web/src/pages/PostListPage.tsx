import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { listPosts } from "../lib/api";
import { rememberLastList, restoreScroll, saveScroll } from "../lib/navMemory";
import Dropdown, { type DropdownOption } from "../components/Dropdown";
import type { PostSummary } from "../lib/api";

function parseNonNegInt(v: string | null, fallback: number) {
  const n = v == null ? NaN : Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 0 ? i : fallback;
}

function escapeRegExp(s: string) {
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

const SORT_OPTIONS: readonly DropdownOption<string>[] = [
  { value: "updatedAt,desc", label: "수정일 최신" },
  { value: "createdAt,desc", label: "생성일 최신" },
  { value: "id,desc", label: "임시ID 최신" },
  { value: "title,asc", label: "제목 A→Z" },
] as const;

const DEFAULT_SORT = "updatedAt,desc";

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
  const mountFromRef = useRef(from);
  const restoredRef = useRef(false);

  const [sp, setSp] = useSearchParams();

  const qParam = sp.get("q") ?? "";
  const pageParam = useMemo(() => parseNonNegInt(sp.get("page"), 0), [sp]);
  const sizeParam = useMemo(() => normalizeSize(parseNonNegInt(sp.get("size"), DEFAULT_SIZE)), [sp]);
  const sortParam = useMemo(() => normalizeSort(sp.get("sort") ?? DEFAULT_SORT), [sp]);

  const [draftQ, setDraftQ] = useState(qParam);
  const [data, setData] = useState<ListState | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setDraftQ(qParam), [qParam]);

  useEffect(() => {
    rememberLastList(from);
  }, [from]);

  useEffect(() => {
    return () => {
      saveScroll(from);
    };
  }, [from]);

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

  useEffect(() => {
    load(pageParam, qParam, sizeParam, sortParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageParam, qParam, sizeParam, sortParam]);

  useEffect(() => {
    if (restoredRef.current) return;
    if (data || err) {
      restoreScroll(mountFromRef.current);
      restoredRef.current = true;
    }
  }, [data, err]);

  useEffect(() => {
    if (!data) return;
    if (loading) return;
    if (data.totalPages <= 0) return;
    if (pageParam < data.totalPages) return;

    setListParams({ page: Math.max(0, data.totalPages - 1) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading, pageParam]);

  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const totalCountText = loading && !data ? "…" : String(data?.totalElements ?? 0);
  const showLoadingFirst = loading && !data;
  const showEmpty = !loading && !!data && data.items.length === 0;
  const hasQuery = qParam.trim().length > 0;

  const sizeOptions: readonly DropdownOption<number>[] = useMemo(
    () => SIZE_OPTIONS.map((n) => ({ value: n, label: `${n}개` })),
    [],
  );

  const canPrev = !loading && pageParam > 0;
  const canNext = !loading && (data ? pageParam < totalPages - 1 : false);
  const pageLabel = `${Math.min(pageParam + 1, totalPages)} / ${totalPages}`;

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 className="pageTitle" style={{ margin: 0 }}>
          게시글
        </h2>
        <Link to="/new" state={{ from }} className="btn">
          새 글
        </Link>
      </div>

      <div className="listContentPad">
        {err && (
          <div className="card cardPad emptyState" style={{ marginBottom: 12 }}>
            <div className="emptyTitle">목록을 불러오지 못했습니다</div>
            <div className="muted">{err}</div>
            <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
              <button className="btn btnPrimary" onClick={() => load(pageParam, qParam, sizeParam, sortParam)} disabled={loading}>
                다시 시도
              </button>
            </div>
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
            <div className="emptyTitle">{hasQuery ? "검색 결과가 없습니다" : "게시글이 없습니다"}</div>
            <div className="muted">
              {hasQuery ? `“${qParam.trim()}”에 대한 결과를 찾지 못했습니다.` : "첫 글을 작성해보세요."}
            </div>

            <div className="row" style={{ justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
              {hasQuery ? (
                <>
                  <button className="btn" onClick={() => clearSearch(true)}>
                    검색 초기화
                  </button>
                  <Link to="/new" state={{ from }} className="btn btnPrimary">
                    새 글 작성
                  </Link>
                </>
              ) : (
                <Link to="/new" state={{ from }} className="btn btnPrimary">
                  새 글 작성
                </Link>
              )}
            </div>
          </div>
        )}

        {!showLoadingFirst && !showEmpty && (
          <div className="postList">
            {(data?.items ?? []).map((p) => {
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
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/posts/${p.id}`, { state: { from } });
                    }
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
      </div>

      <div className="bottomDock">
        <div className="card cardPad bottomDockInner">
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

              <button type="button" className="btn btnPrimary" onClick={() => setListParams({ q: draftQ, page: 0 })} disabled={loading}>
                검색
              </button>
            </div>
          </div>

          <div className="dockSummaryRow">
            <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="pill">총 {totalCountText}개</span>
              {hasQuery && <span className="pill">검색: {qParam.trim()}</span>}
            </div>
            <span className="muted dockHint">검색/정렬/표시개수/페이지가 URL에 반영됩니다.</span>
          </div>

          <div className="dockControlRow">
            <div className="dockControlGroup">
              <span className="muted dockLabel">정렬</span>
              <Dropdown
                value={sortParam}
                options={SORT_OPTIONS}
                onChange={(v) => setListParams({ sort: v, page: 0 })}
                disabled={loading}
                ariaLabel="정렬"
                width={160}
                direction="up"
                align="right"
              />
            </div>

            <div className="dockControlGroup">
              <span className="muted dockLabel">표시</span>
              <Dropdown
                value={sizeParam}
                options={sizeOptions}
                onChange={(v) => setListParams({ size: v, page: 0 })}
                disabled={loading}
                ariaLabel="표시 개수"
                width={120}
                direction="up"
                align="right"
              />
            </div>

            <div className="dockPager">
              <button
                type="button"
                className="btn"
                onClick={() => setListParams({ page: 0 })}
                disabled={!canPrev}
                aria-label="첫 페이지"
                title="첫 페이지"
              >
                처음
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => setListParams({ page: pageParam - 1 })}
                disabled={!canPrev}
                aria-label="이전 페이지"
                title="이전"
              >
                이전
              </button>

              <span className="muted dockPageLabel">{pageLabel}</span>

              <button
                type="button"
                className="btn"
                onClick={() => setListParams({ page: pageParam + 1 })}
                disabled={!canNext}
                aria-label="다음 페이지"
                title="다음"
              >
                다음
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => setListParams({ page: totalPages - 1 })}
                disabled={!canNext}
                aria-label="마지막 페이지"
                title="마지막 페이지"
              >
                마지막
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}