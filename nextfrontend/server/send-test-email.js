import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

// Load project .env.local from repository root, even when running from the server folder
const currentFile = fileURLToPath(import.meta.url);
const envPath = path.join(path.dirname(currentFile), '..', '.env.local');
const normalizedEnvPath = path.resolve(envPath);
console.log('Loading .env.local from:', normalizedEnvPath);
dotenv.config({ path: normalizedEnvPath });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;
const TEST_TO = process.env.TEST_EMAIL || SMTP_USER;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('Missing SMTP configuration in .env.local. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: String(SMTP_PORT) === '465',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function sendTest() {
  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to: TEST_TO,
      subject: 'Open Market BD — SMTP test',
      text: `This is a test email from your local Open Market BD server. If you received this, SMTP is configured correctly.`,
    });
    console.log('Test email sent:', info.messageId || info.response || info);
  } catch (err) {
    console.error('Failed to send test email:', err && err.message ? err.message : err);
    process.exitCode = 2;
  }
}

sendTest();
