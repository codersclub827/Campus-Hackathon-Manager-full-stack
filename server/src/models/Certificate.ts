import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    recipientName: { type: String, required: true },
    recipientEmail: { type: String, required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    teamName: { type: String, default: "" },
    eventName: { type: String, default: "Campus Hackathon 2026" },
    award: { type: String, required: true },
    category: {
      type: String,
      enum: ["Winner", "Runner-up", "Participant", "Mentor", "Judge", "Organizer"],
      default: "Participant"
    },
    status: { type: String, enum: ["pending", "generated"], default: "generated" },
    emailStatus: { type: String, enum: ["Not Sent", "Sending", "Sent", "Failed"], default: "Not Sent" },
    certificateId: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },
    generatedAt: { type: Date, default: Date.now },
    downloadedAt: Date,
    downloadCount: { type: Number, default: 0 },
    verifiedAt: Date,
    verifiedCount: { type: Number, default: 0 },
    pdfUrl: String,
    qrPayload: { type: String, required: true },
    verificationUrl: { type: String, required: true },
    signatureHash: { type: String, required: true },
    history: [
      {
        action: { type: String, required: true },
        at: { type: Date, default: Date.now },
        detail: String
      }
    ]
  },
  { timestamps: true }
);

export const Certificate = mongoose.model("Certificate", certificateSchema);
