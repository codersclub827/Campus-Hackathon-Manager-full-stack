import cors, { type CorsOptions } from "cors";
import express from "express";
import helmet from "helmet";
import http from "http";
import morgan from "morgan";
import { Server } from "socket.io";
import connectDatabase from "./config/db.js";
import { env } from "./config/env.js";
import { JwtUser, verifyToken } from "./middleware/auth.js";
import apiRoutes from "./routes/api.js";
import authRoutes from "./routes/auth.js";
import { attendanceStats, checkIn, checkOut, parseQrPayload, serializeAttendance } from "./services/attendance.js";
import { cancelEvent, createEvent, serializeEvent, updateEvent } from "./services/events.js";
import { getLeaderboardSnapshot, overrideRank, resetLeaderboardScores, setLeaderboardState, submitLeaderboardScore } from "./services/leaderboard.js";
import { createNotification, emitNotification } from "./services/notifications.js";

const app = express();
const server = http.createServer(app);
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    callback(null, origin || true);
  },
  credentials: true,
  optionsSuccessStatus: 204
};

const io = new Server(server, {
  cors: corsOptions
});

app.set("io", io);

app.use(helmet());
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Campus Hackathon Manager API", clientOrigins: env.clientUrls });
});
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  res.status(400).json({ message });
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.toString().replace("Bearer ", "");
  if (!token) {
    socket.data.user = { id: `guest-${socket.id}`, email: "guest@campus.local", role: "student" } satisfies JwtUser;
    return next();
  }

  try {
    socket.data.user = verifyToken(token);
    next();
  } catch {
    next(new Error("Invalid or expired socket token"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.user as JwtUser;
  socket.join(`user:${user.id}`);
  socket.join(`role:${user.role}`);
  if (user.role === "admin") socket.join("admins");

  socket.on("presence:join", (payload: { userId: string; name: string; room?: string }) => {
    if (payload.room) socket.join(payload.room);
    io.emit("presence:update", { ...payload, onlineUsers: io.engine.clientsCount });
  });
  socket.on("join-team", (teamId: string) => socket.join(teamId));
  socket.on("message:typing", (payload) => socket.broadcast.emit("message:typing", payload));
  socket.on("message:read", (payload) => socket.broadcast.emit("message:read", payload));
  socket.on("team-message", (message: { teamId: string; from: string; text: string }) => {
    io.to(message.teamId).emit("team-message", { ...message, time: "now", sentAt: new Date().toISOString() });
  });
  socket.on("judge-score", async (payload) => {
    io.emit("leaderboard-update", payload);
    if (payload.teamId && payload.scores) {
      if (user.role !== "judge" && user.role !== "admin") return socket.emit("leaderboard:error", { message: "Only judges and admins can score" });
      await submitLeaderboardScore({ ...payload, judge: payload.judge ?? user.email });
      io.emit("leaderboard:snapshot", await getLeaderboardSnapshot());
    }
  });
  socket.on("leaderboard:score", async (payload) => {
    if (user.role !== "judge" && user.role !== "admin") return socket.emit("leaderboard:error", { message: "Only judges and admins can score" });
    await submitLeaderboardScore({ ...payload, judge: payload.judge ?? user.email });
    io.emit("leaderboard:snapshot", await getLeaderboardSnapshot());
  });
  socket.on("leaderboard:state", async (payload) => {
    if (user.role !== "admin") return socket.emit("leaderboard:error", { message: "Only admins can control leaderboard state" });
    await setLeaderboardState(payload);
    const snapshot = await getLeaderboardSnapshot();
    io.emit("leaderboard:snapshot", snapshot);
    if (payload.published) io.emit("leaderboard:winner-announced", snapshot);
  });
  socket.on("leaderboard:reset", async () => {
    if (user.role !== "admin") return socket.emit("leaderboard:error", { message: "Only admins can reset scores" });
    io.emit("leaderboard:snapshot", await resetLeaderboardScores());
  });
  socket.on("leaderboard:override-rank", async (payload) => {
    if (user.role !== "admin") return socket.emit("leaderboard:error", { message: "Only admins can override ranks" });
    await overrideRank(payload.teamId, payload.rank);
    io.emit("leaderboard:snapshot", await getLeaderboardSnapshot());
  });
  socket.on("task:moved", (payload) => io.emit("task:moved", payload));
  socket.on("submission:progress", (payload) => io.emit("submission:progress", payload));
  socket.on("attendance:scan", async (payload) => {
    const raw = typeof payload === "string" ? payload : payload.raw ?? JSON.stringify(payload);
    const parsed = parseQrPayload(raw);
    if (!parsed) return socket.emit("attendance:invalid", { raw, message: "Invalid QR" });
    const result = await checkIn(parsed);
    const serialized = serializeAttendance(result.record);
    if (result.duplicate) return socket.emit("attendance:duplicate", serialized);
    io.emit("attendance:checked-in", serialized);
    io.emit("attendance:stats", await attendanceStats());
  });
  socket.on("attendance:checkout", async ({ id }) => {
    const record = await checkOut(id);
    if (!record) return socket.emit("attendance:error", { message: "Attendance record not found" });
    io.emit("attendance:checked-out", serializeAttendance(record));
    io.emit("attendance:stats", await attendanceStats());
  });
  socket.on("calendar:update", (payload) => io.emit("calendar:update", payload));
  socket.on("event:create", async (payload) => {
    if (user.role !== "admin") return socket.emit("event:error", { message: "Only admins can create events" });
    const event = serializeEvent(await createEvent({ ...payload, startsAt: new Date(payload.startsAt), endsAt: new Date(payload.endsAt), createdBy: user.id }));
    io.emit("event:created", event);
    io.emit("calendar:update", { action: "created", event });
  });
  socket.on("event:update", async (payload) => {
    if (user.role !== "admin") return socket.emit("event:error", { message: "Only admins can update events" });
    const event = await updateEvent(payload.id, {
      ...payload,
      startsAt: payload.startsAt ? new Date(payload.startsAt) : undefined,
      endsAt: payload.endsAt ? new Date(payload.endsAt) : undefined
    });
    if (!event) return socket.emit("event:error", { message: "Event not found" });
    const serialized = serializeEvent(event);
    io.emit("event:updated", serialized);
    io.emit("calendar:update", { action: "updated", event: serialized });
  });
  socket.on("event:cancel", async ({ id }) => {
    if (user.role !== "admin") return socket.emit("event:error", { message: "Only admins can cancel events" });
    const event = await cancelEvent(id);
    if (!event) return socket.emit("event:error", { message: "Event not found" });
    const serialized = serializeEvent(event);
    io.emit("event:cancelled", serialized);
    io.emit("calendar:update", { action: "cancelled", event: serialized });
  });
  socket.on("announcement:publish", async (payload: { title: string; detail: string }) => {
    io.emit("announcement:published", payload);
    const notification = await createNotification({
      title: payload.title,
      body: payload.detail,
      type: "announcement",
      priority: "normal",
      createdBy: user.id
    });
    emitNotification(io, notification);
  });
  socket.on("notification:broadcast", async (payload: { title: string; body: string; roles?: JwtUser["role"][]; priority?: "low" | "normal" | "high" | "urgent" }) => {
    if (user.role !== "admin") {
      socket.emit("notification:error", { message: "Only admins can broadcast notifications" });
      return;
    }
    const notification = await createNotification({
      title: payload.title,
      body: payload.body,
      roles: payload.roles,
      priority: payload.priority ?? "normal",
      type: "announcement",
      createdBy: user.id
    });
    emitNotification(io, notification);
  });
  socket.on("invite:sent", (payload) => io.emit("invite:received", payload));
  socket.on("certificate:status", (payload) => io.emit("certificate:status", payload));
  socket.on("poll:vote", (payload) => io.emit("poll:results", payload));
  socket.on("winner:announce", (payload) => io.emit("winner:announced", payload));
});

await connectDatabase();

server.listen(env.port, () => {
  console.info(`Campus Hackathon Manager API running on http://localhost:${env.port}`);
});
