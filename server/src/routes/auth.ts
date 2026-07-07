import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { signToken } from "../middleware/auth.js";
import { User, type UserDocument } from "../models/User.js";

const router = Router();
const memoryUsers: Array<{ id: string; name: string; email: string; password: string; role: "student" | "mentor" | "judge" | "admin" }> = [
  { id: "demo-admin", name: "Naina Kapoor", email: "admin@campus.local", password: "password123", role: "admin" },
  { id: "demo-student", name: "Ananya Sharma", email: "student@campus.local", password: "password123", role: "student" }
];

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["student", "mentor", "judge", "admin"]).default("student")
});

router.post("/signup", async (req, res) => {
  const payload = signupSchema.parse(req.body);
  if (!env.mongoUri) {
    if (memoryUsers.some((user) => user.email === payload.email)) return res.status(409).json({ message: "Email already exists" });
    const user = { id: crypto.randomUUID(), ...payload };
    memoryUsers.push(user);
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }

  const user = await User.create(payload);
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post("/login", async (req, res) => {
  const payload = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  if (!env.mongoUri) {
    const user = memoryUsers.find((item) => item.email === payload.email && item.password === payload.password);
    if (!user) return res.status(401).json({ message: "Invalid email or password" });
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }

  const user = await User.findOne({ email: payload.email });
  if (!user || !(await (user as unknown as UserDocument).comparePassword(payload.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post("/forgot-password", async (req, res) => {
  z.object({ email: z.string().email() }).parse(req.body);
  res.json({ message: "Password reset email queued" });
});

export default router;
