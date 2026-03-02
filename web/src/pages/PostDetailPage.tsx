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

  if (err) return <div style={{ color: "crimson" }}>{err}</div>;
  if (!post) return <div>로딩중…</div>;

  return (
    <div>
      <h2 style={{ margin: "0 0 8px" }}>{post.title}</h2>
      <div style={{ color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
        생성: {new Date(post.createdAt).toLocaleString()} / 수정: {new Date(post.updatedAt).toLocaleString()}
      </div>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
          padding: 12,
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: 8,
        }}
      >
        {post.content}
      </pre>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Link to={`/posts/${post.id}/edit`}>수정</Link>
        <button onClick={onDelete}>삭제</button>
        <div style={{ flex: 1 }} />
        <Link to="/">목록</Link>
      </div>
    </div>
  );
}