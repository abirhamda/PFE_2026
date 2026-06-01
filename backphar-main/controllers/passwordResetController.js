import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import db from "../db.js";
import { sendPasswordResetCodeEmail } from "../utils/emailService.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_RESET_MESSAGE =
  "Si un compte existe avec cet email, un code de reinitialisation a ete envoye.";

const parseBoundedInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
};

const RESET_CODE_TTL_MINUTES = parseBoundedInteger(process.env.PASSWORD_RESET_CODE_TTL_MINUTES, 10, 5, 60);
const RESET_RESEND_SECONDS = parseBoundedInteger(process.env.PASSWORD_RESET_RESEND_SECONDS, 60, 30, 600);
const RESET_HOURLY_LIMIT = parseBoundedInteger(process.env.PASSWORD_RESET_HOURLY_LIMIT, 5, 1, 20);
const RESET_MAX_ATTEMPTS = parseBoundedInteger(process.env.PASSWORD_RESET_MAX_ATTEMPTS, 5, 3, 10);
const RESET_PASSWORD_MIN_LENGTH = parseBoundedInteger(process.env.PASSWORD_MIN_LENGTH, 8, 6, 128);
const RESET_IP_WINDOW_MINUTES = parseBoundedInteger(process.env.PASSWORD_RESET_IP_WINDOW_MINUTES, 15, 5, 120);
const RESET_IP_LIMIT = parseBoundedInteger(process.env.PASSWORD_RESET_IP_LIMIT, 30, 5, 200);
const RESET_THROTTLE_MESSAGE = "Trop de demandes. Veuillez reessayer plus tard.";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeCode = (code) => String(code || "").replace(/\s/g, "");
const generateResetCode = () => String(randomInt(100000, 1000000));
const resetRateBuckets = new Map();

const safeRollback = async (connection) => {
  try {
    await connection.rollback();
  } catch (_error) {
    // Transaction may already be closed.
  }
};

const getRequestIp = (req) => {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return (forwardedFor || req.ip || req.socket?.remoteAddress || null)?.slice(0, 45) || null;
};

const getUserAgent = (req) => String(req.headers["user-agent"] || "").slice(0, 255) || null;

const isIpRateLimited = (req, action) => {
  const now = Date.now();
  const windowMs = RESET_IP_WINDOW_MINUTES * 60 * 1000;
  const ip = getRequestIp(req) || "unknown";
  const key = `${action}:${ip}`;
  const currentBucket = resetRateBuckets.get(key);

  if (!currentBucket || currentBucket.resetAt <= now) {
    resetRateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (currentBucket.count >= RESET_IP_LIMIT) {
    return true;
  }

  currentBucket.count += 1;
  return false;
};

const syncRolePassword = async (connection, role, email, hashedPassword) => {
  switch (String(role || "").toLowerCase()) {
    case "admin":
      await connection.execute("UPDATE admin SET mot_de_passe = ? WHERE email = ?", [hashedPassword, email]);
      break;
    case "pharmacist":
      await connection.execute("UPDATE pharmacie SET mot_de_passe = ? WHERE email = ?", [hashedPassword, email]);
      break;
    case "doctor":
      await connection.execute("UPDATE doctors SET password = ? WHERE email = ?", [hashedPassword, email]);
      break;
    case "supplier":
      await connection.execute("UPDATE suppliers SET password = ? WHERE email = ?", [hashedPassword, email]);
      break;
    case "secretaire":
      await connection.execute("UPDATE secretaries SET password = ? WHERE email = ?", [hashedPassword, email]);
      break;
    default:
      break;
  }
};

export const requestPasswordReset = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Format d'email invalide" });
  }

  if (isIpRateLimited(req, "password-reset-request")) {
    return res.status(429).json({ error: RESET_THROTTLE_MESSAGE });
  }

  const connection = await db.getConnection();
  let resetCodeId = null;

  try {
    const [users] = await connection.execute(
      "SELECT id, email, role FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (users.length === 0) {
      return res.json({ message: GENERIC_RESET_MESSAGE, expiresInMinutes: RESET_CODE_TTL_MINUTES });
    }

    const user = users[0];
    const [recentRows] = await connection.execute(
      `SELECT TIMESTAMPDIFF(SECOND, created_at, NOW()) AS age_seconds
       FROM password_reset_codes
       WHERE user_id = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id],
    );

    if (recentRows.length > 0 && Number(recentRows[0].age_seconds || 0) < RESET_RESEND_SECONDS) {
      return res.json({ message: GENERIC_RESET_MESSAGE, expiresInMinutes: RESET_CODE_TTL_MINUTES });
    }

    const [hourRows] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM password_reset_codes
       WHERE user_id = ?
         AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [user.id],
    );

    if (Number(hourRows[0]?.total || 0) >= RESET_HOURLY_LIMIT) {
      return res.json({ message: GENERIC_RESET_MESSAGE, expiresInMinutes: RESET_CODE_TTL_MINUTES });
    }

    const code = generateResetCode();
    const codeHash = await bcrypt.hash(code, 10);

    await connection.beginTransaction();
    await connection.execute(
      "UPDATE password_reset_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
      [user.id],
    );

    const [insertResult] = await connection.execute(
      `INSERT INTO password_reset_codes (user_id, code_hash, expires_at, request_ip, user_agent)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ${RESET_CODE_TTL_MINUTES} MINUTE), ?, ?)`,
      [user.id, codeHash, getRequestIp(req), getUserAgent(req)],
    );

    resetCodeId = insertResult.insertId;
    await connection.commit();

    await sendPasswordResetCodeEmail(user.email, code, {
      expiresInMinutes: RESET_CODE_TTL_MINUTES,
    });

    return res.json({ message: GENERIC_RESET_MESSAGE, expiresInMinutes: RESET_CODE_TTL_MINUTES });
  } catch (error) {
    await safeRollback(connection);

    if (resetCodeId) {
      await connection
        .execute("UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?", [resetCodeId])
        .catch(() => {});
    }

    console.error("Password reset request error:", error);
    return res.status(500).json({
      error: "Erreur lors de l'envoi du code de reinitialisation",
    });
  } finally {
    connection.release();
  }
};

export const resetPassword = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = normalizeCode(req.body?.code);
  const newPassword = String(req.body?.newPassword || req.body?.new_password || req.body?.password || "");

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Format d'email invalide" });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Code invalide ou expire" });
  }

  if (isIpRateLimited(req, "password-reset-confirm")) {
    return res.status(429).json({ error: RESET_THROTTLE_MESSAGE });
  }

  if (newPassword.length < RESET_PASSWORD_MIN_LENGTH) {
    return res.status(400).json({
      error: `Le nouveau mot de passe doit contenir au moins ${RESET_PASSWORD_MIN_LENGTH} caracteres`,
    });
  }

  const connection = await db.getConnection();

  try {
    const [users] = await connection.execute(
      "SELECT id, email, role FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (users.length === 0) {
      return res.status(400).json({ error: "Code invalide ou expire" });
    }

    const user = users[0];
    const [resetRows] = await connection.execute(
      `SELECT id, code_hash, attempts
       FROM password_reset_codes
       WHERE user_id = ?
         AND used_at IS NULL
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id],
    );

    if (resetRows.length === 0) {
      return res.status(400).json({ error: "Code invalide ou expire" });
    }

    const resetCode = resetRows[0];
    if (Number(resetCode.attempts || 0) >= RESET_MAX_ATTEMPTS) {
      await connection.execute("UPDATE password_reset_codes SET used_at = NOW() WHERE id = ?", [resetCode.id]);
      return res.status(400).json({ error: "Code invalide ou expire" });
    }

    const isCodeValid = await bcrypt.compare(code, resetCode.code_hash);
    if (!isCodeValid) {
      const nextAttempts = Number(resetCode.attempts || 0) + 1;
      await connection.execute(
        `UPDATE password_reset_codes
         SET attempts = ?, used_at = CASE WHEN ? >= ${RESET_MAX_ATTEMPTS} THEN NOW() ELSE used_at END
         WHERE id = ?`,
        [nextAttempts, nextAttempts, resetCode.id],
      );
      return res.status(400).json({ error: "Code invalide ou expire" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await connection.beginTransaction();
    await connection.execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, user.id]);
    await syncRolePassword(connection, user.role, user.email, hashedPassword);
    await connection.execute(
      "UPDATE password_reset_codes SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
      [user.id],
    );
    await connection.commit();

    return res.json({ message: "Mot de passe reinitialise avec succes" });
  } catch (error) {
    await safeRollback(connection);
    console.error("Password reset error:", error);
    return res.status(500).json({ error: "Erreur lors de la reinitialisation du mot de passe" });
  } finally {
    connection.release();
  }
};

export default {
  requestPasswordReset,
  resetPassword,
};
