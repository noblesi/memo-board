import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError, createPost, getPost, updatePost } from "../lib/api";
import { useAuth } from "../lib/auth";
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

  const { user, loading: authLoading } = useAuth();

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
    if (authLoading) return;

    if (!isValidId) {
      setErr("잘못된 접근입니다.");
      return;
    }

    setLoading(true);
    setErr(null);

    getPost(postId)
      .then((p) => {
        const canEdit =
          !!user && (user.role === "ADMIN" || user.loginId === p.authorLoginId);

        if (!canEdit) {
          nav(`/posts/${postId}`, {
            replace: true,
            state: {
              from: listBack,
              flash: {
                type: "error",
                message: "작성자 본인 또는 관리자만 수정할 수 있습니다.",
              },
            } satisfies NavState,
          });
          return;
        }

        setTitle(p.title);
        setContent(p.content);
        setInitialTitle(p.title);
        setInitialContent(p.content);
      })
      .catch((e) => setErr(String((e as any)?.message ?? e)))
      .finally(() => setLoading(false));
  }, [mode, postId, isValidId, nav, listBack, user, authLoading]);

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
      !titleBlank &&
      !contentBlank &&
      !titleTooLong &&
      !contentTooLong &&
      !saving &&
      !loading;

    const titleMsg =
      fieldErrs.title ??
      (titleBlank
        ? "제목을 입력해 주세요."
        : titleTooLong
          ? `제목은 ${TITLE_MAX}자 이하여야 합니다.`
          : "");

    const contentMsg =
      fieldErrs.content ??
      (contentBlank
        ? "본문을 입력해 주세요."
        : contentTooLong
          ? `본문은 ${CONTENT_MAX}자 이하여야 합니다.`
          : "");

    return {
      canSubmit,
      titleMsg,
      contentMsg,
      titleTooLong,
      contentTooLong,
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
      setErr("입력값을 확인해 주세요.");
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
            flash: { type: "success", message: "게시글을 작성했습니다." },
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
          flash: { type: "success", message: "게시글을 저장했습니다." },
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

    const ok = confirm("저장되지 않은 변경사항이 있습니다.\n정말 나갈까요?");
    if (!ok) e.preventDefault();
  }

  if (mode === "edit" && !isValidId) {
    return (
      <div className="editShell">
        <div className="error">잘못된 접근입니다.</div>
      </div>
    );
  }

  if (mode === "edit" && authLoading) {
    return (
      <div className="editShell">
        <div className="card cardPad emptyState">
          <div className="emptyTitle">불러오는 중...</div>
          <div className="muted">로그인 상태를 확인하고 있습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="editShell">
      <section className="card cardPad editPageHero">
        <div className="editHeaderBar">
          <Link to={cancelTo} state={cancelState} className="btn btnLink" onClick={onCancelClick}>
            {mode === "create" ? "목록으로" : "상세로"}
          </Link>
        </div>

        <div className="editTitleRow">
          <div>
            <div className="pageEyebrow">{mode === "create" ? "Create Post" : "Edit Post"}</div>
            <h2 className="pageTitle">{mode === "create" ? "새 글 작성" : "게시글 수정"}</h2>
            <p className="muted editLead">
              제목은 목록에서 먼저 보이고, 본문은 상세 페이지에서 그대로 읽히도록 구성됩니다.
            </p>
          </div>

          {dirty && <span className="pill">미저장 변경</span>}
        </div>
      </section>

      {err && <div className="error">{err}</div>}

      {loading && mode === "edit" ? (
        <div className="card cardPad emptyState">
          <div className="emptyTitle">불러오는 중...</div>
          <div className="muted">게시글 내용을 가져오고 있습니다.</div>
          <Link to={cancelTo} state={cancelState} className="btn btnLink">
            돌아가기
          </Link>
        </div>
      ) : (
        <form className="card cardPad editCard" onSubmit={onSubmit}>
          {saving && (
            <div className="editBanner">
              <div className="editSavingTitle">{mode === "create" ? "작성 중" : "저장 중"}</div>
              <div className="muted">잠시만 기다려 주세요.</div>
            </div>
          )}

          <section className="editSection">
            <div className="editSectionTop">
              <div className="editSectionTitle">기본 정보</div>
              <div className="editSectionDesc">
                목록에서 스캔하기 쉬운 제목과 상세 페이지에서 읽기 편한 본문을 함께 정리합니다.
              </div>
            </div>

            <label className="editField">
              <span className="editLabel">제목</span>
              <input
                className={`input ${ui.titleMsg ? "inputInvalid" : ""}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 검색과 정렬 구조를 정리한 게시판 UI 개선"
                maxLength={TITLE_MAX + 200}
                disabled={saving}
              />
              <div className="editFieldMeta">
                <span className={ui.titleMsg ? "fieldErrorText" : "muted"}>
                  {ui.titleMsg || "핵심 주제가 바로 보이도록 짧고 분명한 제목이 좋습니다."}
                </span>
                <span className={ui.titleTooLong ? "fieldErrorText" : "muted"}>
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
            </label>

            <label className="editField">
              <span className="editLabel">본문</span>
              <textarea
                className={`input textarea editTextarea ${ui.contentMsg ? "inputInvalid" : ""}`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="본문을 입력해 주세요."
                rows={14}
                maxLength={CONTENT_MAX + 1000}
                disabled={saving}
              />
              <div className="editFieldMeta">
                <span className={ui.contentMsg ? "fieldErrorText" : "muted"}>
                  {ui.contentMsg || "단락을 나눠 쓰면 상세 페이지에서 더 읽기 쉽습니다."}
                </span>
                <span className={ui.contentTooLong ? "fieldErrorText" : "muted"}>
                  {content.length}/{CONTENT_MAX}
                </span>
              </div>
            </label>
          </section>

          <div className="editActions">
            <button className="btn btnPrimary" disabled={!ui.canSubmit} type="submit">
              {saving ? (mode === "create" ? "작성 중..." : "저장 중...") : mode === "create" ? "작성" : "저장"}
            </button>

            <Link
              className={`btn btnLink ${saving ? "isDisabled" : ""}`}
              to={cancelTo}
              state={cancelState}
              onClick={onCancelClick}
            >
              취소
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
