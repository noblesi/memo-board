import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError, createPost, getPost, updatePost } from "../lib/api";

const TITLE_MAX = 100;
const CONTENT_MAX = 5000;

type Flash = { type: "success" | "error"; message: string };
type NavState = { from?: string; flash?: Flash };

export default function PostEditPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams();
  const postId = id ? Number(id) : NaN;
  const isValidId = Number.isFinite(postId) && postId > 0;

  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as NavState | null)?.from;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // ✅ 미저장(Dirty) 판단용 초기값
  const [initialTitle, setInitialTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");

  const [loading, setLoading] = useState(false); // edit 로드
  const [saving, setSaving] = useState(false); // submit
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  // create 모드 초기값 세팅
  useEffect(() => {
    if (mode !== "create") return;
    setInitialTitle("");
    setInitialContent("");
  }, [mode]);

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

        // ✅ 로드된 시점의 값을 초기값으로 고정
        setInitialTitle(p.title);
        setInitialContent(p.content);
      })
      .catch((e) => setErr(String((e as any)?.message ?? e)))
      .finally(() => setLoading(false));
  }, [mode, postId, isValidId]);

  const dirty = useMemo(() => {
    // loading 중에는 경고 과민 반응 방지
    if (loading) return false;
    return title !== initialTitle || content !== initialContent;
  }, [title, content, initialTitle, initialContent, loading]);

  // ✅ 새로고침/탭닫기/브라우저 종료 시 경고
  useEffect(() => {
    if (!dirty || saving) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // Chrome/Edge에서 경고 트리거
      return "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving]);

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

    return { canSubmit, titleMsg, contentMsg, titleTooLong, contentTooLong };
  }, [title, content, fieldErrs, saving, loading]);

  async function onSubmit() {
    if (saving) return;

    setErr(null);
    setFieldErrs({});

    // 프론트에서 1차 차단
    if (!ui.canSubmit) {
      setErr("입력값을 확인해주세요.");
      return;
    }

    setSaving(true);

    try {
      const payload = { title: title.trim(), content: content.trim() };

      if (mode === "create") {
        const p = await createPost(payload);
        nav(`/posts/${p.id}`, {
          state: {
            from,
            flash: { type: "success", message: "작성되었습니다." },
          } satisfies NavState,
        });
      } else {
        if (!isValidId) {
          setErr("잘못된 접근입니다.");
          setSaving(false);
          return;
        }
        const p = await updatePost(postId, payload);
        nav(`/posts/${p.id}`, {
          state: {
            from,
            flash: { type: "success", message: "저장되었습니다." },
          } satisfies NavState,
        });
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

  const cancelTo = mode === "create" ? from ?? "/" : `/posts/${postId}`;

  function onCancelClick(e: React.MouseEvent) {
    if (saving) {
      e.preventDefault();
      return;
    }
    if (!dirty) return;

    const ok = confirm("저장되지 않은 변경사항이 있습니다. 정말 나갈까요?");
    if (!ok) e.preventDefault();
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <h2 className="pageTitle">{mode === "create" ? "새 글" : "글 수정"}</h2>
        {dirty && <span className="pill">미저장</span>}
      </div>

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
        <div className="card cardPad" style={{ maxWidth: 680 }} aria-busy={saving}>
          <div className="stack">
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목"
              maxLength={TITLE_MAX + 200}
              disabled={saving}
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
              disabled={saving}
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

              <Link className={`btn btnLink ${saving ? "isDisabled" : ""}`} to={cancelTo} onClick={onCancelClick}>
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