import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDatabase() {
  if (!env.mongoUri) {
    console.info("MongoDB URI not set. API is running with route-level validation and in-memory responses.");
    return;
  }

  await mongoose.connect(env.mongoUri);
  console.info("MongoDB connected");
}
