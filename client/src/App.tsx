import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./Layout";
import Dashboard from "./Dashboard";
import Projects from "./Projects";
import Members from "./Members";
import AuthPage from "./AuthPage";
function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading WorkSphere…</div>;
  return user ? children : <Navigate to="/login" />;
}
function Guest({ mode }: { mode: "login" | "register" }) {
  const { user, loading } = useAuth();
  return loading ? (
    <div className="loading">Loading…</div>
  ) : user ? (
    <Navigate to="/" />
  ) : (
    <AuthPage mode={mode} />
  );
}
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Guest mode="login" />} />
        <Route path="/register" element={<Guest mode="register" />} />
        <Route
          path="/"
          element={
            <Guard>
              <Layout />
            </Guard>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="members" element={<Members />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
}
