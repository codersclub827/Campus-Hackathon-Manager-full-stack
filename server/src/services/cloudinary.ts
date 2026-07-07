import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

if (env.cloudinary.cloudName) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret
  });
}

export async function uploadAsset(path: string) {
  if (!env.cloudinary.cloudName) {
    return { secure_url: `/uploads/${path.split(/[\\/]/).pop()}` };
  }
  return cloudinary.uploader.upload(path, { folder: "campus-hackathon-manager" });
}
