import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { deletePost, getPost } from "../lib/api";
import { getLastList } from "../lib/navMemory";
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

  function renderActionButtons() {
    return (
      <div className="detailActions">
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

        <div className="spacer" />

        <Link to={backTo} className="btn btnLink">
          목록으로
        </Link>
      </div>
    );
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
        <Link to={backTo} className="btn btnLink">
          목록으로
        </Link>
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
        <div className="card cardPad emptyState" style={{ marginBottom: 12 }}>
          <div className="emptyTitle">불러오는 중…</div>
          <div className="muted">게시글 내용을 가져오고 있습니다.</div>
        </div>
        <Link to={backTo} className="btn btnLink">
          목록으로
        </Link>
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
        <div style={{ marginTop: 12 }}>
          <Link to={backTo} className="btn btnLink">
            목록으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div aria-busy={deleting}>
      <div className="detailHeaderBar">
        <Link to={backTo} className="btn btnLink">
          ← 목록으로
        </Link>
        <span className="pill mono">임시ID #{post.id}</span>
      </div>

      <section className="detailHero card cardPad">
        <div className="detailHeroTop">
          <div>
            <div className="detailEyebrow">게시글 상세</div>
            <h2 className="pageTitle detailTitle">{post.title}</h2>
          </div>
        </div>

        <div className="detailMetaGrid">
          <div className="detailMetaItem">
            <div className="detailMetaLabel">생성일</div>
            <div className="detailMetaValue">{formatDate(post.createdAt)}</div>
          </div>
          <div className="detailMetaItem">
            <div className="detailMetaLabel">수정일</div>
            <div className="detailMetaValue">{formatDate(post.updatedAt)}</div>
          </div>
        </div>

        {renderActionButtons()}
      </section>

      <section className="card cardPad detailBodyCard">
        <div className="detailSectionTitle">내용</div>
        <div className="detailContent">{post.content}</div>
      </section>

      <div className="detailFooterActions">{renderActionButtons()}</div>
    </div>
  );
}