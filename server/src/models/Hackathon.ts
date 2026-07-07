import mongoose from "mongoose";

const hackathonSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    theme: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    venue: { type: String, required: true },
    tracks: [String],
    status: { type: String, enum: ["draft", "open", "live", "completed"], default: "open" }
  },
  { timestamps: true }
);

export const Hackathon = mongoose.model("Hackathon", hackathonSchema);
