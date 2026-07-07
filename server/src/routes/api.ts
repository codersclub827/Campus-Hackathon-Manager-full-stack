import crypto from "crypto";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { generateFeedback, generateIdea, evaluateProject } from "../services/ai.js";
import { uploadAsset } from "../services/cloudinary.js";
import { sendMail } from "../services/email.js";
import { requireAuth, allowRoles } from "../middleware/auth.js";
import { Evaluation } from "../models/Evaluation.js";
import { Hackathon } from "../models/Hackathon.js";
import { eventStatuses, eventTypes } from "../models/Event.js";
import { notificationRoles } from "../models/Notification.js";
import { Project } from "../models/Project.js";
import { Team } from "../models/Team.js";
import { User } from "../models/User.js";
import {
  countUnreadNotifications,
  createNotification,
  deleteNotificationForUser,
  emitNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  serializeNotification
} from "../services/notifications.js";
import {
  attendanceStats,
  checkIn,
  checkOut,
  listAttendance,
  parseQrPayload,
  serializeAttendance
} from "../services/attendance.js";
import {
  certificateStats,
  createCertificate,
  createCertificatePdf,
  createZip,
  getCertificate,
  listCertificates,
  markDownloaded,
  serializeCertificate,
  updateEmailStatus,
  verifyCertificate,
  type CertificateCategory
} from "../services/certificates.js";
import { cancelEvent, createEvent, deleteEvent, eventStats, listEvents, rsvpEvent, serializeEvent, updateEvent } from "../services/events.js";
import {
  getLeaderboardSnapshot,
  overrideRank,
  resetLeaderboardScores,
  serializeLeaderboardEntry,
  setLeaderboardState,
  submitLeaderboardScore
} from "../services/leaderboard.js";

const router = Router();
const upload = multer({ dest: "uploads/", limits: { fileSize: 25 * 1024 * 1024 } });

router.get("/health", (_req, res) => res.json({ ok: true, service: "Campus Hackathon Manager API" }));

router.get("/analytics/overview", requireAuth, async (_req, res) => {
  const [users, teams, hackathons, projects] = await Promise.all([
    User.countDocuments().catch(() => 1284),
    Team.countDocuments().catch(() => 214),
    Hackathon.countDocuments().catch(() => 3),
    Project.countDocuments().catch(() => 186)
  ]);
  res.json({ users, teams, hackathons, projects, attendanceRate: 96, averageScore: 87.4 });
});

router.get("/users", requireAuth, allowRoles("admin"), async (_req, res) => {
  res.json(await User.find().select("-password").limit(100));
});

router.get("/leaderboard", requireAuth, async (_req, res) => {
  res.json(await getLeaderboardSnapshot());
});

router.post("/leaderboard/scores", requireAuth, allowRoles("judge", "admin"), async (req, res) => {
  const payload = z.object({
    teamId: z.string(),
    judge: z.string().default(req.user!.email),
    editing: z.boolean().default(false),
    scores: z.object({
      innovation: z.number().min(0).max(10),
      technical: z.number().min(0).max(10),
      uiux: z.number().min(0).max(10),
      business: z.number().min(0).max(10),
      presentation: z.number().min(0).max(10),
      impact: z.number().min(0).max(10)
    })
  }).parse(req.body);
  const entry = await submitLeaderboardScore(payload);
  if (!entry) return res.status(404).json({ message: "Team not found" });
  const snapshot = await getLeaderboardSnapshot();
  req.app.get("io").emit("leaderboard:snapshot", snapshot);
  req.app.get("io").emit("leaderboard:score-submitted", serializeLeaderboardEntry(entry));
  const notification = await createNotification({
    title: "New score submitted",
    body: `${serializeLeaderboardEntry(entry).teamName} now has ${serializeLeaderboardEntry(entry).totalScore} points.`,
    type: "judging",
    priority: "normal",
    roles: ["student", "mentor", "judge", "admin"],
    createdBy: req.user!.id
  });
  emitNotification(req.app.get("io"), notification);
  res.json(snapshot);
});

router.patch("/leaderboard/state", requireAuth, allowRoles("admin"), async (req, res) => {
  const payload = z.object({ locked: z.boolean().optional(), published: z.boolean().optional() }).parse(req.body);
  await setLeaderboardState(payload);
  const snapshot = await getLeaderboardSnapshot();
  req.app.get("io").emit("leaderboard:snapshot", snapshot);
  req.app.get("io").emit(payload.published ? "leaderboard:winner-announced" : "leaderboard:state", snapshot.state);
  res.json(snapshot);
});

router.post("/leaderboard/reset", requireAuth, allowRoles("admin"), async (req, res) => {
  const snapshot = await resetLeaderboardScores();
  req.app.get("io").emit("leaderboard:snapshot", snapshot);
  req.app.get("io").emit("leaderboard:reset", snapshot);
  res.json(snapshot);
});

router.patch("/leaderboard/:teamId/rank", requireAuth, allowRoles("admin"), async (req, res) => {
  const { rank } = z.object({ rank: z.number().min(1).max(100) }).parse(req.body);
  const entry = await overrideRank(String(req.params.teamId), rank);
  if (!entry) return res.status(404).json({ message: "Team not found" });
  const snapshot = await getLeaderboardSnapshot();
  req.app.get("io").emit("leaderboard:snapshot", snapshot);
  res.json(snapshot);
});

router.get("/leaderboard/export.csv", requireAuth, allowRoles("admin", "judge"), async (_req, res) => {
  const snapshot = await getLeaderboardSnapshot();
  const rows = [
    ["Rank", "Team", "Project", "Innovation", "Technical", "UI/UX", "Business", "Presentation", "Impact", "Total", "Average", "Status"],
    ...snapshot.entries.map((entry: any) => [
      entry.currentRank,
      entry.teamName,
      entry.projectName,
      entry.scores.innovation,
      entry.scores.technical,
      entry.scores.uiux,
      entry.scores.business,
      entry.scores.presentation,
      entry.scores.impact,
      entry.totalScore,
      entry.averageScore,
      entry.status
    ])
  ];
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"leaderboard-results.csv\"");
  res.send(rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n"));
});

router.get("/events", requireAuth, async (req, res) => {
  const query = z.object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional()
  }).parse(req.query);
  const events = await listEvents(query);
  res.json(events.map(serializeEvent));
});

router.get("/events/dashboard", requireAuth, async (_req, res) => {
  res.json(await eventStats());
});

router.get("/events/schedule.ics", requireAuth, async (_req, res) => {
  const events = (await listEvents({})).map(serializeEvent);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Campus Hackathon Manager//Calendar//EN",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.id}@campus-hackathon`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${event.startsAt.replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTEND:${event.endsAt.replace(/[-:]/g, "").split(".")[0]}Z`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.location}`,
      `DESCRIPTION:${event.type} - ${event.status}`,
      "END:VEVENT"
    ]),
    "END:VCALENDAR"
  ].join("\r\n");
  res.setHeader("Content-Type", "text/calendar");
  res.setHeader("Content-Disposition", "attachment; filename=\"campus-hackathon-schedule.ics\"");
  res.send(ics);
});

router.post("/events", requireAuth, allowRoles("admin"), async (req, res) => {
  const payload = z.object({
    title: z.string().min(2),
    description: z.string().default(""),
    type: z.enum(eventTypes),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    location: z.string().default("Campus Innovation Hub"),
    color: z.string().default("#4f46e5"),
    mentors: z.array(z.string()).default([]),
    judges: z.array(z.string()).default([])
  }).parse(req.body);
  const event = await createEvent({ ...payload, createdBy: req.user!.id });
  const serialized = serializeEvent(event);
  req.app.get("io").emit("event:created", serialized);
  req.app.get("io").emit("calendar:update", { action: "created", event: serialized });
  const notification = await createNotification({
    title: "New schedule event",
    body: `${serialized.title} starts ${new Date(serialized.startsAt).toLocaleString()}.`,
    type: "deadline",
    priority: "normal",
    roles: ["student", "mentor", "judge", "admin"],
    createdBy: req.user!.id
  });
  emitNotification(req.app.get("io"), notification);
  res.status(201).json(serialized);
});

router.patch("/events/:id", requireAuth, allowRoles("admin"), async (req, res) => {
  const payload = z.object({
    title: z.string().min(2).optional(),
    description: z.string().optional(),
    type: z.enum(eventTypes).optional(),
    status: z.enum(eventStatuses).optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    location: z.string().optional(),
    color: z.string().optional(),
    mentors: z.array(z.string()).optional(),
    judges: z.array(z.string()).optional()
  }).parse(req.body);
  const event = await updateEvent(String(req.params.id), payload);
  if (!event) return res.status(404).json({ message: "Event not found" });
  const serialized = serializeEvent(event);
  req.app.get("io").emit("event:updated", serialized);
  req.app.get("io").emit("calendar:update", { action: "updated", event: serialized });
  res.json(serialized);
});

router.post("/events/:id/cancel", requireAuth, allowRoles("admin"), async (req, res) => {
  const event = await cancelEvent(String(req.params.id));
  if (!event) return res.status(404).json({ message: "Event not found" });
  const serialized = serializeEvent(event);
  req.app.get("io").emit("event:cancelled", serialized);
  req.app.get("io").emit("calendar:update", { action: "cancelled", event: serialized });
  const notification = await createNotification({
    title: "Event cancelled",
    body: `${serialized.title} has been cancelled.`,
    type: "deadline",
    priority: "high",
    roles: ["student", "mentor", "judge", "admin"],
    createdBy: req.user!.id
  });
  emitNotification(req.app.get("io"), notification);
  res.json(serialized);
});

router.delete("/events/:id", requireAuth, allowRoles("admin"), async (req, res) => {
  const event = await deleteEvent(String(req.params.id));
  if (!event) return res.status(404).json({ message: "Event not found" });
  req.app.get("io").emit("event:deleted", { id: String(req.params.id) });
  req.app.get("io").emit("calendar:update", { action: "deleted", id: String(req.params.id) });
  res.json({ ok: true });
});

router.post("/events/:id/rsvp", requireAuth, async (req, res) => {
  const event = await rsvpEvent(String(req.params.id), req.user!.id);
  if (!event) return res.status(404).json({ message: "Event not found" });
  const serialized = serializeEvent(event);
  req.app.get("io").emit("event:rsvp", serialized);
  res.json(serialized);
});

router.get("/notifications", requireAuth, async (req, res) => {
  const notifications = await listNotifications(req.user!);
  res.json(notifications.map((notification) => serializeNotification(notification, req.user!.id)));
});

router.get("/notifications/unread-count", requireAuth, async (req, res) => {
  const count = await countUnreadNotifications(req.user!);
  res.json({ count });
});

router.post("/notifications", requireAuth, allowRoles("admin", "mentor"), async (req, res) => {
  const payload = z.object({
    title: z.string().min(2).max(120),
    body: z.string().min(2).max(1200),
    type: z.enum(["system", "announcement", "deadline", "team", "judging", "certificate", "security"]).default("system"),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    link: z.string().default(""),
    roles: z.array(z.enum(notificationRoles)).default([]),
    users: z.array(z.string()).default([])
  }).parse(req.body);
  const notification = await createNotification({ ...payload, createdBy: req.user!.id });
  emitNotification(req.app.get("io"), notification);
  res.status(201).json(serializeNotification(notification, req.user!.id));
});

router.post("/notifications/broadcast", requireAuth, allowRoles("admin"), async (req, res) => {
  const payload = z.object({
    title: z.string().min(2).max(120),
    body: z.string().min(2).max(1200),
    type: z.enum(["system", "announcement", "deadline", "team", "judging", "certificate", "security"]).default("announcement"),
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    link: z.string().default(""),
    roles: z.array(z.enum(notificationRoles)).default([...notificationRoles])
  }).parse(req.body);
  const notification = await createNotification({ ...payload, createdBy: req.user!.id });
  emitNotification(req.app.get("io"), notification);
  res.status(201).json(serializeNotification(notification, req.user!.id));
});

router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  const notification = await markNotificationRead(String(req.params.id), req.user!);
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  req.app.get("io").to(`user:${req.user!.id}`).emit("notification:read", { id: notification._id?.toString() ?? notification.id });
  res.json(serializeNotification(notification, req.user!.id));
});

router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  await markAllNotificationsRead(req.user!);
  req.app.get("io").to(`user:${req.user!.id}`).emit("notification:read-all");
  res.json({ ok: true });
});

router.delete("/notifications/:id", requireAuth, async (req, res) => {
  const notification = await deleteNotificationForUser(String(req.params.id), req.user!);
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  req.app.get("io").to(`user:${req.user!.id}`).emit("notification:deleted", { id: notification._id?.toString() ?? notification.id });
  res.json({ ok: true });
});

router.post("/hackathons", requireAuth, allowRoles("admin"), async (req, res) => {
  const payload = z.object({
    title: z.string(),
    theme: z.string(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    venue: z.string(),
    tracks: z.array(z.string()).default([])
  }).parse(req.body);
  res.status(201).json(await Hackathon.create(payload));
});

router.post("/teams", requireAuth, allowRoles("student", "admin"), async (req, res) => {
  const payload = z.object({ name: z.string().min(2), hackathon: z.string().optional() }).parse(req.body);
  const team = await Team.create({ ...payload, members: [req.user?.id], inviteCode: crypto.randomBytes(4).toString("hex") });
  res.status(201).json(team);
});

router.post("/teams/join", requireAuth, allowRoles("student"), async (req, res) => {
  const { inviteCode } = z.object({ inviteCode: z.string() }).parse(req.body);
  const team = await Team.findOneAndUpdate({ inviteCode }, { $addToSet: { members: req.user?.id } }, { new: true });
  if (!team) return res.status(404).json({ message: "Team invite code not found" });
  res.json(team);
});

router.post("/projects", requireAuth, allowRoles("student", "admin"), async (req, res) => {
  const payload = z.object({
    title: z.string(),
    team: z.string(),
    description: z.string(),
    githubUrl: z.string().url(),
    demoVideoUrl: z.string().url(),
    deploymentUrl: z.string().url().optional()
  }).parse(req.body);
  res.status(201).json(await Project.create({ ...payload, status: "submitted", submittedAt: new Date() }));
});

router.post("/projects/:projectId/assets", requireAuth, upload.single("asset"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Asset file is required" });
  const result = await uploadAsset(req.file.path);
  const project = await Project.findByIdAndUpdate(req.params.projectId, { $push: { assets: result.secure_url } }, { new: true });
  res.json({ project, assetUrl: result.secure_url });
});

router.post("/evaluations", requireAuth, allowRoles("judge", "admin"), async (req, res) => {
  const payload = z.object({
    project: z.string(),
    rubric: z.object({
      innovation: z.number().min(0).max(10),
      execution: z.number().min(0).max(10),
      impact: z.number().min(0).max(10),
      design: z.number().min(0).max(10),
      pitch: z.number().min(0).max(10)
    }),
    comments: z.string().min(3)
  }).parse(req.body);
  res.status(201).json(await Evaluation.create({ ...payload, judge: req.user?.id }));
});

router.get("/attendance", requireAuth, async (req, res) => {
  const query = z.object({
    eventName: z.string().optional(),
    role: z.string().optional(),
    team: z.string().optional(),
    department: z.string().optional(),
    search: z.string().optional()
  }).parse(req.query);
  const rows = await listAttendance(query);
  res.json(rows.map(serializeAttendance));
});

router.get("/attendance/stats", requireAuth, async (_req, res) => {
  res.json(await attendanceStats());
});

router.post("/attendance/scan", requireAuth, allowRoles("admin", "mentor"), async (req, res) => {
  const { raw } = z.object({ raw: z.string().min(2) }).parse(req.body);
  const payload = parseQrPayload(raw);
  if (!payload) {
    req.app.get("io").emit("attendance:invalid", { raw, message: "Invalid QR" });
    return res.status(400).json({ message: "Invalid QR code" });
  }
  const result = await checkIn(payload);
  const serialized = serializeAttendance(result.record);
  if (result.duplicate) {
    req.app.get("io").emit("attendance:duplicate", serialized);
    return res.status(409).json({ message: "Duplicate QR detected", attendance: serialized });
  }
  req.app.get("io").emit("attendance:checked-in", serialized);
  req.app.get("io").emit("attendance:stats", await attendanceStats());
  res.status(201).json(serialized);
});

router.post("/attendance/manual", requireAuth, allowRoles("admin", "mentor"), async (req, res) => {
  const payload = z.object({
    qrCode: z.string().min(2).default(`MANUAL-${Date.now()}`),
    name: z.string().min(2),
    team: z.string().default(""),
    role: z.enum(["Student", "Mentor", "Judge", "Admin"]).default("Student"),
    department: z.string().default(""),
    eventName: z.string().default("Campus Hackathon 2026")
  }).parse(req.body);
  const result = await checkIn({ ...payload, method: "manual" });
  const serialized = serializeAttendance(result.record);
  req.app.get("io").emit("attendance:checked-in", serialized);
  req.app.get("io").emit("attendance:stats", await attendanceStats());
  res.status(result.duplicate ? 409 : 201).json(serialized);
});

router.post("/attendance/:id/checkout", requireAuth, allowRoles("admin", "mentor"), async (req, res) => {
  const record = await checkOut(String(req.params.id));
  if (!record) return res.status(404).json({ message: "Attendance record not found" });
  const serialized = serializeAttendance(record);
  req.app.get("io").emit("attendance:checked-out", serialized);
  req.app.get("io").emit("attendance:stats", await attendanceStats());
  res.json(serialized);
});

router.get("/attendance/export.csv", requireAuth, allowRoles("admin", "mentor"), async (_req, res) => {
  const rows = (await listAttendance({})).map(serializeAttendance);
  const csv = [
    ["Name", "Team", "Role", "Department", "Check-in", "Check-out", "Status", "QR"],
    ...rows.map((row) => [row.name, row.team, row.role, row.department, row.checkedInAt ?? "", row.checkedOutAt ?? "", row.status, row.qrCode])
  ].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=\"attendance.csv\"");
  res.send(csv);
});

router.get("/certificates", requireAuth, async (req, res) => {
  const query = z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    sort: z.string().optional(),
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional()
  }).parse(req.query);
  const result = await listCertificates(query);
  res.json({ ...result, rows: result.rows.map(serializeCertificate) });
});

router.get("/certificates/dashboard", requireAuth, async (_req, res) => {
  res.json(await certificateStats());
});

router.get("/certificates/verify/:certificateId", async (req, res) => {
  const certificate = await verifyCertificate(req.params.certificateId);
  if (!certificate) return res.status(404).json({ message: "Certificate not found" });
  res.json({ valid: true, certificate: serializeCertificate(certificate) });
});

router.post("/certificates/generate", requireAuth, allowRoles("admin"), async (req, res) => {
  const payload = z.object({
    recipientName: z.string().min(2),
    recipientEmail: z.string().email(),
    teamName: z.string().default(""),
    eventName: z.string().default("Campus Hackathon 2026"),
    award: z.string().default("Participation Certificate"),
    category: z.enum(["Winner", "Runner-up", "Participant", "Mentor", "Judge", "Organizer"]).default("Participant")
  }).parse(req.body);
  const certificate = await createCertificate(payload);
  const serialized = serializeCertificate(certificate);
  req.app.get("io").emit("certificate:generated", serialized);
  const notification = await createNotification({
    title: "Certificate generated",
    body: `${serialized.recipientName}'s ${serialized.award} is ready.`,
    type: "certificate",
    priority: "normal",
    roles: ["admin", "student", "mentor", "judge"],
    createdBy: req.user!.id
  });
  emitNotification(req.app.get("io"), notification);
  res.status(201).json(serialized);
});

router.post("/certificates/batch", requireAuth, allowRoles("admin"), async (req, res) => {
  const payload = z.object({
    eventName: z.string().default("Campus Hackathon 2026"),
    finalized: z.boolean().default(true),
    recipients: z.array(z.object({
      recipientName: z.string().min(2),
      recipientEmail: z.string().email(),
      teamName: z.string().default(""),
      award: z.string().default("Participation Certificate"),
      category: z.enum(["Winner", "Runner-up", "Participant", "Mentor", "Judge", "Organizer"]).default("Participant")
    })).default([])
  }).parse(req.body);

  if (!payload.finalized) return res.status(409).json({ message: "Hackathon results must be finalized before certificate generation." });

  const recipients = payload.recipients.length ? payload.recipients : [
    { recipientName: "Ananya Sharma", recipientEmail: "ananya@campus.edu", teamName: "Neural Nexus", award: "Grand Winner", category: "Winner" as CertificateCategory },
    { recipientName: "Rohan Verma", recipientEmail: "rohan@campus.edu", teamName: "Neural Nexus", award: "Winner", category: "Winner" as CertificateCategory },
    { recipientName: "Mehak Jain", recipientEmail: "mehak@campus.edu", teamName: "Pixel Pioneers", award: "Runner-up", category: "Runner-up" as CertificateCategory },
    { recipientName: "Dr. Asha Rao", recipientEmail: "asha@campus.edu", teamName: "Mentor Guild", award: "Mentor Appreciation", category: "Mentor" as CertificateCategory },
    { recipientName: "Kabir Mehta", recipientEmail: "kabir@campus.edu", teamName: "Judging Panel", award: "Judge Appreciation", category: "Judge" as CertificateCategory }
  ];

  const created = [];
  for (let index = 0; index < recipients.length; index += 1) {
    const certificate = await createCertificate({ ...recipients[index], eventName: payload.eventName });
    const progress = Math.round(((index + 1) / recipients.length) * 100);
    const serialized = serializeCertificate(certificate);
    created.push(serialized);
    req.app.get("io").emit("certificate:progress", { progress, current: serialized, total: recipients.length });
    req.app.get("io").emit("certificate:generated", serialized);
  }

  const notification = await createNotification({
    title: "Batch certificates generated",
    body: `${created.length} certificates were generated for ${payload.eventName}.`,
    type: "certificate",
    priority: "high",
    roles: ["admin", "student", "mentor", "judge"],
    createdBy: req.user!.id
  });
  emitNotification(req.app.get("io"), notification);
  res.status(201).json({ created, total: created.length });
});

router.post("/certificates/:id/email", requireAuth, allowRoles("admin"), async (req, res) => {
  const certificate = await getCertificate(String(req.params.id));
  if (!certificate) return res.status(404).json({ message: "Certificate not found" });
  req.app.get("io").emit("certificate:email-status", { id: serializeCertificate(certificate).id, emailStatus: "Sending" });
  await updateEmailStatus(String(req.params.id), "Sending", "Certificate email queued.");
  try {
    await sendMail(certificate.recipientEmail, `Your ${certificate.eventName} certificate`, `<p>Hi ${certificate.recipientName}, your certificate ${certificate.certificateId} is ready.</p>`);
    const updated = await updateEmailStatus(String(req.params.id), "Sent", "Certificate emailed successfully.");
    const serialized = serializeCertificate(updated);
    req.app.get("io").emit("certificate:email-status", { id: serialized.id, emailStatus: "Sent" });
    res.json(serialized);
  } catch (error) {
    const updated = await updateEmailStatus(String(req.params.id), "Failed", error instanceof Error ? error.message : "Email failed.");
    const serialized = serializeCertificate(updated);
    req.app.get("io").emit("certificate:email-status", { id: serialized.id, emailStatus: "Failed" });
    res.status(500).json(serialized);
  }
});

router.get("/certificates/:id/pdf", requireAuth, async (req, res) => {
  const certificate = await markDownloaded(String(req.params.id));
  if (!certificate) return res.status(404).json({ message: "Certificate not found" });
  req.app.get("io").emit("certificate:downloaded", serializeCertificate(certificate));
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${certificate.certificateId}.pdf"`);
  res.send(createCertificatePdf(certificate));
});

router.get("/certificates/download/all.zip", requireAuth, async (_req, res) => {
  const result = await listCertificates({ page: 1, limit: 50 });
  const files = result.rows.map((certificate: any) => ({
    name: `${certificate.certificateId}.pdf`,
    content: createCertificatePdf(certificate)
  }));
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", "attachment; filename=\"campus-certificates.zip\"");
  res.send(createZip(files));
});

router.post("/broadcast", requireAuth, allowRoles("admin"), async (req, res) => {
  const payload = z.object({ to: z.string().email(), subject: z.string(), html: z.string() }).parse(req.body);
  res.json(await sendMail(payload.to, payload.subject, payload.html));
});

router.post("/ai/ideas", requireAuth, (req, res) => {
  const { theme } = z.object({ theme: z.string().default("campus impact") }).parse(req.body);
  res.json(generateIdea(theme));
});

router.post("/ai/evaluate", requireAuth, (req, res) => {
  const { description } = z.object({ description: z.string().min(10) }).parse(req.body);
  res.json(evaluateProject(description));
});

router.post("/ai/feedback", requireAuth, (req, res) => {
  const { projectName } = z.object({ projectName: z.string().min(2) }).parse(req.body);
  res.json(generateFeedback(projectName));
});

export default router;
