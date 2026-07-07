import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch, getCurrentUser, getToken, type UserRole } from "./auth";
import { getSocket } from "./live";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: "system" | "announcement" | "deadline" | "team" | "judging" | "certificate" | "security";
  priority: "low" | "normal" | "high" | "urgent";
  link?: string;
  roles: UserRole[];
  users: string[];
  read: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BroadcastPayload = {
  title: string;
  body: string;
  type?: NotificationItem["type"];
  priority?: NotificationItem["priority"];
  roles?: UserRole[];
  link?: string;
};

const demoNotifications: NotificationItem[] = [
  {
    id: "demo-urgent",
    title: "Judging room changed",
    body: "Round 2 evaluations moved to Innovation Hall A. Judges and finalists should arrive 10 minutes early.",
    type: "judging",
    priority: "urgent",
    roles: ["student", "judge", "admin"],
    users: [],
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString()
  },
  {
    id: "demo-certificate",
    title: "Certificate batch ready",
    body: "Participation certificates are generated and ready for admin review.",
    type: "certificate",
    priority: "normal",
    roles: ["admin"],
    users: [],
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  }
];

function notifyBrowser(notification: NotificationItem) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(notification.title, { body: notification.body, tag: notification.id });
}

function playNotificationSound() {
  const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 740;
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.24);
}

export function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minute = 60_000;
  if (diff < minute) return "now";
  if (diff < minute * 60) return `${Math.floor(diff / minute)}m`;
  if (diff < minute * 60 * 24) return `${Math.floor(diff / (minute * 60))}h`;
  return `${Math.floor(diff / (minute * 60 * 24))}d`;
}

export function useNotificationCenter(options: { silent?: boolean } = {}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [browserEnabled, setBrowserEnabled] = useState(() => "Notification" in window && Notification.permission === "granted");
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("notification_sound") === "on");
  const user = getCurrentUser();

  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  const insertNotification = useCallback((notification: NotificationItem, alert = true) => {
    setNotifications((items) => [notification, ...items.filter((item) => item.id !== notification.id)].slice(0, 100));
    if (!alert || options.silent) return;

    toast(notification.title, { description: notification.body });
    notifyBrowser(notification);
    if (localStorage.getItem("notification_sound") === "on") playNotificationSound();
  }, [options.silent]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!getToken()) {
        setNotifications(demoNotifications);
        return;
      }
      const data = await apiFetch<NotificationItem[]>("/api/notifications");
      setNotifications(data);
    } catch (error) {
      toast.error("Could not load notifications", { description: error instanceof Error ? error.message : "Try again shortly." });
      setNotifications((items) => (items.length ? items : demoNotifications));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => {
      socket.auth = { token: getToken() };
    };
    const onNew = (notification: NotificationItem) => insertNotification({ ...notification, read: false });
    const onRead = ({ id }: { id: string }) => {
      setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
    };
    const onReadAll = () => {
      setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    };
    const onDeleted = ({ id }: { id: string }) => {
      setNotifications((items) => items.filter((item) => item.id !== id));
    };

    socket.on("connect", onConnect);
    socket.on("notification:new", onNew);
    socket.on("notification:read", onRead);
    socket.on("notification:read-all", onReadAll);
    socket.on("notification:deleted", onDeleted);
    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("notification:new", onNew);
      socket.off("notification:read", onRead);
      socket.off("notification:read-all", onReadAll);
      socket.off("notification:deleted", onDeleted);
    };
  }, [insertNotification]);

  const markRead = async (id: string) => {
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
    if (getToken() && !id.startsWith("demo-")) await apiFetch<NotificationItem>(`/api/notifications/${id}/read`, { method: "PATCH" });
  };

  const markAllRead = async () => {
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    if (getToken()) await apiFetch<{ ok: boolean }>("/api/notifications/read-all", { method: "PATCH" });
    toast.success("All notifications marked read");
  };

  const deleteNotification = async (id: string) => {
    setNotifications((items) => items.filter((item) => item.id !== id));
    if (getToken() && !id.startsWith("demo-")) await apiFetch<{ ok: boolean }>(`/api/notifications/${id}`, { method: "DELETE" });
  };

  const broadcast = async (payload: BroadcastPayload) => {
    const body = JSON.stringify(payload);
    if (getToken() && user?.role === "admin") {
      const notification = await apiFetch<NotificationItem>("/api/notifications/broadcast", { method: "POST", body });
      insertNotification(notification, false);
      toast.success("Broadcast sent");
      return;
    }

    const notification: NotificationItem = {
      id: crypto.randomUUID(),
      title: payload.title,
      body: payload.body,
      type: payload.type ?? "announcement",
      priority: payload.priority ?? "normal",
      link: payload.link ?? "",
      roles: payload.roles ?? ["student", "mentor", "judge", "admin"],
      users: [],
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    insertNotification(notification);
  };

  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Browser notifications are not supported here");
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserEnabled(permission === "granted");
    toast[permission === "granted" ? "success" : "error"](permission === "granted" ? "Browser notifications enabled" : "Browser notifications blocked");
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("notification_sound", next ? "on" : "off");
    if (next) playNotificationSound();
  };

  return {
    user,
    notifications,
    unreadCount,
    loading,
    browserEnabled,
    soundEnabled,
    refresh,
    markRead,
    markAllRead,
    deleteNotification,
    broadcast,
    requestBrowserPermission,
    toggleSound
  };
}
