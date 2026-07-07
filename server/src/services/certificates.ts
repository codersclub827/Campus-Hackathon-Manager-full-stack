import crypto from "crypto";
import { env } from "../config/env.js";
import { Certificate } from "../models/Certificate.js";

export type CertificateCategory = "Winner" | "Runner-up" | "Participant" | "Mentor" | "Judge" | "Organizer";
export type EmailStatus = "Not Sent" | "Sending" | "Sent" | "Failed";

export type CertificateRecord = {
  _id: string;
  recipientName: string;
  recipientEmail: string;
  teamName: string;
  eventName: string;
  award: string;
  category: CertificateCategory;
  status: "pending" | "generated";
  emailStatus: EmailStatus;
  certificateId: string;
  issuedAt: Date;
  generatedAt: Date;
  downloadedAt?: Date;
  downloadCount: number;
  verifiedAt?: Date;
  verifiedCount: number;
  qrPayload: string;
  verificationUrl: string;
  signatureHash: string;
  history: Array<{ action: string; at: Date; detail?: string }>;
  createdAt: Date;
  updatedAt: Date;
};

const memoryCertificates: CertificateRecord[] = [
  buildCertificate({
    recipientName: "Ananya Sharma",
    recipientEmail: "ananya@campus.edu",
    teamName: "Neural Nexus",
    eventName: "Campus Hackathon 2026",
    award: "Grand Winner",
    category: "Winner"
  }),
  buildCertificate({
    recipientName: "Kabir Mehta",
    recipientEmail: "kabir@campus.edu",
    teamName: "Data Drifters",
    eventName: "Campus Hackathon 2026",
    award: "Judge Appreciation",
    category: "Judge"
  }),
  buildCertificate({
    recipientName: "Mehak Jain",
    recipientEmail: "mehak@campus.edu",
    teamName: "Pixel Pioneers",
    eventName: "Campus Hackathon 2026",
    award: "Participation Certificate",
    category: "Participant"
  })
];

export function buildCertificate(input: {
  recipientName: string;
  recipientEmail: string;
  teamName?: string;
  eventName?: string;
  award?: string;
  category?: CertificateCategory;
}) {
  const now = new Date();
  const certificateId = `CHM-${now.getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
  const signatureHash = crypto.createHash("sha256").update(`${certificateId}:${input.recipientEmail}`).digest("hex");
  const verificationUrl = `/verify-certificate/${certificateId}`;

  return {
    _id: crypto.randomUUID(),
    recipientName: input.recipientName,
    recipientEmail: input.recipientEmail,
    teamName: input.teamName ?? "",
    eventName: input.eventName ?? "Campus Hackathon 2026",
    award: input.award ?? "Participation Certificate",
    category: input.category ?? "Participant",
    status: "generated" as const,
    emailStatus: "Not Sent" as const,
    certificateId,
    issuedAt: now,
    generatedAt: now,
    downloadCount: 0,
    verifiedCount: 0,
    qrPayload: `CERT:${certificateId}:${signatureHash.slice(0, 16)}`,
    verificationUrl,
    signatureHash,
    history: [{ action: "Generated", at: now, detail: "Certificate created after finalized results." }],
    createdAt: now,
    updatedAt: now
  };
}

export function serializeCertificate(certificate: any) {
  return {
    id: certificate._id?.toString() ?? certificate.id,
    recipientName: certificate.recipientName,
    recipientEmail: certificate.recipientEmail,
    teamName: certificate.teamName ?? "",
    eventName: certificate.eventName,
    award: certificate.award,
    category: certificate.category,
    status: certificate.status,
    emailStatus: certificate.emailStatus,
    certificateId: certificate.certificateId,
    issuedAt: certificate.issuedAt,
    generatedAt: certificate.generatedAt,
    downloadedAt: certificate.downloadedAt,
    downloadCount: certificate.downloadCount ?? 0,
    verifiedAt: certificate.verifiedAt,
    verifiedCount: certificate.verifiedCount ?? 0,
    qrPayload: certificate.qrPayload,
    verificationUrl: certificate.verificationUrl,
    signatureHash: certificate.signatureHash,
    history: certificate.history ?? [],
    createdAt: certificate.createdAt,
    updatedAt: certificate.updatedAt
  };
}

export async function createCertificate(input: Parameters<typeof buildCertificate>[0]) {
  const certificate = buildCertificate(input);
  if (!env.mongoUri) {
    memoryCertificates.unshift(certificate);
    return certificate;
  }

  return Certificate.create(certificate);
}

export async function listCertificates(query: { search?: string; category?: string; page?: number; limit?: number; sort?: string }) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(50, Math.max(5, query.limit ?? 8));
  const search = query.search?.trim().toLowerCase() ?? "";
  const category = query.category;
  const sort = query.sort ?? "newest";

  if (!env.mongoUri) {
    let rows = [...memoryCertificates];
    if (search) {
      rows = rows.filter((certificate) =>
        [certificate.recipientName, certificate.teamName, certificate.eventName, certificate.certificateId, certificate.award]
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    }
    if (category && category !== "All") rows = rows.filter((certificate) => certificate.category === category);
    rows.sort((a, b) => sort === "name" ? a.recipientName.localeCompare(b.recipientName) : b.generatedAt.getTime() - a.generatedAt.getTime());
    return { rows: rows.slice((page - 1) * limit, page * limit), total: rows.length, page, limit };
  }

  const filter: Record<string, unknown> = {};
  if (category && category !== "All") filter.category = category;
  if (search) {
    filter.$or = [
      { recipientName: new RegExp(search, "i") },
      { teamName: new RegExp(search, "i") },
      { eventName: new RegExp(search, "i") },
      { certificateId: new RegExp(search, "i") },
      { award: new RegExp(search, "i") }
    ];
  }

  const [rows, total] = await Promise.all([
    Certificate.find(filter).sort(sort === "name" ? { recipientName: 1 } : { generatedAt: -1 }).skip((page - 1) * limit).limit(limit),
    Certificate.countDocuments(filter)
  ]);
  return { rows, total, page, limit };
}

export async function getCertificate(id: string) {
  if (!env.mongoUri) return memoryCertificates.find((certificate) => certificate._id === id || certificate.certificateId === id) ?? null;
  return Certificate.findOne({ $or: [{ _id: id.match(/^[a-f\d]{24}$/i) ? id : undefined }, { certificateId: id }] });
}

export async function markDownloaded(id: string) {
  const now = new Date();
  if (!env.mongoUri) {
    const certificate = await getCertificate(id);
    if (!certificate) return null;
    certificate.downloadedAt = now;
    certificate.downloadCount += 1;
    certificate.history.unshift({ action: "Downloaded", at: now, detail: "PDF certificate downloaded." });
    return certificate;
  }

  return Certificate.findOneAndUpdate(
    { $or: [{ _id: id.match(/^[a-f\d]{24}$/i) ? id : undefined }, { certificateId: id }] },
    { $inc: { downloadCount: 1 }, downloadedAt: now, $push: { history: { $each: [{ action: "Downloaded", at: now, detail: "PDF certificate downloaded." }], $position: 0 } } },
    { new: true }
  );
}

export async function updateEmailStatus(id: string, status: EmailStatus, detail?: string) {
  const now = new Date();
  if (!env.mongoUri) {
    const certificate = await getCertificate(id);
    if (!certificate) return null;
    certificate.emailStatus = status;
    certificate.history.unshift({ action: `Email ${status}`, at: now, detail });
    return certificate;
  }

  return Certificate.findOneAndUpdate(
    { $or: [{ _id: id.match(/^[a-f\d]{24}$/i) ? id : undefined }, { certificateId: id }] },
    { emailStatus: status, $push: { history: { $each: [{ action: `Email ${status}`, at: now, detail }], $position: 0 } } },
    { new: true }
  );
}

export async function verifyCertificate(certificateId: string) {
  const now = new Date();
  if (!env.mongoUri) {
    const certificate = memoryCertificates.find((item) => item.certificateId === certificateId);
    if (!certificate) return null;
    certificate.verifiedAt = now;
    certificate.verifiedCount += 1;
    certificate.history.unshift({ action: "Verified", at: now, detail: "Certificate verification page opened." });
    return certificate;
  }

  return Certificate.findOneAndUpdate(
    { certificateId },
    { verifiedAt: now, $inc: { verifiedCount: 1 }, $push: { history: { $each: [{ action: "Verified", at: now, detail: "Certificate verification page opened." }], $position: 0 } } },
    { new: true }
  );
}

export async function certificateStats() {
  const rows = env.mongoUri ? await Certificate.find().limit(2000) : memoryCertificates;
  const total = rows.length;
  return {
    total,
    generated: rows.filter((item: any) => item.status === "generated").length,
    pending: Math.max(0, 18 - total),
    downloaded: rows.filter((item: any) => (item.downloadCount ?? 0) > 0).length,
    verified: rows.filter((item: any) => (item.verifiedCount ?? 0) > 0).length,
    emailed: rows.filter((item: any) => item.emailStatus === "Sent").length,
    chart: [
      { name: "Mon", generated: 24, downloads: 18 },
      { name: "Tue", generated: 38, downloads: 29 },
      { name: "Wed", generated: 54, downloads: 41 },
      { name: "Thu", generated: 86, downloads: 73 },
      { name: "Fri", generated: Math.max(96, total), downloads: rows.reduce((sum: number, item: any) => sum + (item.downloadCount ?? 0), 0) + 82 }
    ]
  };
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function createCertificatePdf(certificate: any) {
  const lines = [
    "CAMPUS HACKATHON MANAGER",
    "Certificate of Achievement",
    `Presented to ${certificate.recipientName}`,
    `For ${certificate.award}`,
    certificate.teamName ? `Team: ${certificate.teamName}` : "",
    `Event: ${certificate.eventName}`,
    `Certificate ID: ${certificate.certificateId}`,
    `Verify: ${certificate.verificationUrl}`
  ].filter(Boolean);
  const text = lines.map((line, index) => `BT /F1 ${index === 1 ? 26 : 14} Tf 72 ${700 - index * 42} Td (${pdfEscape(line)}) Tj ET`).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function writeUInt16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

export function createZip(files: Array<{ name: string; content: Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  files.forEach((file) => {
    const name = Buffer.from(file.name);
    const checksum = crc32(file.content);
    const local = Buffer.concat([
      writeUInt32(0x04034b50), writeUInt16(20), writeUInt16(0), writeUInt16(0), writeUInt16(0), writeUInt16(0),
      writeUInt32(checksum), writeUInt32(file.content.length), writeUInt32(file.content.length), writeUInt16(name.length), writeUInt16(0), name, file.content
    ]);
    const central = Buffer.concat([
      writeUInt32(0x02014b50), writeUInt16(20), writeUInt16(20), writeUInt16(0), writeUInt16(0), writeUInt16(0), writeUInt16(0),
      writeUInt32(checksum), writeUInt32(file.content.length), writeUInt32(file.content.length), writeUInt16(name.length), writeUInt16(0), writeUInt16(0),
      writeUInt16(0), writeUInt16(0), writeUInt32(0), writeUInt32(offset), name
    ]);
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  });

  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([
    writeUInt32(0x06054b50), writeUInt16(0), writeUInt16(0), writeUInt16(files.length), writeUInt16(files.length),
    writeUInt32(central.length), writeUInt32(offset), writeUInt16(0)
  ]);
  return Buffer.concat([...localParts, central, end]);
}
