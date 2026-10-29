import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Boxes,
  LayoutDashboard,
  CheckSquare,
  Users,
  LogOut,
  Bell,
} from "lucide-react";
import { useAuth } from "./auth";
import { useEffect, useState } from "react";
import api from "./api";
import type { Workspace } from "./types";
export default function Layout() {
  const { user, logout } = useAuth(),
    nav = useNavigate();
  const [ws, W] = useState<Workspace[]>([]),
    [wid, SW] = useState(localStorage.getItem("worksphere_workspace") || ""),
    [notices, SN] = useState<any[]>([]),
    [show, SS] = useState(false);
  useEffect(() => {
    api
      .get("/workspaces")
      .then((r) => {
        W(r.data);
        if (!wid && r.data[0]) {
          SW(r.data[0]._id);
          localStorage.setItem("worksphere_workspace", r.data[0]._id);
        }
      })
      .catch(() => {});
    api
      .get("/notifications")
      .then((r) => SN(r.data))
      .catch(() => {});
  }, []);
  function change(id: string) {
    SW(id);
    localStorage.setItem("worksphere_workspace", id);
    window.dispatchEvent(new CustomEvent("workspace-change", { detail: id }));
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Boxes /> worksphere<span>.</span>
        </div>
        <small className="label">WORKSPACE</small>
        <select value={wid} onChange={(e) => change(e.target.value)}>
          <option value="">Choose workspace</option>
          {ws.map((w) => (
            <option key={w._id} value={w._id}>
              {w.name}
            </option>
          ))}
        </select>
        <nav>
          <NavLink to="/" end>
            <LayoutDashboard /> Overview
          </NavLink>
          <NavLink to="/projects">
            <CheckSquare /> Projects & tasks
          </NavLink>
          <NavLink to="/members">
            <Users /> Members
          </NavLink>
        </nav>
        <div className="profile">
          <b>{user?.name?.slice(0, 1)}</b>
          <span>
            {user?.name}
            <small>{user?.email}</small>
          </span>
          <button
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            <LogOut />
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          Workspace / Team collaboration
          <div className="notice">
            <button onClick={() => SS(!show)}>
              <Bell />
              {notices.some((n) => !n.read) && "•"}
            </button>
            {show && (
              <div className="notice-pop">
                <b>Notifications</b>
                {notices.length ? (
                  notices.slice(0, 8).map((n) => <p key={n._id}>{n.message}</p>)
                ) : (
                  <p>No notifications yet.</p>
                )}
              </div>
            )}
          </div>
        </header>
        <div className="content">
          <Outlet context={{ workspaceId: wid, workspaces: ws }} />
        </div>
      </main>
    </div>
  );
}
