import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ApiError, createPost, getPost, updatePost } from "../lib/api";

const TITLE_MAX = 100;
const CONTENT_MAX = 5000;

export default function PostEditPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const postId = id ? Number(id) : NaN;
  const isValidId = Number.isFinite(postId) && postId > 0;

  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  // edit 모드면 기존 글 로드
  useEffect(() => {
    if (mode !== "edit") return;

    if (!isValidId) {
      setErr("잘못된 접근입니다.");
      return;
    }

    getPost(postId)
      .then((p) => {
        setTitle(p.title);
        setContent(p.content);
      })
      .catch((e) => setErr(String((e as any)?.message ?? e)));
  }, [mode, postId, isValidId]);

  // 클라이언트 검증 + 안내 문구
  const ui = useMemo(() => {
    const t = title;
    const c = content;

    const titleBlank = t.trim().length === 0;
    const contentBlank = c.trim().length === 0;
    const titleTooLong = t.length > TITLE_MAX;
    const contentTooLong = c.length > CONTENT_MAX;

    const canSubmit = !titleBlank && !contentBlank && !titleTooLong && !contentTooLong;

    const titleMsg =
      fieldErrs.title ??
      (titleBlank ? "제목을 입력하세요." : titleTooLong ? `제목은 ${TITLE_MAX}자 이하여야 합니다.` : "");
    const contentMsg =
      fieldErrs.content ??
      (contentBlank ? "내용을 입력하세요." : contentTooLong ? `내용은 ${CONTENT_MAX}자 이하여야 합니다.` : "");

    return { canSubmit, titleMsg, contentMsg, titleTooLong, contentTooLong };
  }, [title, content, fieldErrs]);

  async function onSubmit() {
    setErr(null);
    setFieldErrs({});

    // 프론트에서 1차 차단(서버 validation 전에)
    if (!ui.canSubmit) {
      setErr("입력값을 확인해주세요.");
      return;
    }

    try {
      if (mode === "create") {
        const p = await createPost({ title: title.trim(), content: content.trim() });
        nav(`/posts/${p.id}`);
      } else {
        if (!isValidId) {
          setErr("잘못된 접근입니다.");
          return;
        }
        const p = await updatePost(postId, { title: title.trim(), content: content.trim() });
        nav(`/posts/${p.id}`);
      }
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        // 서버에서 준 fieldErrors를 필드별로 표시
        if (e.fieldErrors?.length) {
          const m: Record<string, string> = {};
          for (const fe of e.fieldErrors) m[fe.field] = fe.message;
          setFieldErrs(m);
        }
        setErr(e.message);
        return;
      }
      setErr(String((e as any)?.message ?? e));
    }
  }

  if (mode === "edit" && !isValidId) {
    return <div style={{ color: "crimson" }}>잘못된 접근입니다.</div>;
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>{mode === "create" ? "새 글" : "글 수정"}</h2>
      {err && <div style={{ color: "crimson", marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: ui.titleMsg ? "crimson" : "rgba(255,255,255,0.6)" }}>{ui.titleMsg}</span>
          <span style={{ color: ui.titleTooLong ? "crimson" : "rgba(255,255,255,0.6)" }}>
            {title.length}/{TITLE_MAX}
          </span>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="내용"
          rows={12}
          style={{ resize: "vertical" }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
          <span style={{ color: ui.contentMsg ? "crimson" : "rgba(255,255,255,0.6)" }}>{ui.contentMsg}</span>
          <span style={{ color: ui.contentTooLong ? "crimson" : "rgba(255,255,255,0.6)" }}>
            {content.length}/{CONTENT_MAX}
          </span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={!ui.canSubmit} onClick={onSubmit}>
            {mode === "create" ? "작성" : "저장"}
          </button>
          <Link to={mode === "create" ? "/" : `/posts/${postId}`}>취소</Link>
        </div>
      </div>
    </div>
  );
}