import crypto from "crypto";
import { env } from "../config/env.js";
import { Attendance } from "../models/Attendance.js";

export type AttendanceRole = "Student" | "Mentor" | "Judge" | "Admin";
export type AttendanceStatus = "Present" | "Late" | "Absent";

export type AttendancePayload = {
  qrCode: string;
  name: string;
  team?: string;
  role?: AttendanceRole;
  department?: string;
  eventName?: string;
  method?: "qr" | "manual";
};

const eventStartHour = 9;

function todayAt(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date;
}

const memoryAttendance: any[] = [
  makeRecord({ qrCode: "CHM:ANANYA:001", name: "Ananya Sharma", team: "Neural Nexus", role: "Student", department: "CSE" }, true),
  makeRecord({ qrCode: "CHM:ASHA:002", name: "Dr. Asha Rao", team: "Mentor Guild", role: "Mentor", department: "AI Lab" }, true),
  makeRecord({ qrCode: "CHM:KABIR:003", name: "Kabir Mehta", team: "Judging Panel", role: "Judge", department: "Innovation Cell" }, true)
];

function deriveStatus(checkedInAt: Date): AttendanceStatus {
  return checkedInAt.getTime() > todayAt(eventStartHour + 1).getTime() ? "Late" : "Present";
}

function makeRecord(payload: AttendancePayload, checkedIn = false) {
  const now = new Date();
  return {
    _id: crypto.randomUUID(),
    eventName: payload.eventName ?? "Campus Hackathon 2026",
    qrCode: payload.qrCode,
    name: payload.name,
    team: payload.team ?? "",
    role: payload.role ?? "Student",
    department: payload.department ?? "",
    checkedInAt: checkedIn ? now : undefined,
    checkedOutAt: undefined,
    method: payload.method ?? "qr",
    status: checkedIn ? deriveStatus(now) : "Absent",
    syncStatus: "synced",
    history: checkedIn ? [{ action: "Checked In", at: now, detail: "Initial event check-in." }] : [],
    createdAt: now,
    updatedAt: now
  };
}

export function parseQrPayload(raw: string): AttendancePayload | null {
  const value = raw.trim();
  if (!value || value.toLowerCase().includes("invalid")) return null;
  try {
    const parsed = JSON.parse(value);
    if (!parsed.qrCode && !parsed.id) return null;
    return {
      qrCode: String(parsed.qrCode ?? parsed.id),
      name: String(parsed.name ?? "Unknown Participant"),
      team: parsed.team ? String(parsed.team) : "",
      role: parsed.role as AttendanceRole,
      department: parsed.department ? String(parsed.department) : "",
      eventName: parsed.eventName ? String(parsed.eventName) : "Campus Hackathon 2026",
      method: "qr"
    };
  } catch {
    const parts = value.split(":");
    if (parts.length < 3 || parts[0] !== "CHM") return null;
    return {
      qrCode: value,
      name: parts[1].replace(/-/g, " "),
      team: parts[2] ?? "",
      role: (parts[3] as AttendanceRole) || "Student",
      department: parts[4] ?? "CSE",
      eventName: "Campus Hackathon 2026",
      method: "qr"
    };
  }
}

export function serializeAttendance(record: any) {
  return {
    id: record._id?.toString() ?? record.id,
    eventName: record.eventName,
    qrCode: record.qrCode,
    name: record.name,
    team: record.team,
    role: record.role,
    department: record.department,
    checkedInAt: record.checkedInAt,
    checkedOutAt: record.checkedOutAt,
    method: record.method,
    status: record.status,
    syncStatus: record.syncStatus,
    history: record.history ?? [],
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function listAttendance(query: { eventName?: string; role?: string; team?: string; department?: string; search?: string }) {
  if (!env.mongoUri) {
    let rows = [...memoryAttendance];
    if (query.eventName && query.eventName !== "All") rows = rows.filter((item) => item.eventName === query.eventName);
    if (query.role && query.role !== "All") rows = rows.filter((item) => item.role === query.role);
    if (query.team) rows = rows.filter((item) => item.team.toLowerCase().includes(query.team!.toLowerCase()));
    if (query.department) rows = rows.filter((item) => item.department.toLowerCase().includes(query.department!.toLowerCase()));
    if (query.search) rows = rows.filter((item) => [item.name, item.team, item.role, item.department, item.qrCode].join(" ").toLowerCase().includes(query.search!.toLowerCase()));
    return rows.sort((a, b) => new Date(b.checkedInAt ?? b.createdAt).getTime() - new Date(a.checkedInAt ?? a.createdAt).getTime());
  }

  const filter: Record<string, unknown> = {};
  if (query.eventName && query.eventName !== "All") filter.eventName = query.eventName;
  if (query.role && query.role !== "All") filter.role = query.role;
  if (query.team) filter.team = new RegExp(query.team, "i");
  if (query.department) filter.department = new RegExp(query.department, "i");
  if (query.search) filter.$or = [{ name: new RegExp(query.search, "i") }, { team: new RegExp(query.search, "i") }, { department: new RegExp(query.search, "i") }, { qrCode: new RegExp(query.search, "i") }];
  return Attendance.find(filter).sort({ checkedInAt: -1, createdAt: -1 }).limit(250);
}

export async function checkIn(payload: AttendancePayload) {
  const now = new Date();
  if (!env.mongoUri) {
    const existing = memoryAttendance.find((item) => item.qrCode === payload.qrCode && item.eventName === (payload.eventName ?? "Campus Hackathon 2026"));
    if (existing?.checkedInAt && !existing.checkedOutAt) return { record: existing, duplicate: true };
    if (existing) {
      existing.checkedInAt = now;
      existing.checkedOutAt = undefined;
      existing.status = deriveStatus(now);
      existing.history.unshift({ action: "Checked In", at: now, detail: "Participant re-entered." });
      return { record: existing, duplicate: false };
    }
    const record = makeRecord(payload, true);
    memoryAttendance.unshift(record);
    return { record, duplicate: false };
  }

  const existing = await Attendance.findOne({ qrCode: payload.qrCode, eventName: payload.eventName ?? "Campus Hackathon 2026" });
  if (existing?.checkedInAt && !existing.checkedOutAt) return { record: existing, duplicate: true };
  const update = {
    ...payload,
    eventName: payload.eventName ?? "Campus Hackathon 2026",
    checkedInAt: now,
    checkedOutAt: undefined,
    status: deriveStatus(now),
    $push: { history: { $each: [{ action: "Checked In", at: now, detail: "Participant checked in." }], $position: 0 } }
  };
  const record = await Attendance.findOneAndUpdate({ qrCode: payload.qrCode, eventName: payload.eventName ?? "Campus Hackathon 2026" }, update, { upsert: true, new: true });
  return { record, duplicate: false };
}

export async function checkOut(idOrQr: string) {
  const now = new Date();
  if (!env.mongoUri) {
    const record = memoryAttendance.find((item) => item._id === idOrQr || item.qrCode === idOrQr);
    if (!record) return null;
    record.checkedOutAt = now;
    record.history.unshift({ action: "Checked Out", at: now, detail: "Participant left event area." });
    return record;
  }
  return Attendance.findOneAndUpdate(
    { $or: [{ _id: idOrQr.match(/^[a-f\d]{24}$/i) ? idOrQr : undefined }, { qrCode: idOrQr }] },
    { checkedOutAt: now, $push: { history: { $each: [{ action: "Checked Out", at: now, detail: "Participant checked out." }], $position: 0 } } },
    { new: true }
  );
}

export async function attendanceStats() {
  const rows = (await listAttendance({})).map(serializeAttendance);
  const totalRegistered = Math.max(1284, rows.length);
  const present = rows.filter((item) => item.checkedInAt && !item.checkedOutAt).length;
  const late = rows.filter((item) => item.status === "Late").length;
  const checkedOut = rows.filter((item) => item.checkedOutAt).length;
  const absent = Math.max(0, totalRegistered - present - checkedOut);
  return {
    totalRegistered,
    present,
    absent,
    late,
    checkedOut,
    attendancePercentage: Number(((present / totalRegistered) * 100).toFixed(1)),
    liveActiveParticipants: present,
    chart: [
      { name: "09:00", present: Math.max(0, present - 18), late: Math.max(0, late - 4) },
      { name: "10:00", present: Math.max(0, present - 8), late },
      { name: "Now", present, late }
    ]
  };
}
