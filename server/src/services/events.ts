import crypto from "crypto";
import { env } from "../config/env.js";
import { Event, eventStatuses, eventTypes } from "../models/Event.js";

export type EventType = (typeof eventTypes)[number];
export type EventStatus = (typeof eventStatuses)[number];

export type EventInput = {
  title: string;
  description?: string;
  type: EventType;
  startsAt: Date;
  endsAt: Date;
  location?: string;
  color?: string;
  mentors?: string[];
  judges?: string[];
  createdBy?: string;
};

const today = new Date();
const at = (hour: number, minute = 0, dayOffset = 0) => {
  const date = new Date(today);
  date.setDate(today.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const memoryEvents: any[] = [
  buildEvent({ title: "Hackathon Registration Opens", type: "Hackathon Registration", startsAt: at(9), endsAt: at(10), color: "#4f46e5", location: "Main Atrium" }),
  buildEvent({ title: "Team Formation Sprint", type: "Team Formation", startsAt: at(11), endsAt: at(12, 30), color: "#06b6d4", location: "Collab Lab", mentors: ["Dr. Asha Rao"] }),
  buildEvent({ title: "Prototype Workshop", type: "Workshops", startsAt: at(14), endsAt: at(15, 30), color: "#10b981", location: "Studio B", mentors: ["Naina Kapoor"] }),
  buildEvent({ title: "Project Submission Deadline", type: "Project Submission", startsAt: at(20), endsAt: at(22), color: "#f59e0b", location: "Online Portal" }),
  buildEvent({ title: "Final Judging", type: "Final Judging", startsAt: at(10, 30, 1), endsAt: at(13, 30, 1), color: "#ef4444", location: "Innovation Hall", judges: ["Kabir Mehta", "Meera Iyer"] }),
  buildEvent({ title: "Winner Announcement", type: "Winner Announcement", startsAt: at(17, 0, 1), endsAt: at(18, 0, 1), color: "#8b5cf6", location: "Auditorium" })
];

export function resolveStatus(startsAt: Date, endsAt: Date, currentStatus?: EventStatus) {
  if (currentStatus === "Cancelled") return "Cancelled";
  const now = Date.now();
  if (now < startsAt.getTime()) return "Upcoming";
  if (now > endsAt.getTime()) return "Completed";
  return "Ongoing";
}

export function buildEvent(input: EventInput) {
  const now = new Date();
  return {
    _id: crypto.randomUUID(),
    title: input.title,
    description: input.description ?? "",
    type: input.type,
    status: resolveStatus(input.startsAt, input.endsAt),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    location: input.location ?? "Campus Innovation Hub",
    color: input.color ?? "#4f46e5",
    mentors: input.mentors ?? [],
    judges: input.judges ?? [],
    attendees: [],
    rsvps: [],
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now
  };
}

export function serializeEvent(event: any) {
  const startsAt = new Date(event.startsAt);
  const endsAt = new Date(event.endsAt);
  return {
    id: event._id?.toString() ?? event.id,
    title: event.title,
    description: event.description ?? "",
    type: event.type,
    status: resolveStatus(startsAt, endsAt, event.status),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    location: event.location,
    color: event.color,
    mentors: event.mentors ?? [],
    judges: event.judges ?? [],
    attendeeCount: event.attendees?.length ?? 0,
    rsvpCount: event.rsvps?.length ?? 0,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

export async function listEvents(query: { from?: Date; to?: Date; type?: string; status?: string; search?: string }) {
  if (!env.mongoUri) {
    let rows = [...memoryEvents];
    if (query.from) rows = rows.filter((event) => new Date(event.endsAt) >= query.from!);
    if (query.to) rows = rows.filter((event) => new Date(event.startsAt) <= query.to!);
    if (query.type && query.type !== "All") rows = rows.filter((event) => event.type === query.type);
    if (query.status && query.status !== "All") rows = rows.filter((event) => serializeEvent(event).status === query.status);
    if (query.search) rows = rows.filter((event) => [event.title, event.location, event.type].join(" ").toLowerCase().includes(query.search!.toLowerCase()));
    return rows.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }

  const filter: Record<string, unknown> = {};
  if (query.from || query.to) {
    if (query.from) filter.endsAt = { $gte: query.from };
    if (query.to) filter.startsAt = { $lte: query.to };
  }
  if (query.type && query.type !== "All") filter.type = query.type;
  if (query.status && query.status !== "All") filter.status = query.status;
  if (query.search) filter.$or = [{ title: new RegExp(query.search, "i") }, { location: new RegExp(query.search, "i") }, { type: new RegExp(query.search, "i") }];
  return Event.find(filter).sort({ startsAt: 1 }).limit(250);
}

export async function createEvent(input: EventInput) {
  const event = buildEvent(input);
  if (!env.mongoUri) {
    memoryEvents.push(event);
    return event;
  }
  return Event.create(event);
}

export async function updateEvent(id: string, input: Partial<EventInput> & { status?: EventStatus }) {
  if (!env.mongoUri) {
    const event = memoryEvents.find((item) => item._id === id);
    if (!event) return null;
    Object.assign(event, input, {
      startsAt: input.startsAt ?? event.startsAt,
      endsAt: input.endsAt ?? event.endsAt,
      updatedAt: new Date()
    });
    event.status = input.status ?? resolveStatus(new Date(event.startsAt), new Date(event.endsAt), event.status);
    return event;
  }
  return Event.findByIdAndUpdate(id, input, { new: true });
}

export async function cancelEvent(id: string) {
  if (!env.mongoUri) {
    const event = memoryEvents.find((item) => item._id === id);
    if (!event) return null;
    event.status = "Cancelled";
    event.cancelledAt = new Date();
    event.updatedAt = new Date();
    return event;
  }
  return Event.findByIdAndUpdate(id, { status: "Cancelled", cancelledAt: new Date() }, { new: true });
}

export async function deleteEvent(id: string) {
  if (!env.mongoUri) {
    const index = memoryEvents.findIndex((item) => item._id === id);
    if (index === -1) return null;
    return memoryEvents.splice(index, 1)[0];
  }
  return Event.findByIdAndDelete(id);
}

export async function rsvpEvent(id: string, userId: string) {
  if (!env.mongoUri) {
    const event = memoryEvents.find((item) => item._id === id);
    if (!event) return null;
    event.rsvps = [...new Set([...(event.rsvps ?? []), userId])];
    return event;
  }
  return Event.findByIdAndUpdate(id, { $addToSet: { rsvps: userId } }, { new: true });
}

export async function eventStats() {
  const rows = (await listEvents({})).map(serializeEvent);
  const todayKey = new Date().toDateString();
  const upcoming = rows.filter((event) => event.status === "Upcoming");
  return {
    today: rows.filter((event) => new Date(event.startsAt).toDateString() === todayKey).length,
    upcoming: upcoming.length,
    ongoing: rows.filter((event) => event.status === "Ongoing").length,
    missed: rows.filter((event) => event.status === "Completed").length,
    nextDeadline: upcoming.find((event) => event.type.includes("Submission") || event.type.includes("Registration")) ?? upcoming[0] ?? null,
    recentActivity: rows.slice(-5).reverse()
  };
}
