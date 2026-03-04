import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import PostListPage from "./pages/PostListPage";
import PostDetailPage from "./pages/PostDetailPage";
import PostEditPage from "./pages/PostEditPage";

const THEME_KEY = "sb_theme";

type Theme = "light" | "dark";

type Flash = { type: "success" | "error"; message: string };
type NavState = { from?: string; flash?: Flash };

function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "dark" || v === "light" ? v : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export default function App() {
  const location = useLocation();
  const nav = useNavigate();

  const { pathname, search } = location;
  const from = pathname + search;

  // 작성/수정 화면에서는 "새 글" 숨김
  const hideNewLink = pathname === "/new" || pathname.endsWith("/edit");

  // ✅ 초기 렌더 전에 theme를 결정하고 dataset까지 즉시 세팅(깜빡임 최소화)
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = getStoredTheme();
    const initial: Theme = stored ?? getSystemTheme(); // 저장값 없으면 시스템 설정(없으면 light)
    document.documentElement.dataset.theme = initial;
    return initial;
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const nextTheme: Theme = theme === "dark" ? "light" : "dark";

  // ✅ Flash Toast
  const [toast, setToast] = useState<Flash | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const state = (location.state as NavState | null) ?? null;
    const flash = state?.flash;
    if (!flash) return;

    setToast(flash);

    // flash는 1회 소비 후 history state에서 제거(뒤로가기/새로고침 반복 방지)
    const raw = (location.state ?? {}) as Record<string, unknown>;
    const { flash: _flash, ...rest } = raw;
    nav(pathname + search, { replace: true, state: rest });

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 2800);
  }, [location.key, location.state, nav, pathname, search]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  function closeToast() {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    setToast(null);
  }

  return (
    <div className="appShell">
      {toast && (
        <div className="toastHost" aria-live="polite" role="status">
          <div className={`toast ${toast.type === "error" ? "toastError" : "toastSuccess"}`}>
            <span className="toastIcon" aria-hidden>
              {toast.type === "error" ? "⚠️" : "✅"}
            </span>
            <div className="toastMsg">{toast.message}</div>
            <button type="button" className="toastClose" onClick={closeToast} aria-label="닫기">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="container">
        <header className="topbar">
          <Link to="/" className="brand">
            SimpleBoard
          </Link>

          <div className="spacer" />

          <button
            type="button"
            className="btn btnIcon"
            title={nextTheme === "dark" ? "다크로 전환" : "라이트로 전환"}
            aria-label="테마 전환"
            aria-pressed={theme === "dark"}
            onClick={() => setTheme(nextTheme)}
          >
            <span aria-hidden>{nextTheme === "dark" ? "🌙" : "☀️"}</span>
            <span className="btnLabel">{nextTheme === "dark" ? "다크" : "라이트"}</span>
          </button>

          {!hideNewLink && (
            <Link to="/new" state={{ from }} className="btn btnPrimary">
              새 글
            </Link>
          )}
        </header>

        <Routes>
          <Route path="/" element={<PostListPage />} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/new" element={<PostEditPage mode="create" />} />
          <Route path="/posts/:id/edit" element={<PostEditPage mode="edit" />} />
        </Routes>
      </div>
    </div>
  );
}