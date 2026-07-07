import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 5000),
  mongoUri: process.env.MONGODB_URI ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "campus-hackathon-manager-dev-secret",
  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? ""
  },
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.MAIL_FROM ?? "Campus Hackathon Manager <no-reply@campus.local>"
  }
};
