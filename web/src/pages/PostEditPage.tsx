import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createPost, getPost, updatePost } from "../lib/api";

export default function PostEditPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const postId = Number(id);
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit") return;
    getPost(postId)
      .then((p) => {
        setTitle(p.title);
        setContent(p.content);
      })
      .catch((e) => setErr(String(e?.message ?? e)));
  }, [mode, postId]);

  async function onSubmit() {
    setErr(null);
    try {
      if (mode === "create") {
        const p = await createPost({ title, content });
        nav(`/posts/${p.id}`);
      } else {
        const p = await updatePost(postId, { title, content });
        nav(`/posts/${p.id}`);
      }
    } catch (e: any) {
      setErr(String(e?.message ?? e));
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{mode === "create" ? "새 글" : "글 수정"}</h2>
      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "grid", gap: 8 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" style={{ padding: 8 }} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용"
          rows={12}
          style={{ padding: 8, resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onSubmit}>{mode === "create" ? "작성" : "저장"}</button>
          <Link to={mode === "create" ? "/" : `/posts/${postId}`}>취소</Link>
        </div>
      </div>
    </div>
  );
}