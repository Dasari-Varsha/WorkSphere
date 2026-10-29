export type User = { id: string; _id?: string; name: string; email: string };
export type Workspace = {
  _id: string;
  name: string;
  description: string;
  members: { user: User; role: string }[];
};
export type Project = {
  _id: string;
  workspace: string;
  name: string;
  description: string;
};
export type Task = {
  _id: string;
  project: string;
  workspace: string;
  title: string;
  description: string;
  status: "Todo" | "In progress" | "In review" | "Done";
  priority: "Low" | "Medium" | "High" | "Urgent";
  assignee?: User | string | null;
  createdBy: User | string;
  dueDate?: string;
};
