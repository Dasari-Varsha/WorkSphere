import mongoose, { Schema } from "mongoose";
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);
const workspaceSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["owner", "admin", "member"],
          default: "member",
        },
      },
    ],
  },
  { timestamps: true },
);
const projectSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    description: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
const taskSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Todo", "In progress", "In review", "Done"],
      default: "Todo",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    assignee: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true },
);
const commentSchema = new Schema(
  {
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
  },
  { timestamps: true },
);
const activitySchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);
const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    message: { type: String, required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export const User = mongoose.model("User", userSchema);
export const Workspace = mongoose.model("Workspace", workspaceSchema);
export const Project = mongoose.model("Project", projectSchema);
export const Task = mongoose.model("Task", taskSchema);
export const Comment = mongoose.model("Comment", commentSchema);
export const Activity = mongoose.model("Activity", activitySchema);
export const Notification = mongoose.model("Notification", notificationSchema);
