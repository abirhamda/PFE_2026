import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

let transporter = null;

const getAppName = () => process.env.APP_NAME || "MediCare";

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getTransporter = () => {
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure =
    process.env.SMTP_SECURE === undefined
      ? port === 465
      : ["1", "true", "yes"].includes(String(process.env.SMTP_SECURE).toLowerCase());

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP configuration is missing");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  return transporter;
};

const buildFromAddress = () => {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  return `"${escapeHtml(getAppName())}" <${fromEmail}>`;
};

export async function verifyEmailTransport() {
  return getTransporter().verify();
}

export async function sendCredentialsEmail(to, password, role) {
  const safeTo = escapeHtml(to);
  const safeRole = escapeHtml(role);
  const safePassword = escapeHtml(password);

  const mailOptions = {
    from: buildFromAddress(),
    to,
    subject: `Bienvenue sur ${getAppName()} - Vos identifiants`,
    html: `
      <p>Bonjour,</p>
      <p>Votre compte <strong>${safeRole}</strong> a bien ete cree.</p>
      <ul>
        <li>Email : <strong>${safeTo}</strong></li>
        <li>Mot de passe : <strong>${safePassword}</strong></li>
      </ul>
      <p>Merci de changer votre mot de passe lors de votre premiere connexion.</p>
    `,
  };

  return getTransporter().sendMail(mailOptions);
}

export async function sendPasswordResetCodeEmail(to, code, options = {}) {
  const expiresInMinutes = Number(options.expiresInMinutes || 10);
  const appName = getAppName();
  const safeCode = escapeHtml(code);
  const safeAppName = escapeHtml(appName);

  const mailOptions = {
    from: buildFromAddress(),
    to,
    subject: `${appName} - Code de reinitialisation`,
    text: [
      "Bonjour,",
      "",
      `Votre code de reinitialisation ${appName} est : ${code}`,
      `Ce code expire dans ${expiresInMinutes} minutes.`,
      "",
      "Si vous n'avez pas demande cette reinitialisation, ignorez cet email.",
    ].join("\n"),
    html: `
      <p>Bonjour,</p>
      <p>Votre code de reinitialisation <strong>${safeAppName}</strong> est :</p>
      <p style="font-size:24px;letter-spacing:6px;font-weight:700;margin:18px 0;">${safeCode}</p>
      <p>Ce code expire dans <strong>${expiresInMinutes} minutes</strong>.</p>
      <p>Si vous n'avez pas demande cette reinitialisation, ignorez cet email.</p>
    `,
  };

  return getTransporter().sendMail(mailOptions);
}
