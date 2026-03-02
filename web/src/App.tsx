import { Link, Route, Routes, useLocation } from "react-router-dom";
import PostListPage from "./pages/PostListPage";
import PostDetailPage from "./pages/PostDetailPage";
import PostEditPage from "./pages/PostEditPage";

export default function App() {
  const { pathname } = useLocation();

  // 작성/수정 화면에서는 "새 글" 숨김
  const hideNewLink = pathname === "/new" || pathname.endsWith("/edit");

  return (
    <div className="appShell">
      <div className="container">
        <header className="topbar">
          <Link to="/" className="brand">
            SimpleBoard
          </Link>
          <div className="spacer" />
          {!hideNewLink && (
            <Link to="/new" className="btn btnPrimary">
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