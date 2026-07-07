import crypto from "crypto";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { JwtUser } from "../middleware/auth.js";
import { Notification, notificationRoles, type NotificationRole } from "../models/Notification.js";

export type NotificationPayload = {
  title: string;
  body: string;
  type?: "system" | "announcement" | "deadline" | "team" | "judging" | "certificate" | "security";
  priority?: "low" | "normal" | "high" | "urgent";
  link?: string;
  roles?: NotificationRole[];
  users?: string[];
  createdBy?: string;
};

const memoryNotifications: any[] = [];

export function notificationAudience(user: JwtUser) {
  return {
    deletedBy: { $ne: user.id },
    $or: [{ users: user.id }, { roles: user.role }, { roles: { $size: 0 }, users: { $size: 0 } }]
  };
}

export function serializeNotification(notification: any, userId?: string) {
  const readBy = notification.readBy?.map((id: unknown) => id?.toString()) ?? [];
  const createdAt = notification.createdAt instanceof Date ? notification.createdAt.toISOString() : notification.createdAt;
  const updatedAt = notification.updatedAt instanceof Date ? notification.updatedAt.toISOString() : notification.updatedAt;

  return {
    id: notification._id?.toString() ?? notification.id,
    title: notification.title,
    body: notification.body,
    type: notification.type,
    priority: notification.priority,
    link: notification.link,
    roles: notification.roles ?? [],
    users: notification.users?.map((id: unknown) => id?.toString()) ?? [],
    read: userId ? readBy.includes(userId) : false,
    createdAt,
    updatedAt
  };
}

export async function createNotification(payload: NotificationPayload) {
  const roles = payload.roles?.length ? payload.roles : [...notificationRoles];
  if (!env.mongoUri) {
    const now = new Date();
    const notification = {
      _id: crypto.randomUUID(),
      ...payload,
      roles,
      users: payload.users ?? [],
      readBy: [],
      deletedBy: [],
      createdAt: now,
      updatedAt: now
    };
    memoryNotifications.unshift(notification);
    return notification;
  }

  return Notification.create({ ...payload, roles, users: payload.users ?? [] });
}

function canReceive(notification: any, user: JwtUser) {
  const users = notification.users?.map((id: unknown) => id?.toString()) ?? [];
  const roles = notification.roles ?? [];
  const deletedBy = notification.deletedBy?.map((id: unknown) => id?.toString()) ?? [];
  return !deletedBy.includes(user.id) && (users.includes(user.id) || roles.includes(user.role) || (!users.length && !roles.length));
}

export async function listNotifications(user: JwtUser) {
  if (!env.mongoUri) return memoryNotifications.filter((notification) => canReceive(notification, user)).slice(0, 80);
  return Notification.find(notificationAudience(user)).sort({ createdAt: -1 }).limit(80);
}

export async function countUnreadNotifications(user: JwtUser) {
  if (!env.mongoUri) {
    return memoryNotifications.filter((notification) => canReceive(notification, user) && !(notification.readBy ?? []).includes(user.id)).length;
  }
  return Notification.countDocuments({ ...notificationAudience(user), readBy: { $ne: user.id } });
}

export async function markNotificationRead(notificationId: string, user: JwtUser) {
  if (!env.mongoUri) {
    const notification = memoryNotifications.find((item) => item._id === notificationId && canReceive(item, user));
    if (!notification) return null;
    notification.readBy = [...new Set([...(notification.readBy ?? []), user.id])];
    notification.updatedAt = new Date();
    return notification;
  }

  return Notification.findOneAndUpdate(
    { _id: notificationId, ...notificationAudience(user) },
    { $addToSet: { readBy: user.id } },
    { new: true }
  );
}

export async function markAllNotificationsRead(user: JwtUser) {
  if (!env.mongoUri) {
    memoryNotifications.filter((notification) => canReceive(notification, user)).forEach((notification) => {
      notification.readBy = [...new Set([...(notification.readBy ?? []), user.id])];
      notification.updatedAt = new Date();
    });
    return;
  }

  await Notification.updateMany(notificationAudience(user), { $addToSet: { readBy: user.id } });
}

export async function deleteNotificationForUser(notificationId: string, user: JwtUser) {
  if (!env.mongoUri) {
    const notification = memoryNotifications.find((item) => item._id === notificationId && canReceive(item, user));
    if (!notification) return null;
    notification.deletedBy = [...new Set([...(notification.deletedBy ?? []), user.id])];
    notification.updatedAt = new Date();
    return notification;
  }

  return Notification.findOneAndUpdate(
    { _id: notificationId, ...notificationAudience(user) },
    { $addToSet: { deletedBy: user.id } },
    { new: true }
  );
}

export function emitNotification(io: Server, notification: any) {
  const payload = serializeNotification(notification);
  const roles: string[] = notification.roles?.length ? notification.roles : [...notificationRoles];
  const users: string[] = notification.users?.map((id: unknown) => id?.toString()) ?? [];

  roles.forEach((role) => io.to(`role:${role}`).emit("notification:new", payload));
  users.forEach((userId) => io.to(`user:${userId}`).emit("notification:new", payload));
  io.to("admins").emit("notification:admin-delivered", payload);
}
