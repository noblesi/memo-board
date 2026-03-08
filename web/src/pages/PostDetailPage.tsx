import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { deletePost, getPost } from "../lib/api";
import { getLastList } from "../lib/navMemory";
import { useAuth } from "../lib/auth";
import type { Post } from "../lib/api";

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
    if (!user || !post) return false;
    if (user.role === "ADMIN") return true;
    return !!post.authorName && user.loginId === post.authorName;
  }, [user, post]);

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
      <div>
        <div className="detailHeaderBar">
          <Link to={backTo} className="btn btnLink">
            ← 목록으로
          </Link>
        </div>

        <h2 className="pageTitle">게시글</h2>

        <div className="error" style={{ marginBottom: 12 }}>
          {err}
        </div>
      </div>
    );
  }

  if (loading && !post) {
    return (
      <div>
        <div className="detailHeaderBar">
          <Link to={backTo} className="btn btnLink">
            ← 목록으로
          </Link>
        </div>

        <h2 className="pageTitle">게시글</h2>

        <div className="card cardPad emptyState">
          <div className="emptyTitle">불러오는 중…</div>
          <div className="muted">게시글 내용을 가져오고 있습니다.</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div>
        <div className="detailHeaderBar">
          <Link to={backTo} className="btn btnLink">
            ← 목록으로
          </Link>
        </div>

        <h2 className="pageTitle">게시글</h2>
        <div className="muted">데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div aria-busy={deleting}>
      <div className="detailHeaderBar">
        <Link to={backTo} className="btn btnLink">
          ← 목록으로
        </Link>
      </div>

      <section className="detailHero card cardPad">
        <div className="detailEyebrow">게시글 상세</div>
        <h2 className="pageTitle detailTitle">{post.title}</h2>

        <div className="detailMetaRow">
          {post.authorName && <span className="pill">작성자 {post.authorName}</span>}
          <span className="pill">수정 {new Date(post.updatedAt).toLocaleString("ko-KR")}</span>
        </div>
      </section>

      <section className="card cardPad detailBodyCard">
        <div className="detailSectionTitle">내용</div>
        <div className="detailContent">{post.content}</div>
      </section>

      <div className="detailActionsOutside">
        <div className="detailActions">
          {canManage ? (
            <>
              <Link
                to={`/posts/${postId}/edit`}
                state={{ from: backTo }}
                className={`btn btnPrimary ${deleting ? "isDisabled" : ""}`}
                aria-disabled={deleting}
                onClick={(e) => {
                  if (deleting) e.preventDefault();
                }}
              >
                수정
              </Link>

              <button className="btn btnDanger" onClick={onDelete} disabled={deleting}>
                {deleting ? "삭제 중…" : "삭제"}
              </button>
            </>
          ) : !isAuthenticated ? (
            <Link to="/login" state={{ from: `/posts/${postId}` }} className="btn btnLink">
              로그인
            </Link>
          ) : null}

          <div className="spacer" />

          <Link to={backTo} className="btn btnLink">
            목록으로
          </Link>
        </div>
      </div>
    </div>
  );
}