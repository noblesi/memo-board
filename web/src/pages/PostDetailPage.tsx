import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { deletePost, getPost, type Post } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getLastList } from "../lib/navMemory";

type Flash = { type: "success" | "error"; message: string };
type NavState = { from?: string; flash?: Flash };

export default function PostDetailPage() {
  const { id } = useParams();
  const postId = id ? Number(id) : NaN;
  const isValidId = Number.isFinite(postId) && postId > 0;

  const nav = useNavigate();
  const location = useLocation();
  const backTo = (location.state as NavState | null)?.from ?? getLastList("/");

  const { user, isAuthenticated } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidId) {
      setErr("잘못된 접근입니다.");
      return;
    }

    setLoading(true);
    setErr(null);

    getPost(postId)
      .then(setPost)
      .catch((e) => setErr(String((e as any)?.message ?? e)))
      .finally(() => setLoading(false));
  }, [postId, isValidId]);

  const canManage = useMemo(() => {
    if (!isAuthenticated || !user || !post) return false;
    return user.role === "ADMIN" || user.loginId === post.authorName;
  }, [isAuthenticated, user, post]);

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

  if (err) {
    return (
      <div className="detailShell">
        <Link to={backTo} className="btn btnLink">
          ← 목록으로
        </Link>

        <div className="detailTitleRow">
          <h2 className="pageTitle">게시글</h2>
        </div>

        <div className="error">{err}</div>
      </div>
    );
  }

  if (loading && !post) {
    return (
      <div className="detailShell">
        <Link to={backTo} className="btn btnLink">
          ← 목록으로
        </Link>

        <div className="detailTitleRow">
          <h2 className="pageTitle">게시글</h2>
        </div>

        <div className="card cardPad emptyState">
          <div className="emptyTitle">불러오는 중…</div>
          <div className="muted">게시글 내용을 가져오고 있습니다.</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="detailShell">
        <Link to={backTo} className="btn btnLink">
          ← 목록으로
        </Link>

        <div className="detailTitleRow">
          <h2 className="pageTitle">게시글</h2>
        </div>

        <div className="card cardPad emptyState">
          <div className="emptyTitle">데이터가 없습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="detailShell">
      <Link to={backTo} className="btn btnLink">
        ← 목록으로
      </Link>

      <div className="detailTitleRow">
        <div>
          <div className="pageEyebrow">게시글 상세</div>
          <h2 className="pageTitle">{post.title}</h2>
        </div>
      </div>

      <article className="card cardPad detailCard">
        <div className="detailMetaRow">
          <span className="pill">{post.authorName ?? "알 수 없음"}</span>
          <span className="muted">
            작성 {new Date(post.createdAt).toLocaleString()}
          </span>
          {post.updatedAt !== post.createdAt && (
            <span className="muted">
              수정 {new Date(post.updatedAt).toLocaleString()}
            </span>
          )}
        </div>

        <section className="detailSection">
          <div className="detailLabel">내용</div>
          <div className="detailContent">{post.content}</div>
        </section>
      </article>

      <div className="detailActionsOutside">
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

            <button
              type="button"
              className="btn"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "삭제 중…" : "삭제"}
            </button>
          </>
        )}

        <Link to={backTo} className="btn btnPrimary">
          목록으로
        </Link>
      </div>
    </div>
  );
}