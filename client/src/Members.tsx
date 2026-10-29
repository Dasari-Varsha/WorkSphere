import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { Users, UserPlus, ShieldCheck } from "lucide-react";
import api from "./api";
import type { Workspace } from "./types";
export default function Members() {
  const { workspaceId, workspaces } = useOutletContext<{
    workspaceId: string;
    workspaces: Workspace[];
  }>();
  const [name, SN] = useState(""),
    [desc, SD] = useState(""),
    [email, SE] = useState(""),
    [error, ERR] = useState(""),
    [msg, SM] = useState(""),
    [ws, SW] = useState<Workspace | null>(null);
  useEffect(() => {
    const w = workspaces.find((x) => x._id === workspaceId) || null;
    SW(w);
    SN(w?.name || "");
    SD(w?.description || "");
  }, [workspaceId, workspaces]);
  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      const { data } = await api.post("/workspaces", {
        name,
        description: desc,
      });
      localStorage.setItem("worksphere_workspace", data._id);
      location.reload();
    } catch (e) {
      ERR(e instanceof Error ? e.message : "Unable to create workspace");
    }
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/members`, {
        email,
      });
      SW(data);
      SE("");
      SM("Member added.");
    } catch (e) {
      ERR(e instanceof Error ? e.message : "Unable to add member");
    }
  }
  return (
    <div className="stack">
      <div className="title">
        <div>
          <small>YOUR TEAM, IN SYNC</small>
          <h1>
            Workspace members<span>.</span>
          </h1>
          <p>Manage your shared space and teammates.</p>
        </div>
      </div>
      {error && <div className="alert">{error}</div>}
      {msg && <div className="success">{msg}</div>}
      {!workspaceId ? (
        <section className="panel">
          <h2>Create your workspace</h2>
          <form className="form" onSubmit={create}>
            <label>
              Workspace name
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
            <button className="primary">Create workspace</button>
          </form>
        </section>
      ) : (
        <>
          <section className="panel">
            <header>
              <div>
                <h2>{ws?.name || "Workspace"}</h2>
                <p>{ws?.description || "Shared team workspace"}</p>
              </div>
              <Users />
            </header>
            <form className="invite" onSubmit={add}>
              <label>
                Add an existing user by email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => SE(e.target.value)}
                  placeholder="teammate@example.com"
                />
              </label>
              <button className="primary">
                <UserPlus /> Add member
              </button>
            </form>
            <p className="muted">
              The person must register in WorkSphere first. Only workspace
              owners/admins can add members.
            </p>
          </section>
          <section className="panel">
            <h2>People</h2>
            {(ws?.members || []).map((m: any) => (
              <div className="member" key={m.user?._id || m.user?.id}>
                <b>{m.user?.name?.slice(0, 1) || "U"}</b>
                <span>
                  {m.user?.name}
                  <small>{m.user?.email}</small>
                </span>
                <label>
                  <ShieldCheck /> {m.role}
                </label>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
