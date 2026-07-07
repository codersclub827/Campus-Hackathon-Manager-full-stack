import { useCallback, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, getToken } from "./auth";

type Activity = {
  id: string;
  title: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "rose" | "violet";
  time: string;
};

type LiveMessage = {
  from: string;
  text: string;
  time: string;
};

type LiveScore = {
  team: string;
  score: number;
};

type AttendanceEvent = {
  name: string;
  role: string;
  checkIn: string;
  status: string;
};

type LiveMetrics = {
  hackers: number;
  teams: number;
  submissions: number;
  attendanceRate: number;
  averageScore: number;
};

let sharedSocket: Socket | null = null;

export function getSocket() {
  if (!sharedSocket) {
    sharedSocket = io(API_BASE_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token: getToken() },
      autoConnect: true
    });
  }
  sharedSocket.auth = { token: getToken() };
  return sharedSocket;
}

export function useLiveOps() {
  const socket = useMemo(getSocket, []);
  const [connected, setConnected] = useState(socket.connected);
  const [onlineUsers, setOnlineUsers] = useState(18);
  const [activities, setActivities] = useState<Activity[]>([
    { id: "seed-1", title: "Live system ready", detail: "Socket.io command room connected", tone: "green", time: "now" },
    { id: "seed-2", title: "Submission tracker", detail: "Final upload monitor is active", tone: "blue", time: "1m" }
  ]);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [scores, setScores] = useState<LiveScore[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEvent[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [metrics, setMetrics] = useState<LiveMetrics>({
    hackers: 1284,
    teams: 214,
    submissions: 186,
    attendanceRate: 96,
    averageScore: 87.4
  });

  const pushActivity = useCallback((activity: Omit<Activity, "id" | "time">) => {
    setActivities((items) => [
      { ...activity, id: crypto.randomUUID(), time: "now" },
      ...items.slice(0, 7)
    ]);
  }, []);

  useEffect(() => {
    const onConnect = () => {
      setConnected(true);
      socket.emit("presence:join", { userId: "demo-user", name: "Ananya Sharma", room: "hackathon:sih-2026" });
      socket.emit("join-team", "team:neural-nexus");
    };
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("presence:update", (payload: { onlineUsers?: number; name?: string }) => {
      setOnlineUsers(payload.onlineUsers ?? 18);
      pushActivity({ title: "Presence updated", detail: `${payload.name ?? "A participant"} is online`, tone: "violet" });
    });
    socket.on("team-message", (message: LiveMessage) => {
      setMessages((items) => [{ ...message, time: message.time ?? "now" }, ...items].slice(0, 8));
      pushActivity({ title: "New team message", detail: `${message.from}: ${message.text}`, tone: "blue" });
    });
    socket.on("leaderboard-update", (score: LiveScore) => {
      setScores((items) => [score, ...items.filter((item) => item.team !== score.team)].slice(0, 8));
      setMetrics((current) => ({ ...current, averageScore: Number(((current.averageScore + score.score / 10) / 2).toFixed(1)) }));
      pushActivity({ title: "Judge score updated", detail: `${score.team} moved to ${score.score}`, tone: "amber" });
    });
    socket.on("attendance:checked-in", (event: AttendanceEvent) => {
      setAttendance((items) => [event, ...items].slice(0, 8));
      setMetrics((current) => ({ ...current, attendanceRate: Math.min(100, current.attendanceRate + 1) }));
      pushActivity({ title: "QR attendance", detail: `${event.name} checked in`, tone: "green" });
    });
    socket.on("submission:progress", (event: { team: string; progress: number }) => {
      setUploadProgress(event.progress);
      if (event.progress === 100) {
        setMetrics((current) => ({ ...current, submissions: current.submissions + 1 }));
      }
      pushActivity({ title: "Upload progress", detail: `${event.team} upload is ${event.progress}% complete`, tone: "blue" });
    });
    socket.on("announcement:published", (event: { title: string; detail: string }) => {
      pushActivity({ title: event.title, detail: event.detail, tone: "rose" });
    });

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("presence:update");
      socket.off("team-message");
      socket.off("leaderboard-update");
      socket.off("attendance:checked-in");
      socket.off("submission:progress");
      socket.off("announcement:published");
    };
  }, [pushActivity, socket]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMetrics((current) => ({
        hackers: current.hackers + Math.floor(Math.random() * 3),
        teams: Math.random() > 0.72 ? current.teams + 1 : current.teams,
        submissions: Math.random() > 0.82 ? current.submissions + 1 : current.submissions,
        attendanceRate: Math.min(100, Number((current.attendanceRate + Math.random() * 0.2).toFixed(1))),
        averageScore: Number((current.averageScore + (Math.random() - 0.42) * 0.15).toFixed(1))
      }));
    }, 4500);

    return () => window.clearInterval(timer);
  }, []);

  return {
    connected,
    onlineUsers,
    metrics,
    activities,
    messages,
    scores,
    attendance,
    uploadProgress,
    sendMessage: (text: string) => socket.emit("team-message", { teamId: "team:neural-nexus", from: "You", text }),
    updateScore: (team: string, score: number) => socket.emit("judge-score", { team, score }),
    scanAttendance: (name: string, role: string) =>
      socket.emit("attendance:scan", { name, role, checkIn: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), status: "Verified" }),
    trackUpload: (team: string, progress: number) => socket.emit("submission:progress", { team, progress }),
    publishAnnouncement: (title: string, detail: string) => socket.emit("announcement:publish", { title, detail })
  };
}
