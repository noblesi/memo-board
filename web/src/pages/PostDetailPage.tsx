import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { deletePost, getPost, listPosts, type Post, type PostSummary } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getLastList } from "../lib/navMemory";

type Flash = { type: "success" | "error"; message: string };
type NavState = { from?: string; flash?: Flash };

type InlineListState = {
  items: PostSummary[];
  totalPages: number;
  totalElements: number;
  page: number;
  size: number;
  q: string;
  sort: string;
};

const SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_SIZE = 20;
const SORT_OPTIONS = ["updatedAt,desc", "createdAt,desc", "id,desc", "title,asc"] as const;
const DEFAULT_SORT = "updatedAt,desc";

function parseNonNegInt(v: string | null, fallback: number) {
  const n = v == null ? NaN : Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i >= 0 ? i : fallback;
}

function normalizeSize(n: number) {
  return (SIZE_OPTIONS as readonly number[]).includes(n) ? n : DEFAULT_SIZE;
}

function normalizeSort(s: string) {
  return (SORT_OPTIONS as readonly string[]).includes(s) ? s : DEFAULT_SORT;
}

function readListParams(from: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(from, base);
  const sp = url.searchParams;

  return {
    page: parseNonNegInt(sp.get("page"), 0),
    size: normalizeSize(parseNonNegInt(sp.get("size"), DEFAULT_SIZE)),
    q: sp.get("q")?.trim() ?? "",
    sort: normalizeSort(sp.get("sort") ?? DEFAULT_SORT),
  };
}

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

function formatWrittenAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diffMs < oneDay) {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export default function PostDetailPage() {
  const { id } = useParams();
  const postId = id ? Number(id) : NaN;
  const isValidId = Number.isFinite(postId) && postId > 0;

  const nav = useNavigate();
  const location = useLocation();
  const backTo = (location.state as NavState | null)?.from ?? getLastList("/");

  const { user } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [listState, setListState] = useState<InlineListState | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listErr, setListErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidId) {
      setPost(null);
      setErr("잘못된 접근입니다.");
      return;
    }

    setLoading(true);
    setErr(null);

    getPost(postId)
      .then(setPost)
      .catch((e) => {
        setPost(null);
        setErr(String((e as any)?.message ?? e));
      })
      .finally(() => setLoading(false));
  }, [postId, isValidId]);

  useEffect(() => {
    const params = readListParams(backTo);

    setListLoading(true);
    setListErr(null);

    listPosts({
      page: params.page,
      size: params.size,
      sort: params.sort,
      q: params.q || undefined,
    })
      .then((res) => {
        setListState({
          items: res.items,
          totalPages: res.page.totalPages,
          totalElements: res.page.totalElements,
          page: params.page,
          size: params.size,
          q: params.q,
          sort: params.sort,
        });
      })
      .catch((e) => {
        setListState(null);
        setListErr(String((e as any)?.message ?? e));
      })
      .finally(() => setListLoading(false));
  }, [backTo]);

  const canManage = useMemo(() => {
    if (!user || !post) return false;
    if (user.role === "ADMIN") return true;
    return !!post.authorLoginId && user.loginId === post.authorLoginId;
  }, [user, post]);

  const hasCurrentInInlineList = useMemo(() => {
    if (!post || !listState) return false;
    return listState.items.some((item) => item.id === post.id);
  }, [post, listState]);

  async function onDelete() {
    if (!post || deleting || !canManage) return;

    const ok = confirm("정말 삭제할까요? (되돌릴 수 없습니다)");
    if (!ok) return;

    setDeleting(true);
    setErr(null);

    try {
      await deletePost(postId);
      nav(backTo, {
        state: {
          flash: { type: "success", message: "삭제되었습니다." },
        } satisfies NavState,
      });
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setDeleting(false);
    }
  }

  return (
    <div className="detailShell">
      <div className="detailHero">
        <div>
          <div className="detailEyebrow">Post Detail</div>
          <h2 className="pageTitle detailTitle">{post?.title ?? "게시글"}</h2>
        </div>

        {post && (
          <div className="detailMetaRow">
            <span className="pill">작성자 {post.authorLoginId ?? "알 수 없음"}</span>
            <span className="pill">작성 {formatDateTime(post.createdAt)}</span>
            {post.updatedAt !== post.createdAt && (
              <span className="pill">수정 {formatDateTime(post.updatedAt)}</span>
            )}
          </div>
        )}
      </div>

      {err && <div className="error">{err}</div>}

      {loading && !post ? (
        <div className="card cardPad emptyState detailBodyCard">
          <div className="emptyTitle">불러오는 중…</div>
          <div className="muted">게시글 내용을 가져오고 있습니다.</div>
        </div>
      ) : post ? (
        <>
          <article className="card cardPad detailBodyCard">
            <div className="detailSectionTitle">내용</div>
            <div className="detailContent">{post.content}</div>
          </article>

          <div className="detailActionsOutside detailActions">
            {canManage && (
              <>
                <Link
                  to={`/posts/${post.id}/edit`}
                  state={{ from: backTo }}
                  className={`btn ${deleting ? "isDisabled" : ""}`}
                  onClick={(e) => {
                    if (deleting) e.preventDefault();
                  }}
                >
                  수정
                </Link>

                <button type="button" className="btn" onClick={onDelete} disabled={deleting}>
                  {deleting ? "삭제 중…" : "삭제"}
                </button>
              </>
            )}
          </div>
        </>
      ) : (
        !err && (
          <div className="card cardPad emptyState detailBodyCard">
            <div className="emptyTitle">데이터가 없습니다.</div>
          </div>
        )
      )}

      <section className="detailInlineSection">
        <div className="detailInlineHeader">
          <div>
            <div className="detailSectionTitle">아래에서 바로 다른 글 보기</div>
            <div className="muted detailInlineHint">
              상세페이지를 벗어나지 않고 같은 목록에서 다른 글로 이동할 수 있습니다.
            </div>
          </div>

          <div className="detailInlineMeta">
            <span className="pill">총 {listLoading && !listState ? "…" : listState?.totalElements ?? 0}개</span>
            {listState && (
              <span className="pill">
                페이지 {Math.min(listState.page + 1, Math.max(1, listState.totalPages))} /{" "}
                {Math.max(1, listState.totalPages)}
              </span>
            )}
            {listState?.q && <span className="pill">검색: {listState.q}</span>}
          </div>
        </div>

        {listErr && <div className="error">{listErr}</div>}

        {listLoading && !listState ? (
          <div className="card cardPad emptyState detailInlineLoading">
            <div className="emptyTitle">목록을 불러오는 중…</div>
            <div className="muted">상세페이지 아래에 같은 목록을 붙이고 있습니다.</div>
          </div>
        ) : listState && listState.items.length > 0 ? (
          <div className="postList detailInlineList">
            {listState.items.map((item) => {
              const active = item.id === post?.id;

              return (
                <article
                  key={item.id}
                  className={`card cardPad postCard postCardCompact detailInlineItem ${active ? "isActive" : ""}`}
                  tabIndex={0}
                  role="link"
                  aria-current={active ? "page" : undefined}
                  aria-label={active ? `현재 보고 있는 게시글 ${item.id}` : `게시글 ${item.id} 열기`}
                  onClick={() => {
                    if (!active) nav(`/posts/${item.id}`, { state: { from: backTo } });
                  }}
                  onKeyDown={(e) => {
                    if (active) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      nav(`/posts/${item.id}`, { state: { from: backTo } });
                    }
                  }}
                >
                  <div className="postCardMain">
                    <Link
                      to={`/posts/${item.id}`}
                      state={{ from: backTo }}
                      className="postTitleOnly"
                      onClick={(e) => {
                        if (active) e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      {item.title}
                    </Link>
                  </div>

                  <div className="postCardSide">
                    {item.authorLoginId && <div className="postSideAuthor">{item.authorLoginId}</div>}
                    <div className="postSideTime">{formatWrittenAt(item.createdAt)}</div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          !listErr && (
            <div className="card cardPad emptyState detailInlineEmpty">
              <div className="emptyTitle">같이 보여줄 목록이 없습니다.</div>
              <div className="muted">현재 조건에 해당하는 게시글이 없습니다.</div>
            </div>
          )
        )}

        {post && listState && !hasCurrentInInlineList && !listLoading && !listErr && (
          <div className="muted detailInlineHint">
            현재 보고 있는 글이 지금 목록 조건에는 포함되지 않아 하이라이트되지 않았습니다.
          </div>
        )}
      </section>
    </div>
  );
}