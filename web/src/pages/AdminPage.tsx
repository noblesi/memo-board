import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, deletePost, listPosts, type PostSummary } from "../lib/api";
import { useAuth } from "../lib/auth";

type Flash = { type: "success" | "error"; message: string };
type NavState = { from?: string; flash?: Flash };

function parseNonNegInt(v: string | null, fallback: number) {
  const n = v == null ? NaN : Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 0 ? i : fallback;
}

const PAGE_SIZE = 20;

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export default function AdminPage() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();

  const qParam = sp.get("q") ?? "";
  const pageParam = useMemo(() => parseNonNegInt(sp.get("page"), 0), [sp]);

  const [draftQ, setDraftQ] = useState(qParam);
  const [items, setItems] = useState<PostSummary[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setDraftQ(qParam);
  }, [qParam]);

  async function load(page: number, q: string) {
    setLoading(true);
    setErr(null);

    try {
      const res = await listPosts({
        page,
        size: PAGE_SIZE,
        sort: "updatedAt,desc",
        q: q.trim() ? q.trim() : undefined,
      });

      setItems(res.items);
      setTotalPages(Math.max(1, res.page.totalPages));
      setTotalElements(res.page.totalElements);
    } catch (e) {
      setErr(String((e as any)?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(pageParam, qParam);
  }, [pageParam, qParam]);

  function setParams(next: Partial<{ q: string; page: number }>) {
    const q = (next.q ?? qParam).trim();
    const page = Math.max(0, next.page ?? pageParam);

    const params: Record<string, string> = {
      page: String(page),
    };

    if (q) params.q = q;
    setSp(params);
  }

  async function onDelete(post: PostSummary) {
    if (deletingId != null) return;

    const ok = confirm(`"${post.title}" 글을 삭제할까요?`);
    if (!ok) return;

    setDeletingId(post.id);
    setErr(null);

    try {
      await deletePost(post.id);

      const shouldMovePrev = items.length === 1 && pageParam > 0;
      if (shouldMovePrev) {
        setParams({ page: pageParam - 1 });
      } else {
        await load(pageParam, qParam);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setErr(e.message);
      } else {
        setErr(String((e as any)?.message ?? e));
      }
    } finally {
      setDeletingId(null);
    }
  }

  const from = `/admin?page=${pageParam}${qParam ? `&q=${encodeURIComponent(qParam)}` : ""}`;
  const canPrev = !loading && pageParam > 0;
  const canNext = !loading && pageParam < totalPages - 1;

  return (
    <div className="adminShell">
      <section className="card cardPad adminHero">
        <div className="adminHeroTop">
          <div>
            <div className="detailEyebrow">Admin</div>
            <h2 className="pageTitle adminTitle">관리자 페이지</h2>
            <div className="muted">게시글 조회와 삭제를 빠르게 처리하는 최소 관리 화면입니다.</div>
          </div>

          <div className="adminHeroMeta">
            <span className="pill">관리자 {user?.loginId ?? "-"}</span>
            <span className="pill">총 게시글 {totalElements}개</span>
          </div>
        </div>

        <div className="adminSearchRow">
          <input
            className="input"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder="제목/내용 검색"
            onKeyDown={(e) => {
              if (e.key === "Enter") setParams({ q: draftQ, page: 0 });
              if (e.key === "Escape") {
                setDraftQ("");
                setParams({ q: "", page: 0 });
              }
            }}
          />
          <button className="btn btnPrimary" onClick={() => setParams({ q: draftQ, page: 0 })}>
            검색
          </button>
          <button className="btn" onClick={() => { setDraftQ(""); setParams({ q: "", page: 0 }); }}>
            초기화
          </button>
        </div>
      </section>

      {err && (
        <div className="error" style={{ marginTop: 12 }}>
          {err}
        </div>
      )}

      <section className="card cardPad adminTableCard">
        <div className="adminTableHead">
          <div className="adminHeadTitle">게시글 관리</div>
          <div className="muted">
            페이지 {Math.min(pageParam + 1, totalPages)} / {totalPages}
          </div>
        </div>

        {loading ? (
          <div className="emptyState">
            <div className="emptyTitle">불러오는 중…</div>
            <div className="muted">관리용 게시글 목록을 가져오고 있습니다.</div>
          </div>
        ) : items.length === 0 ? (
          <div className="emptyState">
            <div className="emptyTitle">표시할 게시글이 없습니다</div>
            <div className="muted">
              {qParam.trim() ? `“${qParam.trim()}” 검색 결과가 없습니다.` : "아직 등록된 게시글이 없습니다."}
            </div>
          </div>
        ) : (
          <div className="adminList">
            {items.map((post) => {
              const deleting = deletingId === post.id;

              return (
                <article key={post.id} className="adminRow">
                  <div className="adminRowMain">
                    <Link
                      to={`/posts/${post.id}`}
                      state={{ from } satisfies NavState}
                      className="adminRowTitle"
                    >
                      {post.title}
                    </Link>

                    <div className="adminRowMeta">
                      <span className="pill">ID {post.id}</span>
                      <span className="pill">작성자 {post.authorLoginId ?? "-"}</span>
                      <span className="pill">수정 {formatDateTime(post.updatedAt)}</span>
                    </div>

                    <div className="adminRowSummary">{post.summary}</div>
                  </div>

                  <div className="adminRowActions">
                    <Link
                      to={`/posts/${post.id}`}
                      state={{ from } satisfies NavState}
                      className="btn"
                    >
                      보기
                    </Link>

                    <button
                      type="button"
                      className="btn btnDanger"
                      onClick={() => onDelete(post)}
                      disabled={deletingId != null}
                    >
                      {deleting ? "삭제 중…" : "삭제"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="adminPager">
          <button className="btn" onClick={() => setParams({ page: 0 })} disabled={!canPrev}>
            처음
          </button>
          <button className="btn" onClick={() => setParams({ page: pageParam - 1 })} disabled={!canPrev}>
            이전
          </button>
          <span className="muted adminPagerLabel">
            {Math.min(pageParam + 1, totalPages)} / {totalPages}
          </span>
          <button className="btn" onClick={() => setParams({ page: pageParam + 1 })} disabled={!canNext}>
            다음
          </button>
          <button className="btn" onClick={() => setParams({ page: totalPages - 1 })} disabled={!canNext}>
            마지막
          </button>
        </div>
      </section>
    </div>
  );
}