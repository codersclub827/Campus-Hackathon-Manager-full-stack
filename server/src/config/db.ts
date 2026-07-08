import mongoose from "mongoose";
import { env } from "./env.js";

const connectDatabase = async () => {
  if (!env.mongoUri) {
    console.warn("MongoDB URI is missing. API will run with demo in-memory auth only.");
    return;
  }

  await mongoose.connect(env.mongoUri);
  console.log("MongoDB Connected Successfully");
};

export default connectDatabase;
