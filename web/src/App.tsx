import { useEffect, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import PostListPage from "./pages/PostListPage";
import PostDetailPage from "./pages/PostDetailPage";
import PostEditPage from "./pages/PostEditPage";

const THEME_KEY = "sb_theme";

type Theme = "light" | "dark";

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

  return (
    <div className="appShell">
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