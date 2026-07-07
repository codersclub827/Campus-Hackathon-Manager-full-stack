import mongoose from "mongoose";

export const eventTypes = [
  "Hackathon Registration",
  "Team Formation",
  "Mentor Meetings",
  "Judge Evaluation",
  "Project Submission",
  "Workshops",
  "Coding Round",
  "PPT Presentation",
  "Demo Session",
  "Final Judging",
  "Winner Announcement",
  "Certificate Distribution"
] as const;

export const eventStatuses = ["Upcoming", "Ongoing", "Completed", "Cancelled"] as const;

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: { type: String, enum: eventTypes, required: true },
    status: { type: String, enum: eventStatuses, default: "Upcoming" },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    location: { type: String, default: "Campus Innovation Hub" },
    color: { type: String, default: "#4f46e5" },
    mentors: [{ type: String }],
    judges: [{ type: String }],
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    rsvps: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    cancelledAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

eventSchema.index({ startsAt: 1, endsAt: 1 });
eventSchema.index({ type: 1, status: 1 });

export const Event = mongoose.model("Event", eventSchema);
