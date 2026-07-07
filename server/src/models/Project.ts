import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    description: { type: String, required: true },
    githubUrl: { type: String, required: true },
    demoVideoUrl: { type: String, required: true },
    deploymentUrl: String,
    assets: [String],
    status: { type: String, enum: ["draft", "submitted", "reviewed"], default: "draft" },
    submittedAt: Date
  },
  { timestamps: true }
);

export const Project = mongoose.model("Project", projectSchema);
