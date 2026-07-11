import nodemailer from "nodemailer";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const requiredEmailEnv = [
  "EMAIL",
  "EMAIL_PASSWORD",
  "FRONTEND_URL",
  "RESET_PASSWORD_FRONTEND_URL",
];

const assertEmailConfig = () => {
  const missing = requiredEmailEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(
      `Missing email environment variables: ${missing.join(", ")}`,
    );
  }
};

const createTransporter = () => {
  assertEmailConfig();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const renderTemplate = async (templateName, replacements) => {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "templates",
    templateName,
  );
  let html = await fs.readFile(templatePath, "utf8");

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(value));
  }

  return html;
};

const sendMail = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "Astro Ecommerce"}" <${process.env.EMAIL}>`,
    to,
    subject,
    html,
  });
};

export const verifySmtpConnection = async () => {
  const transporter = createTransporter();
  await transporter.verify();
  return true;
};

export const sendVerificationEmail = async (email, token) => {
  assertEmailConfig();

  const verificationLink = `${process.env.FRONTEND_URL}/?token=${encodeURIComponent(token)}`;

  console.log("Verification Link:", verificationLink);

  const html = await renderTemplate("verification-email.html", {
    verificationLink,
  });

  await sendMail({
    to: email,
    subject: "Verify Your Email",
    html,
  });

  return true;
};

export const sendPasswordResetEmail = async (email, resetToken) => {
  assertEmailConfig();

  const resetLink = `${process.env.RESET_PASSWORD_FRONTEND_URL}/reset-password.html?token=${encodeURIComponent(resetToken)}`;

  console.log("Reset Password Link:", resetLink);

  const html = await renderTemplate("password-reset-email.html", {
    resetLink,
  });

  await sendMail({
    to: email,
    subject: "Reset Your Password",
    html,
  });

  return true;
};

export default {
  sendVerificationEmail,
  sendPasswordResetEmail,
  verifySmtpConnection,
};
