import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, FolderKanban, MessageCircle, Send } from "lucide-react";
import api from "./api";
import { socket } from "./socket";
import type { Workspace, Project, Task, User } from "./types";
type Ctx = { workspaceId: string; workspaces: Workspace[] };
export default function Projects() {
  const { workspaceId, workspaces } = useOutletContext<Ctx>();
  const [p, SP] = useState<Project[]>([]),
    [tasks, ST] = useState<Task[]>([]),
    [members, SM] = useState<User[]>([]),
    [showProject, SSP] = useState(false),
    [showTask, SST] = useState(""),
    [commentTask, SCT] = useState<Task | null>(null),
    [comments, SC] = useState<any[]>([]),
    [comment, SCM] = useState(""),
    [name, SN] = useState(""),
    [desc, SD] = useState(""),
    [title, STI] = useState(""),
    [priority, SPR] = useState("Medium"),
    [assignee, SAS] = useState(""),
    [due, SDU] = useState(""),
    [error, SE] = useState("");
  async function load() {
    if (!workspaceId) return;
    try {
      const [x] = await Promise.all([
        api.get(`/workspaces/${workspaceId}/projects`),
      ]);
      SP(x.data);
      const w: Workspace | undefined = workspaces.find(
        (y) => y._id === workspaceId,
      );
      SM((w?.members || []).map((m) => m.user));
      let all: Task[] = [];
      for (const pr of x.data) {
        const r = await api.get(`/projects/${pr._id}/tasks`);
        all.push(...r.data);
      }
      ST(all);
    } catch (e) {
      SE(e instanceof Error ? e.message : "Could not load projects");
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
      socket.on("comment:created", refresh);
      return () => {
        socket.emit("workspace:leave", workspaceId);
        socket.off("task:created", refresh);
        socket.off("task:updated", refresh);
        socket.off("comment:created", refresh);
      };
    }
  }, [workspaceId, workspaces]);
  async function createProject(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/workspaces/${workspaceId}/projects`, {
        name,
        description: desc,
      });
      SSP(false);
      SN("");
      SD("");
      await load();
    } catch (e) {
      SE(e instanceof Error ? e.message : "Could not create project");
    }
  }
  async function createTask(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/projects/${showTask}/tasks`, {
        title,
        priority,
        assignee: assignee || undefined,
        dueDate: due || null,
      });
      SST("");
      STI("");
      await load();
    } catch (e) {
      SE(e instanceof Error ? e.message : "Could not create task");
    }
  }
  async function update(t: Task, patch: any) {
    try {
      await api.patch(`/tasks/${t._id}`, patch);
      await load();
    } catch (e) {
      SE(e instanceof Error ? e.message : "Could not update task");
    }
  }
  async function openComments(t: Task) {
    SCT(t);
    SC((await api.get(`/tasks/${t._id}/comments`)).data);
  }
  async function addComment(e: FormEvent) {
    e.preventDefault();
    if (!commentTask) return;
    try {
      await api.post(`/tasks/${commentTask._id}/comments`, { body: comment });
      SCM("");
      SC((await api.get(`/tasks/${commentTask._id}/comments`)).data);
    } catch (e) {
      SE(e instanceof Error ? e.message : "Could not post comment");
    }
  }
  return (
    <div className="stack">
      <div className="title">
        <div>
          <small>PLAN, ASSIGN, DELIVER</small>
          <h1>
            Projects & tasks<span>.</span>
          </h1>
          <p>Keep your team aligned from first idea to done.</p>
        </div>
        <button
          className="primary"
          disabled={!workspaceId}
          onClick={() => SSP(true)}
        >
          <Plus /> New project
        </button>
      </div>
      {error && <div className="alert">{error}</div>}
      {p.map((pr) => (
        <section className="project" key={pr._id}>
          <header>
            <FolderKanban />
            <div>
              <h2>{pr.name}</h2>
              <p>{pr.description}</p>
            </div>
            <button className="primary" onClick={() => SST(pr._id)}>
              <Plus /> Add task
            </button>
          </header>
          {tasks
            .filter((t) => t.project === pr._id)
            .map((t) => (
              <div className="task" key={t._id}>
                <div>
                  <strong>{t.title}</strong>
                  <small>
                    {t.dueDate
                      ? new Date(t.dueDate).toLocaleDateString()
                      : "No due date"}
                  </small>
                </div>
                <select
                  value={t.status}
                  onChange={(e) => void update(t, { status: e.target.value })}
                >
                  {["Todo", "In progress", "In review", "Done"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <span className={"priority " + t.priority.toLowerCase()}>
                  {t.priority}
                </span>
                <select
                  value={
                    typeof t.assignee === "object" && t.assignee
                      ? t.assignee._id || t.assignee.id
                      : typeof t.assignee === "string"
                        ? t.assignee
                        : ""
                  }
                  onChange={(e) =>
                    void update(t, { assignee: e.target.value || null })
                  }
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id || m._id} value={m.id || m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button className="icon" onClick={() => void openComments(t)}>
                  <MessageCircle />
                </button>
              </div>
            ))}
          {!tasks.some((t) => t.project === pr._id) && (
            <p className="muted">No tasks yet.</p>
          )}
        </section>
      ))}
      {!p.length && workspaceId && (
        <div className="empty">
          <h2>Create a project to begin</h2>
          <p>Projects organize your team's tasks and discussions.</p>
          <button className="primary" onClick={() => SSP(true)}>
            Create project
          </button>
        </div>
      )}
      {showProject && (
        <div className="backdrop">
          <form className="modal" onSubmit={createProject}>
            <h2>Create project</h2>
            <label>
              Project name
              <input
                required
                value={name}
                onChange={(e) => SN(e.target.value)}
              />
            </label>
            <label>
              Description
              <input value={desc} onChange={(e) => SD(e.target.value)} />
            </label>
            <div className="actions">
              <button type="button" onClick={() => SSP(false)}>
                Cancel
              </button>
              <button className="primary">Create</button>
            </div>
          </form>
        </div>
      )}
      {showTask && (
        <div className="backdrop">
          <form className="modal" onSubmit={createTask}>
            <h2>Create task</h2>
            <label>
              Task title
              <input
                required
                value={title}
                onChange={(e) => STI(e.target.value)}
              />
            </label>
            <label>
              Priority
              <select value={priority} onChange={(e) => SPR(e.target.value)}>
                {["Low", "Medium", "High", "Urgent"].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
            <label>
              Assignee
              <select value={assignee} onChange={(e) => SAS(e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id || m._id} value={m.id || m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input
                type="date"
                value={due}
                onChange={(e) => SDU(e.target.value)}
              />
            </label>
            <div className="actions">
              <button type="button" onClick={() => SST("")}>
                Cancel
              </button>
              <button className="primary">Create task</button>
            </div>
          </form>
        </div>
      )}
      {commentTask && (
        <div className="backdrop">
          <section className="modal">
            <h2>Comments · {commentTask.title}</h2>
            <div className="comments">
              {comments.map((c) => (
                <p key={c._id}>
                  <b>{c.author?.name || "Member"}</b>: {c.body}
                </p>
              ))}
              {!comments.length && <p>No comments yet.</p>}
            </div>
            <form className="comment-form" onSubmit={addComment}>
              <input
                value={comment}
                onChange={(e) => SCM(e.target.value)}
                required
                placeholder="Write a comment…"
              />
              <button className="primary">
                <Send />
              </button>
            </form>
            <button onClick={() => SCT(null)}>Close</button>
          </section>
        </div>
      )}
    </div>
  );
}
