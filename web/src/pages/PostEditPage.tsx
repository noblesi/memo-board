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

  const [loading, setLoading] = useState(false); // edit 로드
  const [saving, setSaving] = useState(false); // submit
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  // edit 모드면 기존 글 로드
  useEffect(() => {
    if (mode !== "edit") return;

    if (!isValidId) {
      setErr("잘못된 접근입니다.");
      return;
    }

    setLoading(true);
    setErr(null);

    getPost(postId)
      .then((p) => {
        setTitle(p.title);
        setContent(p.content);
      })
      .catch((e) => setErr(String((e as any)?.message ?? e)))
      .finally(() => setLoading(false));
  }, [mode, postId, isValidId]);

  // 클라이언트 검증 + 안내 문구
  const ui = useMemo(() => {
    const t = title;
    const c = content;

    const titleBlank = t.trim().length === 0;
    const contentBlank = c.trim().length === 0;
    const titleTooLong = t.length > TITLE_MAX;
    const contentTooLong = c.length > CONTENT_MAX;

    const canSubmit = !titleBlank && !contentBlank && !titleTooLong && !contentTooLong && !saving && !loading;

    const titleMsg =
      fieldErrs.title ??
      (titleBlank ? "제목을 입력하세요." : titleTooLong ? `제목은 ${TITLE_MAX}자 이하여야 합니다.` : "");
    const contentMsg =
      fieldErrs.content ??
      (contentBlank ? "내용을 입력하세요." : contentTooLong ? `내용은 ${CONTENT_MAX}자 이하여야 합니다.` : "");

    return { canSubmit, titleMsg, contentMsg, titleTooLong, contentTooLong, titleBlank, contentBlank };
  }, [title, content, fieldErrs, saving, loading]);

  async function onSubmit() {
    setErr(null);
    setFieldErrs({});

    // 프론트에서 1차 차단
    if (!ui.canSubmit) {
      setErr("입력값을 확인해주세요.");
      return;
    }

    setSaving(true);

    try {
      if (mode === "create") {
        const p = await createPost({ title: title.trim(), content: content.trim() });
        nav(`/posts/${p.id}`);
      } else {
        if (!isValidId) {
          setErr("잘못된 접근입니다.");
          setSaving(false);
          return;
        }
        const p = await updatePost(postId, { title: title.trim(), content: content.trim() });
        nav(`/posts/${p.id}`);
      }
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.fieldErrors?.length) {
          const m: Record<string, string> = {};
          for (const fe of e.fieldErrors) m[fe.field] = fe.message;
          setFieldErrs(m);
        }
        setErr(e.message);
        setSaving(false);
        return;
      }

      setErr(String((e as any)?.message ?? e));
      setSaving(false);
    }
  }

  if (mode === "edit" && !isValidId) {
    return <div className="error">잘못된 접근입니다.</div>;
  }

  const cancelTo = mode === "create" ? "/" : `/posts/${postId}`;

  return (
    <div>
      <h2 className="pageTitle">{mode === "create" ? "새 글" : "글 수정"}</h2>

      {err && (
        <div className="error" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {loading && mode === "edit" ? (
        <div className="card cardPad emptyState" style={{ maxWidth: 680 }}>
          <div className="emptyTitle">불러오는 중…</div>
          <div className="muted">게시글 내용을 가져오고 있습니다.</div>
          <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
            <Link className="btn btnLink" to={cancelTo}>
              돌아가기
            </Link>
          </div>
        </div>
      ) : (
        <div className="card cardPad" style={{ maxWidth: 680 }}>
          <div className="stack">
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              maxLength={TITLE_MAX + 200} // 서버 검증은 따로, UI는 조금 여유
            />

            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: ui.titleMsg ? "var(--danger)" : "var(--muted)" }}>{ui.titleMsg}</span>
              <span style={{ color: ui.titleTooLong ? "var(--danger)" : "var(--muted)" }}>
                {title.length}/{TITLE_MAX}
              </span>
            </div>

            <textarea
              className="textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용"
              rows={12}
              maxLength={CONTENT_MAX + 1000}
            />

            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: ui.contentMsg ? "var(--danger)" : "var(--muted)" }}>{ui.contentMsg}</span>
              <span style={{ color: ui.contentTooLong ? "var(--danger)" : "var(--muted)" }}>
                {content.length}/{CONTENT_MAX}
              </span>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <button className="btn btnPrimary" disabled={!ui.canSubmit} onClick={onSubmit}>
                {saving ? (mode === "create" ? "작성 중…" : "저장 중…") : mode === "create" ? "작성" : "저장"}
              </button>

              <Link className="btn btnLink" to={cancelTo}>
                취소
              </Link>

              <div className="spacer" />

              <span className="muted" style={{ fontSize: 12 }}>
                서버 검증 에러는 필드별로 표시됩니다.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}