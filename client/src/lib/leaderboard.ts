import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch, apiUrl, getToken } from "./auth";
import { getSocket } from "./live";

export type RubricScores = {
  innovation: number;
  technical: number;
  uiux: number;
  business: number;
  presentation: number;
  impact: number;
};

export type LeaderboardTeamStatus = "Waiting for Evaluation" | "Under Evaluation" | "Evaluation Completed" | "Finalized";

export type LeaderboardTeam = {
  id: string;
  teamName: string;
  projectName: string;
  track: string;
  members: number;
  scores: RubricScores;
  totalScore: number;
  averageScore: number;
  highestScore: number;
  currentRank: number;
  previousRank: number;
  manualRank?: number;
  status: LeaderboardTeamStatus;
  activeJudge: string;
  evaluationsCompleted: number;
  evaluationsRemaining: number;
  rankHistory: Array<{ rank: number; at: string }>;
  scoreHistory: Array<{ judge: string; delta: number; totalScore: number; at: string }>;
};

export type LeaderboardSnapshot = {
  entries: LeaderboardTeam[];
  state: {
    locked: boolean;
    published: boolean;
    judgingEndsAt: string;
    announcementAt: string;
    activity: Array<{ message: string; tone: "blue" | "green" | "amber" | "rose" | "violet"; at: string }>;
  };
  stats: {
    totalTeams: number;
    evaluatedTeams: number;
    pendingTeams: number;
    activeJudges: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  };
};

const demoTeams: LeaderboardTeam[] = [
  makeTeam("1", "Neural Nexus", "AI Campus Safety Companion", "AI", { innovation: 9.8, technical: 9.4, uiux: 9.1, business: 8.8, presentation: 9.6, impact: 9.7 }, 1, 2, "Evaluation Completed"),
  makeTeam("2", "Pixel Pioneers", "AR Lab Simulator", "XR", { innovation: 9.1, technical: 8.8, uiux: 9.7, business: 8.4, presentation: 9.2, impact: 8.9 }, 2, 1, "Evaluation Completed"),
  makeTeam("3", "Data Drifters", "Scholarship Fraud Detection", "Data", { innovation: 8.7, technical: 9.3, uiux: 8.1, business: 9, presentation: 8.6, impact: 9.4 }, 3, 4, "Under Evaluation"),
  makeTeam("4", "Cloud Catalysts", "Serverless Campus Ops", "Cloud", { innovation: 8.3, technical: 8.9, uiux: 8.5, business: 8.6, presentation: 8.4, impact: 8.2 }, 4, 3, "Waiting for Evaluation"),
  makeTeam("5", "Green Grid", "Smart Energy Planner", "Sustainability", { innovation: 8.5, technical: 8.1, uiux: 8.4, business: 8.2, presentation: 8, impact: 9.1 }, 5, 5, "Waiting for Evaluation")
];

function makeTeam(id: string, teamName: string, projectName: string, track: string, scores: RubricScores, currentRank: number, previousRank: number, status: LeaderboardTeamStatus): LeaderboardTeam {
  const values = Object.values(scores);
  const totalScore = Number(values.reduce((sum, value) => sum + value, 0).toFixed(1));
  return {
    id,
    teamName,
    projectName,
    track,
    members: 4,
    scores,
    totalScore,
    averageScore: Number((totalScore / values.length).toFixed(1)),
    highestScore: Math.max(...values),
    currentRank,
    previousRank,
    status,
    activeJudge: status === "Under Evaluation" ? "Judge A" : "",
    evaluationsCompleted: status === "Evaluation Completed" ? 3 : status === "Under Evaluation" ? 2 : 1,
    evaluationsRemaining: status === "Evaluation Completed" ? 0 : status === "Under Evaluation" ? 1 : 2,
    rankHistory: [{ rank: currentRank, at: new Date().toISOString() }, { rank: previousRank, at: new Date(Date.now() - 900_000).toISOString() }],
    scoreHistory: [{ judge: "Judge A", delta: 8, totalScore, at: new Date().toISOString() }]
  };
}

function makeSnapshot(entries = demoTeams, state?: Partial<LeaderboardSnapshot["state"]>): LeaderboardSnapshot {
  const sorted = [...entries].sort((a, b) => a.currentRank - b.currentRank);
  const scores = sorted.map((entry) => entry.totalScore);
  return {
    entries: sorted,
    state: {
      locked: false,
      published: false,
      judgingEndsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      announcementAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      activity: [
        { message: "Live leaderboard initialized", tone: "green", at: new Date().toISOString() },
        { message: "Judge A scored Neural Nexus +8", tone: "blue", at: new Date().toISOString() }
      ],
      ...state
    },
    stats: {
      totalTeams: sorted.length,
      evaluatedTeams: sorted.filter((entry) => entry.status === "Evaluation Completed" || entry.status === "Finalized").length,
      pendingTeams: sorted.filter((entry) => entry.status !== "Evaluation Completed" && entry.status !== "Finalized").length,
      activeJudges: new Set(sorted.map((entry) => entry.activeJudge).filter(Boolean)).size,
      averageScore: Number((scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length)).toFixed(1)),
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores)
    }
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

export function useLiveLeaderboard() {
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot>(makeSnapshot());
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState(demoTeams[0].id);
  const [dark, setDark] = useState(false);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (!getToken()) {
        setSnapshot(makeSnapshot());
        return;
      }
      setSnapshot(await apiFetch<LeaderboardSnapshot>("/api/leaderboard"));
    } catch (error) {
      toast.error("Could not load leaderboard", { description: error instanceof Error ? error.message : "Using live preview data." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const socket = getSocket();
    const onSnapshot = (next: LeaderboardSnapshot) => setSnapshot(next);
    const onScore = (team: LeaderboardTeam) => toast.success("New score submitted", { description: `${team.teamName} is now Rank #${team.currentRank}` });
    const onWinner = () => toast.success("Final winners announced");
    socket.on("leaderboard:snapshot", onSnapshot);
    socket.on("leaderboard:score-submitted", onScore);
    socket.on("leaderboard:winner-announced", onWinner);
    if (!socket.connected) socket.connect();
    return () => {
      socket.off("leaderboard:snapshot", onSnapshot);
      socket.off("leaderboard:score-submitted", onScore);
      socket.off("leaderboard:winner-announced", onWinner);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedTeam = useMemo(() => snapshot.entries.find((entry) => entry.id === selectedTeamId) ?? snapshot.entries[0], [selectedTeamId, snapshot.entries]);
  const podium = snapshot.entries.slice(0, 3);

  const submitScore = async (teamId: string, scores: RubricScores, editing = false) => {
    if (!getToken() || teamId.length < 8) {
      setSnapshot((current) => {
        const updated = current.entries.map((entry) => {
          if (entry.id !== teamId) return entry;
          const values = Object.values(scores);
          const totalScore = Number(values.reduce((sum, value) => sum + value, 0).toFixed(1));
          return {
            ...entry,
            scores,
            totalScore,
            averageScore: Number((totalScore / values.length).toFixed(1)),
            highestScore: Math.max(...values),
            status: editing ? "Under Evaluation" : "Evaluation Completed" as LeaderboardTeamStatus,
            activeJudge: "Judge Live",
            scoreHistory: [{ judge: "Judge Live", delta: 7, totalScore, at: new Date().toISOString() }, ...entry.scoreHistory]
          };
        }).sort((a, b) => b.totalScore - a.totalScore).map((entry, index) => ({ ...entry, previousRank: entry.currentRank, currentRank: index + 1 }));
        toast.success("Live score submitted");
        return makeSnapshot(updated, current.state);
      });
      return;
    }
    await apiFetch<LeaderboardSnapshot>("/api/leaderboard/scores", { method: "POST", body: JSON.stringify({ teamId, judge: "Judge Live", scores, editing }) });
  };

  const setLocked = async (locked: boolean) => {
    if (!getToken()) {
      setSnapshot((current) => makeSnapshot(current.entries, { ...current.state, locked }));
      toast.success(locked ? "Leaderboard locked" : "Leaderboard unlocked");
      return;
    }
    setSnapshot(await apiFetch<LeaderboardSnapshot>("/api/leaderboard/state", { method: "PATCH", body: JSON.stringify({ locked }) }));
  };

  const publish = async () => {
    if (!getToken()) {
      setSnapshot((current) => makeSnapshot(current.entries.map((entry) => ({ ...entry, status: "Finalized" as LeaderboardTeamStatus })), { ...current.state, published: true }));
      toast.success("Final winners announced");
      return;
    }
    setSnapshot(await apiFetch<LeaderboardSnapshot>("/api/leaderboard/state", { method: "PATCH", body: JSON.stringify({ published: true }) }));
  };

  const reset = async () => {
    if (!getToken()) {
      setSnapshot(makeSnapshot(demoTeams.map((team) => ({ ...team, scores: { innovation: 0, technical: 0, uiux: 0, business: 0, presentation: 0, impact: 0 }, totalScore: 0, averageScore: 0, highestScore: 0, status: "Waiting for Evaluation" as LeaderboardTeamStatus }))));
      toast.error("Scores reset");
      return;
    }
    setSnapshot(await apiFetch<LeaderboardSnapshot>("/api/leaderboard/reset", { method: "POST" }));
  };

  const overrideRank = async (teamId: string, rank: number) => {
    if (!getToken() || teamId.length < 8) {
      setSnapshot((current) => makeSnapshot(current.entries.map((entry) => entry.id === teamId ? { ...entry, manualRank: rank, previousRank: entry.currentRank, currentRank: rank } : entry), current.state));
      toast.success("Manual rank override saved");
      return;
    }
    setSnapshot(await apiFetch<LeaderboardSnapshot>(`/api/leaderboard/${teamId}/rank`, { method: "PATCH", body: JSON.stringify({ rank }) }));
  };

  const exportResults = async () => {
    if (!getToken()) {
      const csv = ["Rank,Team,Score", ...snapshot.entries.map((entry) => `${entry.currentRank},${entry.teamName},${entry.totalScore}`)].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv" }), "leaderboard-results.csv");
      return;
    }
    const response = await fetch(apiUrl("/api/leaderboard/export.csv"), { headers: { Authorization: `Bearer ${getToken()}` } });
    downloadBlob(await response.blob(), "leaderboard-results.csv");
  };

  return {
    snapshot,
    entries: snapshot.entries,
    stats: snapshot.stats,
    state: snapshot.state,
    selectedTeam,
    podium,
    loading,
    dark,
    now,
    setDark,
    setSelectedTeamId,
    refresh,
    submitScore,
    setLocked,
    publish,
    reset,
    overrideRank,
    exportResults
  };
}

export function countdown(target: string, now: number) {
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return "00:00:00";
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}
