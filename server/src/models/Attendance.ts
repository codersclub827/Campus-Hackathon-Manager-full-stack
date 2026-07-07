import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    hackathon: { type: mongoose.Schema.Types.ObjectId, ref: "Hackathon" },
    eventName: { type: String, default: "Campus Hackathon 2026" },
    qrCode: { type: String, required: true },
    name: { type: String, required: true },
    team: { type: String, default: "" },
    role: { type: String, enum: ["Student", "Mentor", "Judge", "Admin"], default: "Student" },
    department: { type: String, default: "" },
    checkedInAt: Date,
    checkedOutAt: Date,
    method: { type: String, enum: ["qr", "manual"], default: "qr" },
    status: { type: String, enum: ["Present", "Late", "Absent"], default: "Absent" },
    syncStatus: { type: String, enum: ["synced", "offline"], default: "synced" },
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

attendanceSchema.index({ qrCode: 1, eventName: 1 }, { unique: true });
attendanceSchema.index({ eventName: 1, checkedInAt: -1 });

export const Attendance = mongoose.model("Attendance", attendanceSchema);
