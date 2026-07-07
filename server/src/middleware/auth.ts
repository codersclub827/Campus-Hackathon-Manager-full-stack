import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type JwtUser = {
  id: string;
  role: "student" | "mentor" | "judge" | "admin";
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export function signToken(user: JwtUser) {
  return jwt.sign(user, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as JwtUser;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "Authentication token required" });

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function allowRoles(...roles: JwtUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Authentication required" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: "Role does not have access" });
    next();
  };
}
