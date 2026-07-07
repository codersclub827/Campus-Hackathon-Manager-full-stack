import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export async function sendMail(to: string, subject: string, html: string) {
  if (!env.smtp.host) {
    console.info(`Email queued locally for ${to}: ${subject}`);
    return { accepted: [to], preview: html };
  }

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined
  });

  return transporter.sendMail({ from: env.smtp.from, to, subject, html });
}
