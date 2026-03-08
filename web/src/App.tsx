import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import PostListPage from "./pages/PostListPage";
import PostDetailPage from "./pages/PostDetailPage";
import PostEditPage from "./pages/PostEditPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AdminPage from "./pages/AdminPage";
import { useAuth } from "./lib/auth";

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

function AuthGate({ children, guestOnly = false }: { children: ReactNode; guestOnly?: boolean }) {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="card cardPad emptyState">
        <div className="emptyTitle">불러오는 중…</div>
        <div className="muted">로그인 상태를 확인하고 있습니다.</div>
      </div>
    );
  }

  if (guestOnly && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!guestOnly && !isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from,
          flash: { type: "error", message: "로그인이 필요합니다." },
        } satisfies NavState}
      />
    );
  }

  return children;
}

function AdminGate({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="card cardPad emptyState">
        <div className="emptyTitle">불러오는 중…</div>
        <div className="muted">권한을 확인하고 있습니다.</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from,
          flash: { type: "error", message: "로그인이 필요합니다." },
        } satisfies NavState}
      />
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <Navigate
        to="/"
        replace
        state={{
          flash: { type: "error", message: "관리자만 접근할 수 있습니다." },
        } satisfies NavState}
      />
    );
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const nav = useNavigate();
  const { user, isAuthenticated, loading, logout } = useAuth();

  const { pathname, search } = location;
  const from = pathname + search;

  const hideNewLink =
    pathname === "/new" ||
    pathname.endsWith("/edit") ||
    pathname === "/login" ||
    pathname === "/signup";

  const [theme, setTheme] = useState<Theme>(() => {
    const stored = getStoredTheme();
    const initial: Theme = stored ?? getSystemTheme();
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

  const [toast, setToast] = useState<Flash | null>(null);
  const timerRef = useRef<number | null>(null);
  const [logoutPending, setLogoutPending] = useState(false);

  useEffect(() => {
    const state = (location.state as NavState | null) ?? null;
    const flash = state?.flash;
    if (!flash) return;

    setToast(flash);

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

  async function onLogout() {
    if (logoutPending) return;
    setLogoutPending(true);
    try {
      await logout();
      nav("/", {
        replace: true,
        state: {
          flash: { type: "success", message: "로그아웃되었습니다." },
        } satisfies NavState,
      });
    } finally {
      setLogoutPending(false);
    }
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

          <div className="topbarActions">
            {!loading && isAuthenticated && user ? (
              <div className="authUserMeta">
                <span className="pill">{user.loginId}</span>
                <span className="pill authRolePill">{user.role}</span>
              </div>
            ) : !loading ? (
              <div className="authGuestMeta muted">게스트</div>
            ) : (
              <div className="authGuestMeta muted">세션 확인 중…</div>
            )}

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

            {isAuthenticated ? (
              <>
                {user?.role === "ADMIN" && (
                  <Link to="/admin" className="btn">
                    관리자
                  </Link>
                )}

                {!hideNewLink && (
                  <Link to="/new" state={{ from }} className="btn btnPrimary">
                    새 글
                  </Link>
                )}

                <button type="button" className="btn" onClick={onLogout} disabled={logoutPending}>
                  {logoutPending ? "로그아웃 중…" : "로그아웃"}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" state={{ from }} className="btn btnLink">
                  로그인
                </Link>
                <Link to="/signup" className="btn btnPrimary">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </header>

        <Routes>
          <Route path="/" element={<PostListPage />} />
          <Route path="/login" element={<AuthGate guestOnly><LoginPage /></AuthGate>} />
          <Route path="/signup" element={<AuthGate guestOnly><SignupPage /></AuthGate>} />
          <Route path="/posts/:id" element={<PostDetailPage />} />
          <Route path="/new" element={<AuthGate><PostEditPage mode="create" /></AuthGate>} />
          <Route path="/posts/:id/edit" element={<AuthGate><PostEditPage mode="edit" /></AuthGate>} />
          <Route path="/admin" element={<AdminGate><AdminPage /></AdminGate>} />
        </Routes>
      </div>
    </div>
  );
}