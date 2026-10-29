import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  User,
  Workspace,
  Project,
  Task,
  Comment,
  Activity,
  Notification,
} from "./models.js";
import { io } from "./index.js";
const r = Router();
const wrap = (fn: any) => (req: any, res: any, next: any) =>
  Promise.resolve(fn(req, res, next)).catch(next);
const auth = (req: any, res: any, next: any) => {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith("Bearer ")) throw Error();
    req.userId = (
      jwt.verify(h.slice(7), process.env.JWT_SECRET || "") as any
    ).userId;
    next();
  } catch {
    res.status(401).json({ message: "Please sign in again." });
  }
};
const token = (id: string) =>
  jwt.sign({ userId: id }, process.env.JWT_SECRET || "replace-secret", {
    expiresIn: "7d",
  });
const member = async (wid: string, uid: string) =>
  Workspace.findOne({ _id: wid, "members.user": uid });
async function activity(
  wid: string,
  uid: string,
  message: string,
  type: string,
  id: string,
) {
  await Activity.create({
    workspace: wid,
    actor: uid,
    message,
    targetType: type,
    targetId: id,
  });
  io.to(`workspace:${wid}`).emit("workspace:activity", { workspaceId: wid });
}
r.post(
  "/auth/register",
  wrap(async (req, res) => {
    const d = z
      .object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
      })
      .parse(req.body);
    if (await User.exists({ email: d.email.toLowerCase() }))
      return res.status(409).json({ message: "Email already registered." });
    const u = await User.create({
      name: d.name,
      email: d.email,
      passwordHash: await bcrypt.hash(d.password, 12),
    });
    res.status(201).json({
      token: token(String(u._id)),
      user: { id: String(u._id), name: u.name, email: u.email },
    });
  }),
);
r.post(
  "/auth/login",
  wrap(async (req, res) => {
    const d = z
      .object({ email: z.string().email(), password: z.string() })
      .parse(req.body);
    const u = await User.findOne({ email: d.email.toLowerCase() }).select(
      "+passwordHash",
    );
    if (!u || !(await bcrypt.compare(d.password, u.passwordHash)))
      return res.status(401).json({ message: "Invalid email or password." });
    res.json({
      token: token(String(u._id)),
      user: { id: String(u._id), name: u.name, email: u.email },
    });
  }),
);
r.get(
  "/auth/me",
  auth,
  wrap(async (req, res) => {
    const u = await User.findById(req.userId).select("name email");
    if (!u) return res.status(404).json({ message: "User not found." });
    res.json({ user: { id: String(u._id), name: u.name, email: u.email } });
  }),
);
r.get(
  "/workspaces",
  auth,
  wrap(async (req, res) =>
    res.json(
      await Workspace.find({ "members.user": req.userId }).populate(
        "members.user",
        "name email",
      ),
    ),
  ),
);
r.post(
  "/workspaces",
  auth,
  wrap(async (req, res) => {
    const d = z
      .object({
        name: z.string().min(2).max(100),
        description: z.string().max(400).optional(),
      })
      .parse(req.body);
    const w = await Workspace.create({
      ...d,
      owner: req.userId,
      members: [{ user: req.userId, role: "owner" }],
    });
    await activity(
      String(w._id),
      req.userId,
      `created workspace ${w.name}`,
      "workspace",
      String(w._id),
    );
    res.status(201).json(await w.populate("members.user", "name email"));
  }),
);
r.post(
  "/workspaces/:id/members",
  auth,
  wrap(async (req, res) => {
    const w = await Workspace.findById(req.params.id);
    if (!w) return res.status(404).json({ message: "Workspace not found." });
    const me = w.members.find((m) => String(m.user) === req.userId);
    if (!me || !["owner", "admin"].includes(me.role))
      return res
        .status(403)
        .json({ message: "Only owners and admins can add members." });
    const d = z.object({ email: z.string().email() }).parse(req.body);
    const u = await User.findOne({ email: d.email.toLowerCase() });
    if (!u)
      return res.status(404).json({ message: "Register this user first." });
    if (w.members.some((m) => String(m.user) === String(u._id)))
      return res.status(409).json({ message: "Already a member." });
    w.members.push({ user: u._id, role: "member" } as any);
    await w.save();
    await Notification.create({
      user: u._id,
      workspace: w._id,
      message: `You were added to ${w.name}.`,
    });
    await activity(
      String(w._id),
      req.userId,
      `added ${u.name} to the workspace`,
      "member",
      String(u._id),
    );
    res.status(201).json(await w.populate("members.user", "name email"));
  }),
);
r.get(
  "/workspaces/:id/projects",
  auth,
  wrap(async (req, res) => {
    if (!(await member(req.params.id, req.userId)))
      return res.status(403).json({ message: "Workspace access denied." });
    res.json(
      await Project.find({ workspace: req.params.id }).sort({ createdAt: -1 }),
    );
  }),
);
r.post(
  "/workspaces/:id/projects",
  auth,
  wrap(async (req, res) => {
    if (!(await member(req.params.id, req.userId)))
      return res.status(403).json({ message: "Workspace access denied." });
    const d = z
      .object({
        name: z.string().min(2).max(120),
        description: z.string().max(600).optional(),
      })
      .parse(req.body);
    const p = await Project.create({
      ...d,
      workspace: req.params.id,
      createdBy: req.userId,
    });
    await activity(
      req.params.id,
      req.userId,
      `created project ${p.name}`,
      "project",
      String(p._id),
    );
    io.to(`workspace:${req.params.id}`).emit("project:created", p);
    res.status(201).json(p);
  }),
);
r.get(
  "/projects/:id/tasks",
  auth,
  wrap(async (req, res) => {
    const p = await Project.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Project not found." });
    if (!(await member(String(p.workspace), req.userId)))
      return res.status(403).json({ message: "Workspace access denied." });
    res.json(
      await Task.find({ project: p._id })
        .populate("assignee", "name email")
        .populate("createdBy", "name")
        .sort({ updatedAt: -1 }),
    );
  }),
);
r.post(
  "/projects/:id/tasks",
  auth,
  wrap(async (req, res) => {
    const p = await Project.findById(req.params.id);
    if (!p) return res.status(404).json({ message: "Project not found." });
    const w = await member(String(p.workspace), req.userId);
    if (!w)
      return res.status(403).json({ message: "Workspace access denied." });
    const d = z
      .object({
        title: z.string().min(2).max(180),
        description: z.string().max(1200).optional(),
        priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
        assignee: z.string().optional(),
        dueDate: z.string().nullable().optional(),
      })
      .parse(req.body);
    if (d.assignee && !w.members.some((m) => String(m.user) === d.assignee))
      return res
        .status(400)
        .json({ message: "Assignee must be a workspace member." });
    const t = await Task.create({
      ...d,
      project: p._id,
      workspace: w._id,
      createdBy: req.userId,
      dueDate: d.dueDate || null,
    });
    if (t.assignee && String(t.assignee) !== req.userId)
      await Notification.create({
        user: t.assignee,
        workspace: w._id,
        task: t._id,
        message: `You were assigned ${t.title}.`,
      });
    await activity(
      String(w._id),
      req.userId,
      `created task ${t.title}`,
      "task",
      String(t._id),
    );
    io.to(`workspace:${w._id}`).emit("task:created", {
      workspaceId: String(w._id),
      task: t,
    });
    res.status(201).json(await t.populate("assignee", "name email"));
  }),
);
r.patch(
  "/tasks/:id",
  auth,
  wrap(async (req, res) => {
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message: "Task not found." });
    const w = await member(String(t.workspace), req.userId);
    if (!w)
      return res.status(403).json({ message: "Workspace access denied." });
    const d = z
      .object({
        title: z.string().min(2).optional(),
        description: z.string().optional(),
        status: z.enum(["Todo", "In progress", "In review", "Done"]).optional(),
        priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional(),
        assignee: z.string().nullable().optional(),
        dueDate: z.string().nullable().optional(),
      })
      .parse(req.body);
    if (d.assignee && !w.members.some((m) => String(m.user) === d.assignee))
      return res
        .status(400)
        .json({ message: "Assignee must be a workspace member." });
    Object.assign(t, d);
    await t.save();
    if (t.assignee && String(t.assignee) !== req.userId)
      await Notification.create({
        user: t.assignee,
        workspace: w._id,
        task: t._id,
        message: `Task ${t.title} was assigned to you.`,
      });
    await activity(
      String(w._id),
      req.userId,
      `updated task ${t.title}`,
      "task",
      String(t._id),
    );
    const result = await t.populate("assignee", "name email");
    io.to(`workspace:${w._id}`).emit("task:updated", {
      workspaceId: String(w._id),
      task: result,
    });
    res.json(result);
  }),
);
r.get(
  "/tasks/:id/comments",
  auth,
  wrap(async (req, res) => {
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message: "Task not found." });
    if (!(await member(String(t.workspace), req.userId)))
      return res.status(403).json({ message: "Workspace access denied." });
    res.json(
      await Comment.find({ task: t._id })
        .populate("author", "name")
        .sort({ createdAt: 1 }),
    );
  }),
);
r.post(
  "/tasks/:id/comments",
  auth,
  wrap(async (req, res) => {
    const t = await Task.findById(req.params.id);
    if (!t) return res.status(404).json({ message: "Task not found." });
    const w = await member(String(t.workspace), req.userId);
    if (!w)
      return res.status(403).json({ message: "Workspace access denied." });
    const d = z
      .object({ body: z.string().trim().min(1).max(1500) })
      .parse(req.body);
    const c = await Comment.create({
      task: t._id,
      workspace: w._id,
      author: req.userId,
      body: d.body,
    });
    const result = await c.populate("author", "name");
    await activity(
      String(w._id),
      req.userId,
      `commented on ${t.title}`,
      "comment",
      String(c._id),
    );
    const recipient =
      String(t.createdBy) !== req.userId
        ? String(t.createdBy)
        : t.assignee
          ? String(t.assignee)
          : null;
    if (recipient)
      await Notification.create({
        user: recipient,
        workspace: w._id,
        task: t._id,
        message: `New comment on ${t.title}.`,
      });
    io.to(`workspace:${w._id}`).emit("comment:created", {
      workspaceId: String(w._id),
      taskId: String(t._id),
      comment: result,
    });
    res.status(201).json(result);
  }),
);
r.get(
  "/workspaces/:id/activity",
  auth,
  wrap(async (req, res) => {
    if (!(await member(req.params.id, req.userId)))
      return res.status(403).json({ message: "Workspace access denied." });
    res.json(
      await Activity.find({ workspace: req.params.id })
        .populate("actor", "name")
        .sort({ createdAt: -1 })
        .limit(50),
    );
  }),
);
r.get(
  "/notifications",
  auth,
  wrap(async (req, res) =>
    res.json(
      await Notification.find({ user: req.userId })
        .populate("workspace", "name")
        .populate("task", "title")
        .sort({ createdAt: -1 })
        .limit(50),
    ),
  ),
);
r.patch(
  "/notifications/:id/read",
  auth,
  wrap(async (req, res) => {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { read: true },
      { new: true },
    );
    if (!n) return res.status(404).json({ message: "Notification not found." });
    res.json(n);
  }),
);
export default r;
