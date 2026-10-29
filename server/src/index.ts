import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { Server } from "socket.io";
import routes from "./routes.js";
const app = express(),
  server = http.createServer(app);
const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin }));
app.use(express.json({ limit: "1mb" }));
export const io = new Server(server, { cors: { origin } });
io.on("connection", (s) => {
  s.on("workspace:join", (id: string) => s.join(`workspace:${id}`));
  s.on("workspace:leave", (id: string) => s.leave(`workspace:${id}`));
});
app.get("/api/health", (_req, res) =>
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting",
  }),
);
app.use("/api", routes);
app.use((req, res) =>
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.path}` }),
);
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res
    .status(err.status || 400)
    .json({ message: err.message || "Request failed" });
});
const port = Number(process.env.PORT || 5001);
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/worksphere")
  .then(() => console.log("MongoDB connected"))
  .catch((e) => console.error("MongoDB connection failed", e.message));
server.listen(port, () =>
  console.log(`WorkSphere API listening on http://localhost:${port}`),
);
