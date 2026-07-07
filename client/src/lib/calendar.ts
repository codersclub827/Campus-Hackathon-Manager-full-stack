import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch, apiUrl, getToken } from "./auth";
import { getSocket } from "./live";

export type CalendarView = "day" | "week" | "month" | "agenda";
export type CalendarEventType =
  | "Hackathon Registration"
  | "Team Formation"
  | "Mentor Meetings"
  | "Judge Evaluation"
  | "Project Submission"
  | "Workshops"
  | "Coding Round"
  | "PPT Presentation"
  | "Demo Session"
  | "Final Judging"
  | "Winner Announcement"
  | "Certificate Distribution";
export type CalendarEventStatus = "Upcoming" | "Ongoing" | "Completed" | "Cancelled";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string;
  type: CalendarEventType;
  status: CalendarEventStatus;
  startsAt: string;
  endsAt: string;
  location: string;
  color: string;
  mentors: string[];
  judges: string[];
  attendeeCount: number;
  rsvpCount: number;
};

export type EventDashboard = {
  today: number;
  upcoming: number;
  ongoing: number;
  missed: number;
  nextDeadline: CalendarEvent | null;
  recentActivity: CalendarEvent[];
};

export const eventTypes: CalendarEventType[] = [
  "Hackathon Registration",
  "Team Formation",
  "Mentor Meetings",
  "Judge Evaluation",
  "Project Submission",
  "Workshops",
  "Coding Round",
  "PPT Presentation",
  "Demo Session",
  "Final Judging",
  "Winner Announcement",
  "Certificate Distribution"
];

const now = new Date();
const at = (hour: number, minute = 0, offset = 0) => {
  const date = new Date(now);
  date.setDate(now.getDate() + offset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const demoEvents: CalendarEvent[] = [
  { id: "evt-1", title: "Hackathon Registration Opens", description: "Badge pickup, kit collection, and onboarding.", type: "Hackathon Registration", status: "Upcoming", startsAt: at(9), endsAt: at(10), location: "Main Atrium", color: "#4f46e5", mentors: [], judges: [], attendeeCount: 428, rsvpCount: 312 },
  { id: "evt-2", title: "Team Formation Sprint", description: "Find collaborators and lock your working pod.", type: "Team Formation", status: "Upcoming", startsAt: at(11), endsAt: at(12, 30), location: "Collab Lab", color: "#06b6d4", mentors: ["Dr. Asha Rao"], judges: [], attendeeCount: 210, rsvpCount: 184 },
  { id: "evt-3", title: "Prototype Workshop", description: "Turn early ideas into demo-ready flows.", type: "Workshops", status: "Upcoming", startsAt: at(14), endsAt: at(15, 30), location: "Studio B", color: "#10b981", mentors: ["Naina Kapoor"], judges: [], attendeeCount: 98, rsvpCount: 77 },
  { id: "evt-4", title: "Project Submission Deadline", description: "GitHub, deck, deployment URL, and demo video due.", type: "Project Submission", status: "Upcoming", startsAt: at(20), endsAt: at(22), location: "Online Portal", color: "#f59e0b", mentors: [], judges: [], attendeeCount: 0, rsvpCount: 0 },
  { id: "evt-5", title: "Final Judging", description: "Top teams pitch to the judging panel.", type: "Final Judging", status: "Upcoming", startsAt: at(10, 30, 1), endsAt: at(13, 30, 1), location: "Innovation Hall", color: "#ef4444", mentors: [], judges: ["Kabir Mehta", "Meera Iyer"], attendeeCount: 64, rsvpCount: 64 }
];

function statusFor(event: CalendarEvent): CalendarEventStatus {
  if (event.status === "Cancelled") return "Cancelled";
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const time = Date.now();
  if (time < start) return "Upcoming";
  if (time > end) return "Completed";
  return "Ongoing";
}

function dashboard(events: CalendarEvent[]): EventDashboard {
  const normalized = events.map((event) => ({ ...event, status: statusFor(event) }));
  const today = new Date().toDateString();
  const upcoming = normalized.filter((event) => event.status === "Upcoming");
  return {
    today: normalized.filter((event) => new Date(event.startsAt).toDateString() === today).length,
    upcoming: upcoming.length,
    ongoing: normalized.filter((event) => event.status === "Ongoing").length,
    missed: normalized.filter((event) => event.status === "Completed").length,
    nextDeadline: upcoming.find((event) => event.type.includes("Submission") || event.type.includes("Registration")) ?? upcoming[0] ?? null,
    recentActivity: normalized.slice(-5).reverse()
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function useEventCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>(demoEvents);
  const [stats, setStats] = useState<EventDashboard>(dashboard(demoEvents));
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CalendarEventType | "All">("All");
  const [dark, setDark] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!getToken()) {
        const filtered = demoEvents.filter((event) => typeFilter === "All" || event.type === typeFilter).filter((event) => [event.title, event.location, event.type].join(" ").toLowerCase().includes(search.toLowerCase()));
        setEvents(filtered);
        setStats(dashboard(filtered));
        return;
      }
      const params = new URLSearchParams({ search, type: typeFilter });
      const [list, nextStats] = await Promise.all([
        apiFetch<CalendarEvent[]>(`/api/events?${params}`),
        apiFetch<EventDashboard>("/api/events/dashboard")
      ]);
      setEvents(list);
      setStats(nextStats);
    } catch (error) {
      toast.error("Could not load calendar", { description: error instanceof Error ? error.message : "Using preview schedule." });
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = getSocket();
    const upsert = (event: CalendarEvent) => {
      setEvents((items) => [event, ...items.filter((item) => item.id !== event.id)].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()));
    };
    const remove = ({ id }: { id: string }) => setEvents((items) => items.filter((event) => event.id !== id));
    const onCreated = (event: CalendarEvent) => {
      upsert(event);
      toast.success("Event created", { description: event.title });
    };
    const onUpdated = (event: CalendarEvent) => {
      upsert(event);
      toast("Event updated", { description: event.title });
    };
    const onCancelled = (event: CalendarEvent) => {
      upsert(event);
      toast.error("Event cancelled", { description: event.title });
    };

    socket.on("event:created", onCreated);
    socket.on("event:updated", onUpdated);
    socket.on("event:cancelled", onCancelled);
    socket.on("event:deleted", remove);
    socket.on("event:rsvp", upsert);
    if (!socket.connected) socket.connect();

    return () => {
      socket.off("event:created", onCreated);
      socket.off("event:updated", onUpdated);
      socket.off("event:cancelled", onCancelled);
      socket.off("event:deleted", remove);
      socket.off("event:rsvp", upsert);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTick(Date.now());
      events.forEach((event) => {
        const diff = new Date(event.startsAt).getTime() - Date.now();
        if (diff > 0 && diff < 15 * 60_000 && !sessionStorage.getItem(`reminded:${event.id}`)) {
          sessionStorage.setItem(`reminded:${event.id}`, "1");
          toast("Event starts soon", { description: `${event.title} starts in ${Math.ceil(diff / 60_000)} minutes.` });
        }
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [events]);

  const createSampleEvent = async () => {
    const start = new Date(selectedDate);
    start.setHours(16, 0, 0, 0);
    const end = new Date(start);
    end.setHours(17, 0, 0, 0);
    const payload = {
      title: "Live Mentor Meeting",
      description: "Architecture review and pitch feedback.",
      type: "Mentor Meetings" as CalendarEventType,
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      location: "Teams Room 4",
      color: "#8b5cf6",
      mentors: ["Dr. Asha Rao"],
      judges: []
    };
    if (!getToken()) {
      const event: CalendarEvent = { ...payload, id: crypto.randomUUID(), status: "Upcoming", attendeeCount: 0, rsvpCount: 0 };
      setEvents((items) => [event, ...items]);
      toast.success("Demo event created");
      return;
    }
    await apiFetch<CalendarEvent>("/api/events", { method: "POST", body: JSON.stringify(payload) });
  };

  const createCustomEvent = async (payload: {
    title: string;
    description: string;
    type: CalendarEventType;
    startsAt: string;
    endsAt: string;
    location: string;
    color: string;
    mentors: string[];
    judges: string[];
  }) => {
    if (!getToken()) {
      const event: CalendarEvent = { ...payload, id: crypto.randomUUID(), status: "Upcoming", attendeeCount: 0, rsvpCount: 0 };
      setEvents((items) => [event, ...items]);
      toast.success("Demo event created");
      return;
    }
    await apiFetch<CalendarEvent>("/api/events", { method: "POST", body: JSON.stringify(payload) });
  };

  const updateEventTime = async (event: CalendarEvent, minutes: number) => {
    const startsAt = new Date(new Date(event.startsAt).getTime() + minutes * 60_000).toISOString();
    const endsAt = new Date(new Date(event.endsAt).getTime() + minutes * 60_000).toISOString();
    if (!getToken() || event.id.startsWith("evt-")) {
      setEvents((items) => items.map((item) => (item.id === event.id ? { ...item, startsAt, endsAt } : item)));
      toast.success("Event rescheduled");
      return;
    }
    await apiFetch<CalendarEvent>(`/api/events/${event.id}`, { method: "PATCH", body: JSON.stringify({ startsAt, endsAt }) });
  };

  const cancel = async (event: CalendarEvent) => {
    if (!getToken() || event.id.startsWith("evt-")) {
      setEvents((items) => items.map((item) => (item.id === event.id ? { ...item, status: "Cancelled" } : item)));
      toast.error("Event cancelled");
      return;
    }
    await apiFetch<CalendarEvent>(`/api/events/${event.id}/cancel`, { method: "POST" });
  };

  const deleteCalendarEvent = async (event: CalendarEvent) => {
    if (!getToken() || event.id.startsWith("evt-")) {
      setEvents((items) => items.filter((item) => item.id !== event.id));
      toast.success("Event deleted");
      return;
    }
    await apiFetch<{ ok: boolean }>(`/api/events/${event.id}`, { method: "DELETE" });
  };

  const rsvp = async (event: CalendarEvent) => {
    if (!getToken() || event.id.startsWith("evt-")) {
      setEvents((items) => items.map((item) => (item.id === event.id ? { ...item, rsvpCount: item.rsvpCount + 1 } : item)));
      toast.success("RSVP saved");
      return;
    }
    await apiFetch<CalendarEvent>(`/api/events/${event.id}/rsvp`, { method: "POST" });
  };

  const downloadSchedule = async () => {
    if (!getToken()) {
      downloadBlob(new Blob(["BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR"], { type: "text/calendar" }), "campus-hackathon-schedule.ics");
      return;
    }
    const response = await fetch(apiUrl("/api/events/schedule.ics"), { headers: { Authorization: `Bearer ${getToken()}` } });
    downloadBlob(await response.blob(), "campus-hackathon-schedule.ics");
  };

  const visibleEvents = useMemo(() => events.map((event) => ({ ...event, status: statusFor(event) })).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()), [events, nowTick]);
  const nextEvent = useMemo(() => visibleEvents.find((event) => event.status === "Upcoming") ?? null, [visibleEvents]);

  return {
    events: visibleEvents,
    stats: dashboard(visibleEvents.length ? visibleEvents : events),
    serverStats: stats,
    loading,
    view,
    selectedDate,
    search,
    typeFilter,
    dark,
    nextEvent,
    nowTick,
    setView,
    setSelectedDate,
    setSearch,
    setTypeFilter,
    setDark,
    refresh,
    createSampleEvent,
    createCustomEvent,
    updateEventTime,
    cancel,
    deleteCalendarEvent,
    rsvp,
    downloadSchedule
  };
}
