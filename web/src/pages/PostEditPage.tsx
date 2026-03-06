import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError, createPost, getPost, updatePost } from "../lib/api";
import { getLastList } from "../lib/navMemory";

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
  const listBack = from ?? getLastList("/");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [initialTitle, setInitialTitle] = useState("");
  const [initialContent, setInitialContent] = useState("");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode !== "create") return;
    setInitialTitle("");
    setInitialContent("");
  }, [mode]);

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
        setInitialTitle(p.title);
        setInitialContent(p.content);
      })
      .catch((e) => setErr(String((e as any)?.message ?? e)))
      .finally(() => setLoading(false));
  }, [mode, postId, isValidId]);

  const dirty = useMemo(() => {
    if (loading) return false;
    return title !== initialTitle || content !== initialContent;
  }, [title, content, initialTitle, initialContent, loading]);

  useEffect(() => {
    if (!dirty || saving) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, saving]);

  const ui = useMemo(() => {
    const t = title;
    const c = content;

    const titleBlank = t.trim().length === 0;
    const contentBlank = c.trim().length === 0;
    const titleTooLong = t.length > TITLE_MAX;
    const contentTooLong = c.length > CONTENT_MAX;

    const canSubmit =
      !titleBlank && !contentBlank && !titleTooLong && !contentTooLong && !saving && !loading;

    const titleMsg =
      fieldErrs.title ??
      (titleBlank ? "제목을 입력하세요." : titleTooLong ? `제목은 ${TITLE_MAX}자 이하여야 합니다.` : "");

    const contentMsg =
      fieldErrs.content ??
      (contentBlank ? "내용을 입력하세요." : contentTooLong ? `내용은 ${CONTENT_MAX}자 이하여야 합니다.` : "");

    return {
      canSubmit,
      titleMsg,
      contentMsg,
      titleTooLong,
      contentTooLong,
      titleBlank,
      contentBlank,
    };
  }, [title, content, fieldErrs, saving, loading]);

  const cancelTo = mode === "create" ? listBack : `/posts/${postId}`;
  const cancelState = mode === "create" ? undefined : { from: listBack };

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (saving) return;

    setErr(null);
    setFieldErrs({});

    if (!ui.canSubmit) {
      setErr("입력값을 확인해주세요.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
      };

      if (mode === "create") {
        const p = await createPost(payload);
        nav(`/posts/${p.id}`, {
          state: {
            from: listBack,
            flash: { type: "success", message: "작성되었습니다." },
          } satisfies NavState,
        });
        return;
      }

      if (!isValidId) {
        setErr("잘못된 접근입니다.");
        setSaving(false);
        return;
      }

      const p = await updatePost(postId, payload);
      nav(`/posts/${p.id}`, {
        state: {
          from: listBack,
          flash: { type: "success", message: "저장되었습니다." },
        } satisfies NavState,
      });
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.fieldErrors?.length) {
          const next: Record<string, string> = {};
          for (const fe of e.fieldErrors) next[fe.field] = fe.message;
          setFieldErrs(next);
        }
        setErr(e.message);
        setSaving(false);
        return;
      }

      setErr(String((e as any)?.message ?? e));
      setSaving(false);
    }
  }

  function onCancelClick(e: React.MouseEvent) {
    if (saving) {
      e.preventDefault();
      return;
    }

    if (!dirty) return;

    const ok = confirm("저장되지 않은 변경사항이 있습니다. 정말 나갈까요?");
    if (!ok) e.preventDefault();
  }

  function renderActions() {
    return (
      <div className="editActions">
        <button className="btn btnPrimary" disabled={!ui.canSubmit} type="submit">
          {saving ? (mode === "create" ? "작성 중…" : "저장 중…") : mode === "create" ? "작성" : "저장"}
        </button>

        <Link
          className={`btn btnLink ${saving ? "isDisabled" : ""}`}
          to={cancelTo}
          state={cancelState}
          onClick={onCancelClick}
        >
          취소
        </Link>

        <div className="spacer" />

        <span className="editActionHint">서버 검증 에러는 필드별로 표시됩니다.</span>
      </div>
    );
  }

  if (mode === "edit" && !isValidId) {
    return <div className="error">잘못된 접근입니다.</div>;
  }

  return (
    <div>
      <div className="editHeaderBar">
        <Link to={cancelTo} state={cancelState} className="btn btnLink" onClick={onCancelClick}>
          ← {mode === "create" ? "목록으로" : "상세로"}
        </Link>
        {dirty && <span className="pill">미저장</span>}
      </div>

      <div className="editTitleRow">
        <div>
          <div className="editEyebrow">{mode === "create" ? "Create Post" : "Edit Post"}</div>
          <h2 className="pageTitle editPageTitle">{mode === "create" ? "새 글 작성" : "게시글 수정"}</h2>
        </div>
      </div>

      {err && (
        <div className="error" style={{ marginBottom: 12 }}>
          {err}
        </div>
      )}

      {loading && mode === "edit" ? (
        <div className="card cardPad emptyState editShell">
          <div className="emptyTitle">불러오는 중…</div>
          <div className="muted">게시글 내용을 가져오고 있습니다.</div>
          <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
            <Link className="btn btnLink" to={cancelTo} state={cancelState}>
              돌아가기
            </Link>
          </div>
        </div>
      ) : (
        <form className="editShell" onSubmit={onSubmit} aria-busy={saving}>
          {saving && (
            <div className="card cardPad editSavingBanner">
              <div className="editSavingTitle">{mode === "create" ? "작성 중…" : "저장 중…"}</div>
              <div className="muted">잠시만 기다려주세요. 처리 중에는 다른 동작이 잠깁니다.</div>
            </div>
          )}

          <section className="card cardPad editCard">
            <div className="editSectionTop">
              <div className="editSectionTitle">기본 정보</div>
              <div className="editSectionDesc">제목은 목록과 상세 페이지에서 가장 먼저 보이는 정보입니다.</div>
            </div>

            <label className="editField">
              <span className="editLabel">제목</span>
              <input
                className={`input ${ui.titleMsg ? "inputInvalid" : ""}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예) 검색 상태가 유지되는 게시글 목록 UX 정리"
                maxLength={TITLE_MAX + 200}
                disabled={saving}
              />
              <div className="editFieldMeta">
                <span className={ui.titleMsg ? "fieldErrorText" : "muted"}>{ui.titleMsg || "한눈에 내용을 알 수 있게 작성하세요."}</span>
                <span className={ui.titleTooLong ? "fieldErrorText" : "muted"}>
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
            </label>
          </section>

          <section className="card cardPad editCard">
            <div className="editSectionTop">
              <div className="editSectionTitle">본문</div>
              <div className="editSectionDesc">줄바꿈은 그대로 저장되며, 상세 페이지에서 읽기 편하게 표시됩니다.</div>
            </div>

            <label className="editField">
              <span className="editLabel">내용</span>
              <textarea
                className={`textarea editTextarea ${ui.contentMsg ? "inputInvalid" : ""}`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요."
                rows={14}
                maxLength={CONTENT_MAX + 1000}
                disabled={saving}
              />
              <div className="editFieldMeta">
                <span className={ui.contentMsg ? "fieldErrorText" : "muted"}>
                  {ui.contentMsg || "너무 짧은 내용보다는 핵심이 드러나게 작성하는 편이 좋습니다."}
                </span>
                <span className={ui.contentTooLong ? "fieldErrorText" : "muted"}>
                  {content.length}/{CONTENT_MAX}
                </span>
              </div>
            </label>
          </section>

          <section className="card cardPad editSummaryCard">
            <div className="editSummaryTitle">작성 상태</div>
            <div className="editSummaryGrid">
              <div className="editSummaryItem">
                <div className="editSummaryLabel">제목</div>
                <div className="editSummaryValue">
                  {ui.titleBlank ? "입력 필요" : ui.titleTooLong ? "길이 초과" : "정상"}
                </div>
              </div>
              <div className="editSummaryItem">
                <div className="editSummaryLabel">내용</div>
                <div className="editSummaryValue">
                  {ui.contentBlank ? "입력 필요" : ui.contentTooLong ? "길이 초과" : "정상"}
                </div>
              </div>
              <div className="editSummaryItem">
                <div className="editSummaryLabel">저장 가능</div>
                <div className="editSummaryValue">{ui.canSubmit ? "가능" : "불가"}</div>
              </div>
            </div>
          </section>

          {renderActions()}
          <div className="editFooterActions">{renderActions()}</div>
        </form>
      )}
    </div>
  );
}