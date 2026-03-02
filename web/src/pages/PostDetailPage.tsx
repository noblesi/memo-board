import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deletePost, getPost } from "../lib/api";
import type { Post } from "../lib/api";

export default function PostDetailPage() {
  const { id } = useParams();
  const postId = Number(id);
  const nav = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getPost(postId)
      .then(setPost)
      .catch((e) => setErr(String((e as any)?.message ?? e)));
  }, [postId]);

  async function onDelete() {
    if (!confirm("삭제할까요?")) return;
    try {
      await deletePost(postId);
      nav("/");
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }

  if (err) return <div className="error">{err}</div>;
  if (!post) return <div className="muted">로딩중…</div>;

  return (
    <div>
      <h2 className="pageTitle">{post.title}</h2>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          생성: {new Date(post.createdAt).toLocaleString()} · 수정: {new Date(post.updatedAt).toLocaleString()}
        </div>
        <span className="pill">#{post.id}</span>
      </div>

      <div className="card cardPad">
        <pre className="mono" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
          {post.content}
        </pre>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <Link to={`/posts/${post.id}/edit`} className="btn btnPrimary">
          수정
        </Link>
        <button className="btn btnDanger" onClick={onDelete}>
          삭제
        </button>
        <div className="spacer" />
        <Link to="/" className="btn btnLink">
          목록
        </Link>
      </div>
    </div>
  );
}