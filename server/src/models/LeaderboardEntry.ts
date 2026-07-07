import mongoose from "mongoose";

export const leaderboardStatuses = ["Waiting for Evaluation", "Under Evaluation", "Evaluation Completed", "Finalized"] as const;

const scoreSchema = new mongoose.Schema(
  {
    innovation: { type: Number, min: 0, max: 10, default: 0 },
    technical: { type: Number, min: 0, max: 10, default: 0 },
    uiux: { type: Number, min: 0, max: 10, default: 0 },
    business: { type: Number, min: 0, max: 10, default: 0 },
    presentation: { type: Number, min: 0, max: 10, default: 0 },
    impact: { type: Number, min: 0, max: 10, default: 0 }
  },
  { _id: false }
);

const leaderboardEntrySchema = new mongoose.Schema(
  {
    teamName: { type: String, required: true, trim: true },
    projectName: { type: String, required: true, trim: true },
    track: { type: String, default: "Open Innovation" },
    members: { type: Number, default: 4 },
    scores: { type: scoreSchema, default: () => ({}) },
    totalScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    currentRank: { type: Number, default: 0 },
    previousRank: { type: Number, default: 0 },
    manualRank: Number,
    status: { type: String, enum: leaderboardStatuses, default: "Waiting for Evaluation" },
    activeJudge: { type: String, default: "" },
    evaluationsCompleted: { type: Number, default: 0 },
    evaluationsRemaining: { type: Number, default: 3 },
    rankHistory: [{ rank: Number, at: { type: Date, default: Date.now } }],
    scoreHistory: [{ judge: String, delta: Number, totalScore: Number, at: { type: Date, default: Date.now } }]
  },
  { timestamps: true }
);

leaderboardEntrySchema.index({ totalScore: -1, currentRank: 1 });
leaderboardEntrySchema.index({ teamName: 1 });

export const LeaderboardEntry = mongoose.model("LeaderboardEntry", leaderboardEntrySchema);

const leaderboardStateSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "default" },
    locked: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
    judgingEndsAt: { type: Date, default: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
    announcementAt: { type: Date, default: () => new Date(Date.now() + 3 * 60 * 60 * 1000) },
    activity: [
      {
        message: String,
        tone: { type: String, enum: ["blue", "green", "amber", "rose", "violet"], default: "blue" },
        at: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

export const LeaderboardState = mongoose.model("LeaderboardState", leaderboardStateSchema);
