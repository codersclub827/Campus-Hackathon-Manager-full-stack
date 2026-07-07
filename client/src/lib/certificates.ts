import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch, getToken } from "./auth";
import { getSocket } from "./live";

export type CertificateCategory = "Winner" | "Runner-up" | "Participant" | "Mentor" | "Judge" | "Organizer";
export type EmailStatus = "Not Sent" | "Sending" | "Sent" | "Failed";

export type CertificateItem = {
  id: string;
  recipientName: string;
  recipientEmail: string;
  teamName: string;
  eventName: string;
  award: string;
  category: CertificateCategory;
  status: "pending" | "generated";
  emailStatus: EmailStatus;
  certificateId: string;
  issuedAt: string;
  generatedAt: string;
  downloadedAt?: string;
  downloadCount: number;
  verifiedAt?: string;
  verifiedCount: number;
  qrPayload: string;
  verificationUrl: string;
  signatureHash: string;
  history: Array<{ action: string; at: string; detail?: string }>;
};

export type CertificateStats = {
  total: number;
  generated: number;
  pending: number;
  downloaded: number;
  verified: number;
  emailed: number;
  chart: Array<{ name: string; generated: number; downloads: number }>;
};

const now = new Date().toISOString();
const demoCertificates: CertificateItem[] = [
  {
    id: "demo-cert-1",
    recipientName: "Ananya Sharma",
    recipientEmail: "ananya@campus.edu",
    teamName: "Neural Nexus",
    eventName: "Campus Hackathon 2026",
    award: "Grand Winner",
    category: "Winner",
    status: "generated",
    emailStatus: "Sent",
    certificateId: "CHM-2026-A17F42",
    issuedAt: now,
    generatedAt: now,
    downloadedAt: now,
    downloadCount: 4,
    verifiedAt: now,
    verifiedCount: 2,
    qrPayload: "CERT:CHM-2026-A17F42:demo",
    verificationUrl: "/verify-certificate/CHM-2026-A17F42",
    signatureHash: "demo-signature",
    history: [{ action: "Generated", at: now, detail: "Created after finalized results." }, { action: "Downloaded", at: now, detail: "PDF downloaded." }]
  },
  {
    id: "demo-cert-2",
    recipientName: "Mehak Jain",
    recipientEmail: "mehak@campus.edu",
    teamName: "Pixel Pioneers",
    eventName: "Campus Hackathon 2026",
    award: "Runner-up",
    category: "Runner-up",
    status: "generated",
    emailStatus: "Not Sent",
    certificateId: "CHM-2026-B90C11",
    issuedAt: now,
    generatedAt: now,
    downloadCount: 1,
    verifiedCount: 0,
    qrPayload: "CERT:CHM-2026-B90C11:demo",
    verificationUrl: "/verify-certificate/CHM-2026-B90C11",
    signatureHash: "demo-signature",
    history: [{ action: "Generated", at: now, detail: "Runner-up certificate generated." }]
  }
];

function demoStats(certificates: CertificateItem[]): CertificateStats {
  return {
    total: certificates.length,
    generated: certificates.filter((item) => item.status === "generated").length,
    pending: 18,
    downloaded: certificates.filter((item) => item.downloadCount > 0).length,
    verified: certificates.filter((item) => item.verifiedCount > 0).length,
    emailed: certificates.filter((item) => item.emailStatus === "Sent").length,
    chart: [
      { name: "Mon", generated: 18, downloads: 10 },
      { name: "Tue", generated: 34, downloads: 24 },
      { name: "Wed", generated: 49, downloads: 38 },
      { name: "Thu", generated: 72, downloads: 61 },
      { name: "Fri", generated: 96, downloads: 83 }
    ]
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

export function useCertificates() {
  const [certificates, setCertificates] = useState<CertificateItem[]>(demoCertificates);
  const [stats, setStats] = useState<CertificateStats>(demoStats(demoCertificates));
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(demoCertificates.length);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CertificateCategory | "All">("All");
  const [sort, setSort] = useState<"newest" | "name">("newest");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!getToken()) {
        const filtered = demoCertificates.filter((certificate) =>
          [certificate.recipientName, certificate.teamName, certificate.eventName, certificate.certificateId].join(" ").toLowerCase().includes(search.toLowerCase())
        ).filter((certificate) => category === "All" || certificate.category === category);
        setCertificates(filtered);
        setStats(demoStats(demoCertificates));
        setTotal(filtered.length);
        return;
      }
      const params = new URLSearchParams({ page: String(page), limit: "8", search, category, sort });
      const [list, dashboard] = await Promise.all([
        apiFetch<{ rows: CertificateItem[]; total: number }>(`/api/certificates?${params}`),
        apiFetch<CertificateStats>("/api/certificates/dashboard")
      ]);
      setCertificates(list.rows);
      setTotal(list.total);
      setStats(dashboard);
    } catch (error) {
      toast.error("Could not load certificates", { description: error instanceof Error ? error.message : "Using local preview data." });
    } finally {
      setLoading(false);
    }
  }, [category, page, search, sort]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = getSocket();
    const onGenerated = (certificate: CertificateItem) => {
      setCertificates((items) => [certificate, ...items.filter((item) => item.id !== certificate.id)]);
      setStats((current) => ({ ...current, total: current.total + 1, generated: current.generated + 1, pending: Math.max(0, current.pending - 1) }));
      toast.success("Certificate generated", { description: `${certificate.recipientName} is ready.` });
    };
    const onProgress = ({ progress: nextProgress }: { progress: number }) => setProgress(nextProgress);
    const onEmail = ({ id, emailStatus }: { id: string; emailStatus: EmailStatus }) => {
      setCertificates((items) => items.map((item) => (item.id === id ? { ...item, emailStatus } : item)));
      if (emailStatus === "Sent") toast.success("Certificate email sent");
      if (emailStatus === "Failed") toast.error("Certificate email failed");
    };
    const onDownloaded = (certificate: CertificateItem) => {
      setCertificates((items) => items.map((item) => (item.id === certificate.id ? certificate : item)));
    };

    socket.on("certificate:generated", onGenerated);
    socket.on("certificate:progress", onProgress);
    socket.on("certificate:email-status", onEmail);
    socket.on("certificate:downloaded", onDownloaded);
    if (!socket.connected) socket.connect();

    return () => {
      socket.off("certificate:generated", onGenerated);
      socket.off("certificate:progress", onProgress);
      socket.off("certificate:email-status", onEmail);
      socket.off("certificate:downloaded", onDownloaded);
    };
  }, []);

  const selected = useMemo(() => certificates[0] ?? demoCertificates[0], [certificates]);

  const generateIndividual = async () => {
    const payload = {
      recipientName: "Live Participant",
      recipientEmail: "participant@campus.edu",
      teamName: "Campus Builders",
      eventName: "Campus Hackathon 2026",
      award: "Participation Certificate",
      category: "Participant"
    };
    if (!getToken()) {
      const certificate = { ...demoCertificates[0], ...payload, id: crypto.randomUUID(), certificateId: `CHM-2026-${Math.random().toString(16).slice(2, 8).toUpperCase()}`, generatedAt: new Date().toISOString() } as CertificateItem;
      setCertificates((items) => [certificate, ...items]);
      toast.success("Demo certificate generated");
      return;
    }
    await apiFetch<CertificateItem>("/api/certificates/generate", { method: "POST", body: JSON.stringify(payload) });
  };

  const generateBatch = async () => {
    setProgress(0);
    if (!getToken()) {
      [20, 40, 65, 82, 100].forEach((value, index) => window.setTimeout(() => setProgress(value), index * 260));
      window.setTimeout(() => toast.success("Demo batch certificates generated"), 1400);
      return;
    }
    await apiFetch<{ total: number }>("/api/certificates/batch", { method: "POST", body: JSON.stringify({ finalized: true, eventName: "Campus Hackathon 2026" }) });
  };

  const emailCertificate = async (certificate: CertificateItem) => {
    setCertificates((items) => items.map((item) => (item.id === certificate.id ? { ...item, emailStatus: "Sending" } : item)));
    if (!getToken() || certificate.id.startsWith("demo")) {
      window.setTimeout(() => {
        setCertificates((items) => items.map((item) => (item.id === certificate.id ? { ...item, emailStatus: "Sent" } : item)));
        toast.success("Demo email sent");
      }, 800);
      return;
    }
    await apiFetch<CertificateItem>(`/api/certificates/${certificate.id}/email`, { method: "POST" });
  };

  const downloadPdf = async (certificate: CertificateItem) => {
    if (!getToken() || certificate.id.startsWith("demo")) {
      downloadBlob(new Blob([`Certificate ${certificate.certificateId} for ${certificate.recipientName}`], { type: "application/pdf" }), `${certificate.certificateId}.pdf`);
      return;
    }
    const response = await fetch(`/api/certificates/${certificate.id}/pdf`, { headers: { Authorization: `Bearer ${getToken()}` } });
    downloadBlob(await response.blob(), `${certificate.certificateId}.pdf`);
  };

  const downloadZip = async () => {
    if (!getToken()) {
      downloadBlob(new Blob(["Demo certificate archive"], { type: "application/zip" }), "campus-certificates.zip");
      return;
    }
    const response = await fetch("/api/certificates/download/all.zip", { headers: { Authorization: `Bearer ${getToken()}` } });
    downloadBlob(await response.blob(), "campus-certificates.zip");
  };

  return {
    certificates,
    selected,
    stats,
    loading,
    progress,
    page,
    total,
    search,
    category,
    sort,
    setPage,
    setSearch,
    setCategory,
    setSort,
    refresh,
    generateIndividual,
    generateBatch,
    emailCertificate,
    downloadPdf,
    downloadZip
  };
}
