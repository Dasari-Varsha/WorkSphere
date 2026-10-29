import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import {
  FolderKanban,
  CheckSquare,
  Activity,
  Users,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import api from "./api";
import { socket } from "./socket";
import type { Workspace, Project, Task } from "./types";
export default function Dashboard() {
  const { workspaceId, workspaces } = useOutletContext<{
    workspaceId: string;
    workspaces: Workspace[];
  }>();
  const [p, SP] = useState<Project[]>([]),
    [t, ST] = useState<Task[]>([]),
    [a, SA] = useState<any[]>([]),
    [err, SE] = useState("");
  async function load() {
    if (!workspaceId) return;
    try {
      const [x, y] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/projects`),
        api.get(`/workspaces/${workspaceId}/activity`),
      ]);
      SP(x.data);
      SA(y.data);
      let all: Task[] = [];
      for (const pr of x.data) {
        const r = await api.get(`/projects/${pr._id}/tasks`);
        all.push(...r.data);
      }
      ST(all);
    } catch (e) {
      SE(e instanceof Error ? e.message : "Unable to load data");
    }
  }
  useEffect(() => {
    void load();
    if (workspaceId) {
      socket.connect();
      socket.emit("workspace:join", workspaceId);
      const refresh = () => void load();
      socket.on("task:created", refresh);
      socket.on("task:updated", refresh);
      socket.on("workspace:activity", refresh);
      return () => {
        socket.emit("workspace:leave", workspaceId);
        socket.off("task:created", refresh);
        socket.off("task:updated", refresh);
        socket.off("workspace:activity", refresh);
      };
    }
  }, [workspaceId]);
  const done = t.filter((x) => x.status === "Done").length;
  return (
    <div className="stack">
      <div className="title">
        <div>
          <small>TEAM OVERVIEW</small>
          <h1>
            Good work starts <em>here.</em>
          </h1>
          <p>See what your team is building and what needs attention.</p>
        </div>
        <Link className="primary" to="/projects">
          <Plus /> New task
        </Link>
      </div>
      {err && <div className="alert">{err}</div>}
      {!workspaceId && (
        <div className="empty">
          <h2>Create your first workspace</h2>
          <p>Start a shared space to organize projects and invite teammates.</p>
          <Link className="primary" to="/members">
            Set up workspace
          </Link>
        </div>
      )}
      <div className="stats">
        <Stat
          icon={<FolderKanban />}
          label="Projects"
          value={p.length}
          note="In this workspace"
        />
        <Stat
          icon={<CheckSquare />}
          label="Total tasks"
          value={t.length}
          note={`${t.length - done} in progress`}
        />
        <Stat
          icon={<Activity />}
          label="Completed"
          value={done}
          note={
            t.length
              ? `${Math.round((done / t.length) * 100)}% complete`
              : "No completed tasks yet"
          }
        />
        <Stat
          icon={<Users />}
          label="Team members"
          value={
            workspaces.find((w) => w._id === workspaceId)?.members.length || 0
          }
          note="Collaborating together"
        />
      </div>
      <div className="columns">
        <section className="panel">
          <header>
            <div>
              <h2>Projects</h2>
              <p>Your team's active work</p>
            </div>
            <Link to="/projects">
              View all <ArrowUpRight />
            </Link>
          </header>
          {p.length ? (
            p.map((x) => (
              <div className="item" key={x._id}>
                <b className="tile">
                  <FolderKanban />
                </b>
                <span>
                  <strong>{x.name}</strong>
                  <small>{x.description || "Shared project"}</small>
                </span>
                <small>
                  {t.filter((y) => y.project === x._id).length} tasks
                </small>
              </div>
            ))
          ) : (
            <p className="muted">
              No projects yet. Create one in Projects & tasks.
            </p>
          )}
        </section>
        <section className="panel">
          <header>
            <div>
              <h2>Recent activity</h2>
              <p>A live view of team progress</p>
            </div>
            <Activity />
          </header>
          {a.length ? (
            a.slice(0, 8).map((x) => (
              <div className="activity" key={x._id}>
                <b>{x.actor?.name?.slice(0, 1) || "T"}</b>
                <span>
                  <strong>{x.actor?.name || "Teammate"}</strong> {x.message}
                  <small>{new Date(x.createdAt).toLocaleString()}</small>
                </span>
              </div>
            ))
          ) : (
            <p className="muted">Workspace activity appears here.</p>
          )}
        </section>
      </div>
    </div>
  );
}
function Stat({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div className="stat">
      <span>{icon}</span>
      <small>{label}</small>
      <b>{value}</b>
      <p>{note}</p>
    </div>
  );
}
