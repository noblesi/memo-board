import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deletePost, getPost } from "../lib/api";
import type { Post } from "../lib/api";

export default function PostDetailPage() {
  const { id } = useParams();
  const postId = id ? Number(id) : NaN;
  const isValidId = Number.isFinite(postId) && postId > 0;

  const nav = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  async function onDelete() {
    if (!post) return;
    if (deleting) return;

    const ok = confirm("정말 삭제할까요? (되돌릴 수 없습니다)");
    if (!ok) return;

    setDeleting(true);
    setErr(null);

    try {
      await deletePost(postId);
      nav("/");
    } catch (e: any) {
      setErr(String(e?.message ?? e));
      setDeleting(false);
    }
  }

  if (err) {
    return (
      <div>
        <h2 className="pageTitle">게시글</h2>
        <div className="error" style={{ marginBottom: 12 }}>
          {err}
        </div>
        <Link to="/" className="btn btnLink">
          목록으로
        </Link>
      </div>
    );
  }

  if (loading && !post) {
    return (
      <div>
        <h2 className="pageTitle">게시글</h2>
        <div className="card cardPad emptyState" style={{ marginBottom: 12 }}>
          <div className="emptyTitle">불러오는 중…</div>
          <div className="muted">게시글 내용을 가져오고 있습니다.</div>
        </div>
        <Link to="/" className="btn btnLink">
          목록으로
        </Link>
      </div>
    );
  }

  if (!post) {
    return (
      <div>
        <h2 className="pageTitle">게시글</h2>
        <div className="muted">데이터가 없습니다.</div>
        <div style={{ marginTop: 12 }}>
          <Link to="/" className="btn btnLink">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="pageTitle">{post.title}</h2>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          생성: {formatDate(post.createdAt)} · 수정: {formatDate(post.updatedAt)}
        </div>
        <span className="pill">#{post.id}</span>
      </div>

      <div className="card cardPad">
        <pre className="mono" style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {post.content}
        </pre>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <Link to={`/posts/${post.id}/edit`} className="btn btnPrimary">
          수정
        </Link>

        <button className="btn btnDanger" onClick={onDelete} disabled={deleting}>
          {deleting ? "삭제 중…" : "삭제"}
        </button>

        <div className="spacer" />

        <Link to="/" className="btn btnLink">
          목록
        </Link>
      </div>
    </div>
  );
}