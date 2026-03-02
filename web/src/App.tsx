import { Link, Route, Routes, useLocation } from "react-router-dom";
import PostListPage from "./pages/PostListPage";
import PostDetailPage from "./pages/PostDetailPage";
import PostEditPage from "./pages/PostEditPage";

export default function App() {
  const { pathname } = useLocation();

  // 작성/수정 화면에서는 "새 글" 숨김
  const hideNewLink = pathname === "/new" || pathname.endsWith("/edit");

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <Link to="/" style={{ fontSize: 20, fontWeight: 700, textDecoration: "none" }}>
          SimpleBoard
        </Link>
        <div style={{ flex: 1 }} />
        {!hideNewLink && <Link to="/new">새 글</Link>}
      </header>

      <Routes>
        <Route path="/" element={<PostListPage />} />
        <Route path="/posts/:id" element={<PostDetailPage />} />
        <Route path="/new" element={<PostEditPage mode="create" />} />
        <Route path="/posts/:id/edit" element={<PostEditPage mode="edit" />} />
      </Routes>
    </div>
  );
}