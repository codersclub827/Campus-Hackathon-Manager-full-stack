import mongoose from "mongoose";

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    hackathon: { type: mongoose.Schema.Types.ObjectId, ref: "Hackathon" },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inviteCode: { type: String, required: true },
    progress: { type: Number, min: 0, max: 100, default: 0 }
  },
  { timestamps: true }
);

export const Team = mongoose.model("Team", teamSchema);
