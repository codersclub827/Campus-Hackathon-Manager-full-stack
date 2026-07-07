import mongoose from "mongoose";

export const notificationRoles = ["student", "mentor", "judge", "admin"] as const;
export type NotificationRole = (typeof notificationRoles)[number];

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["system", "announcement", "deadline", "team", "judging", "certificate", "security"],
      default: "system"
    },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"], default: "normal" },
    link: { type: String, default: "" },
    roles: [{ type: String, enum: notificationRoles }],
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

notificationSchema.index({ roles: 1, createdAt: -1 });
notificationSchema.index({ users: 1, createdAt: -1 });
notificationSchema.index({ readBy: 1 });
notificationSchema.index({ deletedBy: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
