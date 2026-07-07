import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { apiFetch, apiUrl, getToken } from "./auth";
import { getSocket } from "./live";

export type AttendanceRole = "Student" | "Mentor" | "Judge" | "Admin";
export type AttendanceStatus = "Present" | "Late" | "Absent";

export type AttendanceRecord = {
  id: string;
  eventName: string;
  qrCode: string;
  name: string;
  team: string;
  role: AttendanceRole;
  department: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  method: "qr" | "manual";
  status: AttendanceStatus;
  syncStatus: "synced" | "offline";
  history: Array<{ action: string; at: string; detail?: string }>;
};

export type AttendanceStats = {
  totalRegistered: number;
  present: number;
  absent: number;
  late: number;
  checkedOut: number;
  attendancePercentage: number;
  liveActiveParticipants: number;
  chart: Array<{ name: string; present: number; late: number }>;
};

const demoRows: AttendanceRecord[] = [
  { id: "att-1", eventName: "Campus Hackathon 2026", qrCode: "CHM:Ananya-Sharma:Neural-Nexus:Student:CSE", name: "Ananya Sharma", team: "Neural Nexus", role: "Student", department: "CSE", checkedInAt: new Date().toISOString(), method: "qr", status: "Present", syncStatus: "synced", history: [] },
  { id: "att-2", eventName: "Campus Hackathon 2026", qrCode: "CHM:Dr-Asha-Rao:Mentor-Guild:Mentor:AI-Lab", name: "Dr. Asha Rao", team: "Mentor Guild", role: "Mentor", department: "AI Lab", checkedInAt: new Date().toISOString(), method: "qr", status: "Present", syncStatus: "synced", history: [] },
  { id: "att-3", eventName: "Campus Hackathon 2026", qrCode: "CHM:Kabir-Mehta:Judging-Panel:Judge:Innovation", name: "Kabir Mehta", team: "Judging Panel", role: "Judge", department: "Innovation", checkedInAt: new Date(Date.now() - 30 * 60_000).toISOString(), checkedOutAt: new Date().toISOString(), method: "manual", status: "Late", syncStatus: "synced", history: [] }
];

const offlineKey = "offline_attendance_scans";

function makeStats(rows: AttendanceRecord[]): AttendanceStats {
  const present = rows.filter((row) => row.checkedInAt && !row.checkedOutAt).length;
  const checkedOut = rows.filter((row) => row.checkedOutAt).length;
  const late = rows.filter((row) => row.status === "Late").length;
  const totalRegistered = Math.max(1284, rows.length);
  return {
    totalRegistered,
    present,
    absent: Math.max(0, totalRegistered - present - checkedOut),
    late,
    checkedOut,
    attendancePercentage: Number(((present / totalRegistered) * 100).toFixed(1)),
    liveActiveParticipants: present,
    chart: [
      { name: "09:00", present: Math.max(0, present - 10), late: Math.max(0, late - 2) },
      { name: "10:00", present: Math.max(0, present - 4), late },
      { name: "Now", present, late }
    ]
  };
}

function parseLocalQr(raw: string): AttendanceRecord | null {
  if (!raw.trim() || raw.toLowerCase().includes("invalid")) return null;
  const parts = raw.split(":");
  if (parts.length < 3 || parts[0] !== "CHM") return null;
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    eventName: "Campus Hackathon 2026",
    qrCode: raw,
    name: parts[1].replace(/-/g, " "),
    team: parts[2] ?? "",
    role: (parts[3] as AttendanceRole) || "Student",
    department: parts[4] ?? "CSE",
    checkedInAt: now,
    method: "qr",
    status: new Date().getHours() >= 10 ? "Late" : "Present",
    syncStatus: navigator.onLine ? "synced" : "offline",
    history: [{ action: "Checked In", at: now, detail: "Local QR scan." }]
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

export function useQRAttendance() {
  const [rows, setRows] = useState<AttendanceRecord[]>(demoRows);
  const [stats, setStats] = useState<AttendanceStats>(makeStats(demoRows));
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<AttendanceRole | "All">("All");
  const [department, setDepartment] = useState("");
  const [team, setTeam] = useState("");
  const [dark, setDark] = useState(false);
  const [scannerState, setScannerState] = useState<"idle" | "scanning" | "success" | "error" | "duplicate">("idle");
  const [lastScanned, setLastScanned] = useState<AttendanceRecord | null>(rows[0]);
  const [offlineCount, setOfflineCount] = useState(() => JSON.parse(localStorage.getItem(offlineKey) ?? "[]").length as number);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!getToken()) {
        setStats(makeStats(rows));
        return;
      }
      const params = new URLSearchParams({ search, role, department, team });
      const [list, nextStats] = await Promise.all([
        apiFetch<AttendanceRecord[]>(`/api/attendance?${params}`),
        apiFetch<AttendanceStats>("/api/attendance/stats")
      ]);
      setRows(list);
      setStats(nextStats);
    } catch (error) {
      toast.error("Could not load attendance", { description: error instanceof Error ? error.message : "Using local attendance data." });
    } finally {
      setLoading(false);
    }
  }, [department, role, search, team]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = getSocket();
    const upsert = (record: AttendanceRecord) => {
      setRows((items) => [record, ...items.filter((item) => item.id !== record.id && item.qrCode !== record.qrCode)]);
      setLastScanned(record);
      setScannerState("success");
    };
    const checkout = (record: AttendanceRecord) => setRows((items) => items.map((item) => item.id === record.id ? record : item));
    socket.on("attendance:checked-in", upsert);
    socket.on("attendance:checked-out", checkout);
    socket.on("attendance:duplicate", (record: AttendanceRecord) => {
      setLastScanned(record);
      setScannerState("duplicate");
      toast.error("Duplicate QR detected", { description: record.name });
    });
    socket.on("attendance:invalid", () => {
      setScannerState("error");
      toast.error("Invalid QR");
    });
    socket.on("attendance:stats", setStats);
    if (!socket.connected) socket.connect();
    return () => {
      socket.off("attendance:checked-in", upsert);
      socket.off("attendance:checked-out", checkout);
      socket.off("attendance:duplicate");
      socket.off("attendance:invalid");
      socket.off("attendance:stats");
    };
  }, []);

  const scanRaw = async (raw: string) => {
    setScannerState("scanning");
    const local = parseLocalQr(raw);
    if (!local) {
      setScannerState("error");
      toast.error("Invalid QR");
      return;
    }

    if (!navigator.onLine) {
      const queued = JSON.parse(localStorage.getItem(offlineKey) ?? "[]");
      localStorage.setItem(offlineKey, JSON.stringify([raw, ...queued]));
      setOfflineCount(queued.length + 1);
      setRows((items) => [local, ...items]);
      setLastScanned(local);
      toast("Offline scan queued", { description: local.name });
      return;
    }

    if (!getToken()) {
      const duplicate = rows.some((row) => row.qrCode === raw && row.checkedInAt && !row.checkedOutAt);
      if (duplicate) {
        setScannerState("duplicate");
        toast.error("Duplicate QR detected");
        return;
      }
      setRows((items) => [local, ...items]);
      setLastScanned(local);
      setScannerState("success");
      toast.success("Check-in verified", { description: local.name });
      return;
    }

    try {
      const record = await apiFetch<AttendanceRecord>("/api/attendance/scan", { method: "POST", body: JSON.stringify({ raw }) });
      setRows((items) => [record, ...items.filter((item) => item.id !== record.id && item.qrCode !== record.qrCode)]);
      setLastScanned(record);
      setScannerState("success");
      toast.success(record.status === "Late" ? "Late arrival alert" : "Check-in successful", { description: record.name });
    } catch (error) {
      setScannerState(error instanceof Error && error.message.includes("Duplicate") ? "duplicate" : "error");
      toast.error(error instanceof Error ? error.message : "Scan failed");
    }
  };

  const startCamera = async () => {
    setScannerState("scanning");
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    streamRef.current = stream;
    if (videoRef.current) videoRef.current.srcObject = stream;
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setScannerState("idle");
  };

  const detectFromCamera = async () => {
    const BarcodeDetectorClass = (window as Window & { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
    if (!BarcodeDetectorClass || !videoRef.current) {
      await scanRaw("CHM:Live-Participant:Campus-Builders:Student:CSE");
      return;
    }
    const detector = new BarcodeDetectorClass({ formats: ["qr_code"] });
    const codes = await detector.detect(videoRef.current);
    if (!codes[0]) {
      setScannerState("error");
      toast.error("No QR found in camera frame");
      return;
    }
    await scanRaw(codes[0].rawValue);
  };

  const manualAttendance = async (payload: { name: string; team: string; role: AttendanceRole; department: string }) => {
    const qrCode = `MANUAL:${payload.name.replace(/\s/g, "-")}:${payload.team}:${payload.role}:${payload.department}`;
    if (!getToken()) {
      await scanRaw(`CHM:${payload.name.replace(/\s/g, "-")}:${payload.team}:${payload.role}:${payload.department}`);
      return;
    }
    const record = await apiFetch<AttendanceRecord>("/api/attendance/manual", { method: "POST", body: JSON.stringify({ ...payload, qrCode }) });
    setRows((items) => [record, ...items]);
    toast.success("Manual attendance added", { description: record.name });
  };

  const checkout = async (record: AttendanceRecord) => {
    if (!getToken()) {
      const updated = { ...record, checkedOutAt: new Date().toISOString() };
      setRows((items) => items.map((item) => item.id === record.id ? updated : item));
      toast.success("Check-out completed", { description: record.name });
      return;
    }
    const updated = await apiFetch<AttendanceRecord>(`/api/attendance/${record.id}/checkout`, { method: "POST" });
    setRows((items) => items.map((item) => item.id === updated.id ? updated : item));
  };

  const syncOffline = async () => {
    const queued: string[] = JSON.parse(localStorage.getItem(offlineKey) ?? "[]");
    for (const raw of queued) await scanRaw(raw);
    localStorage.setItem(offlineKey, "[]");
    setOfflineCount(0);
    toast.success("Offline scans synced");
  };

  const exportCsv = async () => {
    if (!getToken()) {
      const csv = ["Name,Team,Role,Department,Check-in,Check-out,Status", ...rows.map((row) => [row.name, row.team, row.role, row.department, row.checkedInAt ?? "", row.checkedOutAt ?? "", row.status].join(","))].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv" }), "attendance.csv");
      return;
    }
    const response = await fetch(apiUrl("/api/attendance/export.csv"), { headers: { Authorization: `Bearer ${getToken()}` } });
    downloadBlob(await response.blob(), "attendance.csv");
  };

  const filteredRows = useMemo(() => rows
    .filter((row) => role === "All" || row.role === role)
    .filter((row) => !department || row.department.toLowerCase().includes(department.toLowerCase()))
    .filter((row) => !team || row.team.toLowerCase().includes(team.toLowerCase()))
    .filter((row) => !search || [row.name, row.team, row.role, row.department, row.qrCode].join(" ").toLowerCase().includes(search.toLowerCase())), [department, role, rows, search, team]);

  useEffect(() => {
    setStats(makeStats(rows));
  }, [rows]);

  return {
    rows: filteredRows,
    stats,
    loading,
    search,
    role,
    department,
    team,
    dark,
    scannerState,
    lastScanned,
    offlineCount,
    videoRef,
    setSearch,
    setRole,
    setDepartment,
    setTeam,
    setDark,
    refresh,
    scanRaw,
    startCamera,
    stopCamera,
    detectFromCamera,
    manualAttendance,
    checkout,
    syncOffline,
    exportCsv
  };
}
