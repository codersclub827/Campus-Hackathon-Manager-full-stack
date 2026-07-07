import crypto from "crypto";
import { env } from "../config/env.js";
import { LeaderboardEntry, LeaderboardState } from "../models/LeaderboardEntry.js";

export type RubricScores = {
  innovation: number;
  technical: number;
  uiux: number;
  business: number;
  presentation: number;
  impact: number;
};

export type LeaderboardEntryRecord = {
  _id: string;
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
  status: "Waiting for Evaluation" | "Under Evaluation" | "Evaluation Completed" | "Finalized";
  activeJudge: string;
  evaluationsCompleted: number;
  evaluationsRemaining: number;
  rankHistory: Array<{ rank: number; at: Date }>;
  scoreHistory: Array<{ judge: string; delta: number; totalScore: number; at: Date }>;
};

const baseScores = (scores: Partial<RubricScores>): RubricScores => ({
  innovation: scores.innovation ?? 0,
  technical: scores.technical ?? 0,
  uiux: scores.uiux ?? 0,
  business: scores.business ?? 0,
  presentation: scores.presentation ?? 0,
  impact: scores.impact ?? 0
});

function makeEntry(input: Omit<Partial<LeaderboardEntryRecord>, "scores"> & { teamName: string; projectName: string; scores: Partial<RubricScores> }): LeaderboardEntryRecord {
  const scores = baseScores(input.scores);
  const values = Object.values(scores);
  const totalScore = values.reduce((sum, value) => sum + value, 0);
  const averageScore = Number((totalScore / values.length).toFixed(1));
  return {
    _id: input._id ?? crypto.randomUUID(),
    teamName: input.teamName,
    projectName: input.projectName,
    track: input.track ?? "Open Innovation",
    members: input.members ?? 4,
    scores,
    totalScore,
    averageScore,
    highestScore: Math.max(...values),
    currentRank: input.currentRank ?? 0,
    previousRank: input.previousRank ?? 0,
    manualRank: input.manualRank,
    status: input.status ?? "Waiting for Evaluation",
    activeJudge: input.activeJudge ?? "",
    evaluationsCompleted: input.evaluationsCompleted ?? 0,
    evaluationsRemaining: input.evaluationsRemaining ?? 3,
    rankHistory: input.rankHistory ?? [],
    scoreHistory: input.scoreHistory ?? []
  };
}

const memoryState = {
  locked: false,
  published: false,
  judgingEndsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
  announcementAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
  activity: [
    { message: "Live leaderboard initialized", tone: "green", at: new Date() },
    { message: "Judges connected to scoring room", tone: "blue", at: new Date() }
  ]
};

const memoryEntries: LeaderboardEntryRecord[] = [
  makeEntry({ teamName: "Neural Nexus", projectName: "AI Campus Safety Companion", track: "AI", scores: { innovation: 9.8, technical: 9.4, uiux: 9.1, business: 8.8, presentation: 9.6, impact: 9.7 }, status: "Evaluation Completed", evaluationsCompleted: 3, evaluationsRemaining: 0 }),
  makeEntry({ teamName: "Pixel Pioneers", projectName: "AR Lab Simulator", track: "XR", scores: { innovation: 9.1, technical: 8.8, uiux: 9.7, business: 8.4, presentation: 9.2, impact: 8.9 }, status: "Evaluation Completed", evaluationsCompleted: 3, evaluationsRemaining: 0 }),
  makeEntry({ teamName: "Data Drifters", projectName: "Scholarship Fraud Detection", track: "Data", scores: { innovation: 8.7, technical: 9.3, uiux: 8.1, business: 9, presentation: 8.6, impact: 9.4 }, status: "Under Evaluation", activeJudge: "Judge A", evaluationsCompleted: 2, evaluationsRemaining: 1 }),
  makeEntry({ teamName: "Cloud Catalysts", projectName: "Serverless Campus Ops", track: "Cloud", scores: { innovation: 8.3, technical: 8.9, uiux: 8.5, business: 8.6, presentation: 8.4, impact: 8.2 }, status: "Waiting for Evaluation", evaluationsCompleted: 1, evaluationsRemaining: 2 }),
  makeEntry({ teamName: "Green Grid", projectName: "Smart Energy Planner", track: "Sustainability", scores: { innovation: 8.5, technical: 8.1, uiux: 8.4, business: 8.2, presentation: 8, impact: 9.1 }, status: "Waiting for Evaluation", evaluationsCompleted: 1, evaluationsRemaining: 2 })
];

function pushActivity(message: string, tone: "blue" | "green" | "amber" | "rose" | "violet" = "blue") {
  memoryState.activity.unshift({ message, tone, at: new Date() });
  memoryState.activity = memoryState.activity.slice(0, 30);
}

function recalculateRanks(entries: LeaderboardEntryRecord[]) {
  const sorted = [...entries].sort((a, b) => {
    if (a.manualRank && b.manualRank) return a.manualRank - b.manualRank;
    if (a.manualRank) return -1;
    if (b.manualRank) return 1;
    return b.totalScore - a.totalScore;
  });

  sorted.forEach((entry, index) => {
    const nextRank = entry.manualRank ?? index + 1;
    if (entry.currentRank && entry.currentRank !== nextRank) entry.previousRank = entry.currentRank;
    if (!entry.previousRank) entry.previousRank = nextRank;
    entry.currentRank = nextRank;
    entry.rankHistory = [{ rank: nextRank, at: new Date() }, ...entry.rankHistory].slice(0, 20);
  });

  return sorted;
}

export function serializeLeaderboardEntry(entry: any) {
  const scores = baseScores(entry.scores ?? {});
  const values = Object.values(scores);
  return {
    id: entry._id?.toString() ?? entry.id,
    teamName: entry.teamName,
    projectName: entry.projectName,
    track: entry.track,
    members: entry.members,
    scores,
    totalScore: Number((entry.totalScore ?? values.reduce((sum, value) => sum + value, 0)).toFixed(1)),
    averageScore: Number((entry.averageScore ?? values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)),
    highestScore: Number((entry.highestScore ?? Math.max(...values)).toFixed(1)),
    currentRank: entry.currentRank,
    previousRank: entry.previousRank,
    manualRank: entry.manualRank,
    status: entry.status,
    activeJudge: entry.activeJudge,
    evaluationsCompleted: entry.evaluationsCompleted,
    evaluationsRemaining: entry.evaluationsRemaining,
    rankHistory: entry.rankHistory ?? [],
    scoreHistory: entry.scoreHistory ?? []
  };
}

export async function getLeaderboardSnapshot() {
  if (!env.mongoUri) {
    const entries = recalculateRanks(memoryEntries);
    return buildSnapshot(entries, memoryState);
  }

  const [entries, state] = await Promise.all([
    LeaderboardEntry.find().limit(100),
    LeaderboardState.findOneAndUpdate({ key: "default" }, { $setOnInsert: { key: "default" } }, { upsert: true, new: true })
  ]);
  const serialized = recalculateRanks(entries.map((entry) => serializeLeaderboardEntry(entry) as any));
  return buildSnapshot(serialized as any, state);
}

function buildSnapshot(entries: LeaderboardEntryRecord[], state: any) {
  const ranked = recalculateRanks(entries).map(serializeLeaderboardEntry);
  const scores = ranked.map((entry) => entry.totalScore);
  return {
    entries: ranked,
    state: {
      locked: Boolean(state.locked),
      published: Boolean(state.published),
      judgingEndsAt: state.judgingEndsAt,
      announcementAt: state.announcementAt,
      activity: state.activity ?? []
    },
    stats: {
      totalTeams: ranked.length,
      evaluatedTeams: ranked.filter((entry) => entry.status === "Evaluation Completed" || entry.status === "Finalized").length,
      pendingTeams: ranked.filter((entry) => entry.status !== "Evaluation Completed" && entry.status !== "Finalized").length,
      activeJudges: new Set(ranked.map((entry) => entry.activeJudge).filter(Boolean)).size,
      averageScore: Number((scores.reduce((sum, score) => sum + score, 0) / Math.max(1, scores.length)).toFixed(1)),
      highestScore: Math.max(...scores, 0),
      lowestScore: Math.min(...scores, 0)
    }
  };
}

export async function submitLeaderboardScore(payload: { teamId: string; judge: string; scores: RubricScores; editing?: boolean }) {
  if (!env.mongoUri) {
    const entry = memoryEntries.find((item) => item._id === payload.teamId || item.teamName === payload.teamId);
    if (!entry) return null;
    const beforeRank = entry.currentRank;
    const beforeScore = entry.totalScore;
    entry.scores = baseScores(payload.scores);
    const values = Object.values(entry.scores);
    entry.totalScore = Number(values.reduce((sum, value) => sum + value, 0).toFixed(1));
    entry.averageScore = Number((entry.totalScore / values.length).toFixed(1));
    entry.highestScore = Math.max(...values);
    entry.activeJudge = payload.judge;
    entry.status = payload.editing ? "Under Evaluation" : "Evaluation Completed";
    entry.evaluationsCompleted = Math.min(3, entry.evaluationsCompleted + (payload.editing ? 0 : 1));
    entry.evaluationsRemaining = Math.max(0, 3 - entry.evaluationsCompleted);
    entry.scoreHistory = [{ judge: payload.judge, delta: Number((entry.totalScore - beforeScore).toFixed(1)), totalScore: entry.totalScore, at: new Date() }, ...entry.scoreHistory].slice(0, 20);
    const ranked = recalculateRanks(memoryEntries);
    const after = ranked.find((item) => item._id === entry._id)!;
    pushActivity(`${payload.judge} scored ${entry.teamName} ${entry.totalScore.toFixed(1)}`, "blue");
    if (beforeRank && after.currentRank !== beforeRank) pushActivity(`${entry.teamName} moved to Rank #${after.currentRank}`, after.currentRank < beforeRank ? "green" : "amber");
    if (after.currentRank <= 3) pushActivity(`${entry.teamName} entered Top 3`, "violet");
    return after;
  }

  const values = Object.values(payload.scores);
  const totalScore = Number(values.reduce((sum, value) => sum + value, 0).toFixed(1));
  const averageScore = Number((totalScore / values.length).toFixed(1));
  const entry = await LeaderboardEntry.findByIdAndUpdate(
    payload.teamId,
    {
      scores: payload.scores,
      totalScore,
      averageScore,
      highestScore: Math.max(...values),
      activeJudge: payload.judge,
      status: payload.editing ? "Under Evaluation" : "Evaluation Completed",
      $inc: payload.editing ? {} : { evaluationsCompleted: 1, evaluationsRemaining: -1 },
      $push: { scoreHistory: { $each: [{ judge: payload.judge, delta: 0, totalScore, at: new Date() }], $position: 0, $slice: 20 } }
    },
    { new: true }
  );
  return entry;
}

export async function setLeaderboardState(input: Partial<{ locked: boolean; published: boolean }>) {
  if (!env.mongoUri) {
    Object.assign(memoryState, input);
    pushActivity(input.published ? "Final winner announced" : input.locked ? "Leaderboard locked" : "Leaderboard unlocked", input.published ? "green" : "amber");
    return memoryState;
  }
  return LeaderboardState.findOneAndUpdate({ key: "default" }, input, { upsert: true, new: true });
}

export async function resetLeaderboardScores() {
  if (!env.mongoUri) {
    memoryEntries.forEach((entry) => {
      entry.scores = baseScores({});
      entry.totalScore = 0;
      entry.averageScore = 0;
      entry.highestScore = 0;
      entry.status = "Waiting for Evaluation";
      entry.activeJudge = "";
      entry.evaluationsCompleted = 0;
      entry.evaluationsRemaining = 3;
      entry.previousRank = entry.currentRank;
    });
    pushActivity("Scores reset by admin", "rose");
    return getLeaderboardSnapshot();
  }
  await LeaderboardEntry.updateMany({}, { scores: {}, totalScore: 0, averageScore: 0, highestScore: 0, status: "Waiting for Evaluation", activeJudge: "", evaluationsCompleted: 0, evaluationsRemaining: 3 });
  return getLeaderboardSnapshot();
}

export async function overrideRank(teamId: string, rank: number) {
  if (!env.mongoUri) {
    const entry = memoryEntries.find((item) => item._id === teamId || item.teamName === teamId);
    if (!entry) return null;
    entry.manualRank = rank;
    pushActivity(`${entry.teamName} manually set to Rank #${rank}`, "amber");
    recalculateRanks(memoryEntries);
    return entry;
  }
  return LeaderboardEntry.findByIdAndUpdate(teamId, { manualRank: rank }, { new: true });
}
