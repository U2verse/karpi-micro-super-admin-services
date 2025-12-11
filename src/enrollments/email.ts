import * as nodemailer from "nodemailer";
import * as fs from "fs";

// -----------------------------------------------------
// 1️⃣ Your ORIGINAL EMAIL TRANSPORTER (unchanged)
// -----------------------------------------------------
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,                  // email-smtp.ap-south-1.amazonaws.com
  port: 587,
  secure: false,                                // MUST be false for TLS 587
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,                  // ignore cert errors
    ciphers: "SSLv3",                           // AWS fix for Windows TLS
    minVersion: "TLSv1",                        // relax strict handshake
  },
});

// -----------------------------------------------------
// 2️⃣ NEW FUNCTION — Invoice Email Sender
// (USE YOUR EXISTING TRANSPORTER)
// -----------------------------------------------------
export async function sendInvoiceEmail({
  to,
  name,
  html,
  pdfPath,
}: {
  to: string;
  name: string;
  html: string;
  pdfPath: string;
}) {
  return transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: "Your Karpi LMS Invoice",
    html,
    attachments: [
      {
        filename: "invoice.pdf",
        path: pdfPath, // absolute path created during PDF generation
      },
    ],
  });
}
