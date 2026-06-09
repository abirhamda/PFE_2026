import bcrypt from "bcryptjs";
import db from "../db.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeCin = (cin) => String(cin || "").trim();
const isDuplicateEntryError = (error) => error?.code === "ER_DUP_ENTRY";

const safeRollback = async (connection) => {
  try { await connection.rollback(); } catch (_) {}
};

const validateDoctorData = (data) => {
  const firstName = String(data?.firstName || "").trim();
  const lastName  = String(data?.lastName  || "").trim();
  const email     = normalizeEmail(data?.email);
  const password  = String(data?.password  || "");
  const cin       = normalizeCin(data?.cin);
  const specialty = String(data?.specialty || "").trim();

  if (!firstName || !lastName || !email || !password || !cin || !specialty) {
    return { isValid: false, error: "Tous les champs sont obligatoires" };
  }
  if (password.trim() === "") {
    return { isValid: false, error: "Le mot de passe ne peut pas etre vide" };
  }
  if (password.length < 6) {
    return { isValid: false, error: "Le mot de passe doit contenir au moins 6 caracteres" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { isValid: false, error: "Format d'email invalide" };
  }
  if (cin.length < 8) {
    return { isValid: false, error: "Le CIN doit contenir au moins 8 caracteres" };
  }
  return { isValid: true, data: { firstName, lastName, email, password, cin, specialty } };
};

const validateDoctorUpdateData = (data) => {
  const firstName = String(data?.firstName || "").trim();
  const lastName  = String(data?.lastName  || "").trim();
  const email     = normalizeEmail(data?.email);
  const cin       = normalizeCin(data?.cin);
  const specialty = String(data?.specialty || "").trim();

  if (!firstName || !lastName || !email || !cin || !specialty) {
    return { isValid: false, error: "Tous les champs sont obligatoires" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { isValid: false, error: "Format d'email invalide" };
  }
  if (cin.length < 8) {
    return { isValid: false, error: "Le CIN doit contenir au moins 8 caracteres" };
  }
  return { isValid: true, data: { firstName, lastName, email, cin, specialty } };
};

// Check email uniqueness in users (excluding the current doctor's user_id)
// Check cin uniqueness in doctors (excluding the current doctor's id)
const ensureDoctorIdentityIsAvailable = async (connection, { email, cin, excludeDoctorId = null }) => {
  if (email) {
    let sql = "SELECT u.id FROM users u WHERE u.email = ? LIMIT 1";
    const params = [email];
    if (excludeDoctorId) {
      sql = `SELECT u.id FROM users u
             INNER JOIN doctors d ON d.user_id = u.id
             WHERE u.email = ? AND d.id <> ? LIMIT 1`;
      params.push(excludeDoctorId);
    }
    const [rows] = await connection.execute(sql, params);
    if (rows.length > 0) return { ok: false, error: "Un medecin avec cet email existe deja" };
  }

  if (cin) {
    let sql = "SELECT id FROM doctors WHERE cin = ? LIMIT 1";
    const params = [cin];
    if (excludeDoctorId) {
      sql = "SELECT id FROM doctors WHERE cin = ? AND id <> ? LIMIT 1";
      params.push(excludeDoctorId);
    }
    const [rows] = await connection.execute(sql, params);
    if (rows.length > 0) return { ok: false, error: "Un medecin avec ce CIN existe deja" };
  }

  return { ok: true };
};

const getDoctorSummaryById = async (connection, doctorId) => {
  const [rows] = await connection.execute(
    `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at
     FROM doctors WHERE id = ?`,
    [doctorId],
  );
  return rows[0] || null;
};

export const getProfile = async (req, res) => {
  try {
    const doctor = await getDoctorSummaryById(db, req.params.id);
    if (!doctor) return res.status(404).json({ error: "Medecin non trouve" });
    return res.json({ success: true, doctor });
  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation du profil", details: error.message });
  }
};

export const createDoctor = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const validation = validateDoctorData(req.body);
    if (!validation.isValid) return res.status(400).json({ error: validation.error });

    const { firstName, lastName, email, password, cin, specialty } = validation.data;

    const availability = await ensureDoctorIdentityIsAvailable(connection, { email, cin });
    if (!availability.ok) return res.status(409).json({ error: availability.error });

    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create the auth account in users
    const [userResult] = await connection.execute(
      "INSERT INTO users (email, cin, password, role) VALUES (?, ?, ?, 'doctor')",
      [email, cin, hashedPassword],
    );
    const userId = userResult.insertId;

    // 2. Create the doctor profile linked via user_id (no password stored here)
    const [insertResult] = await connection.execute(
      `INSERT INTO doctors (user_id, prenom, nom, email, cin, specialty, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [userId, firstName, lastName, email, cin, specialty],
    );

    const doctor = await getDoctorSummaryById(connection, insertResult.insertId);
    await connection.commit();

    return res.status(201).json({ message: "Medecin cree avec succes", doctor });
  } catch (error) {
    await safeRollback(connection);
    console.error("Database error:", error);
    if (isDuplicateEntryError(error)) {
      return res.status(409).json({ error: "Cet email ou ce CIN existe deja" });
    }
    return res.status(500).json({ error: "Erreur serveur lors de la creation", details: error.message });
  } finally {
    connection.release();
  }
};

export const getAllDoctors = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at
       FROM doctors ORDER BY created_at DESC`,
    );
    return res.json({ success: true, count: rows.length, doctors: rows || [] });
  } catch (error) {
    console.error("Fetch error:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation des medecins", details: error.message });
  }
};

const updateDoctorRecord = async (req, res, successMessage) => {
  const connection = await db.getConnection();

  try {
    const validation = validateDoctorUpdateData(req.body);
    if (!validation.isValid) return res.status(400).json({ error: validation.error });

    const doctorId = Number(req.params.id);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: "Identifiant medecin invalide" });
    }

    const [doctorRows] = await connection.execute(
      "SELECT id, user_id, email FROM doctors WHERE id = ? LIMIT 1",
      [doctorId],
    );
    if (doctorRows.length === 0) return res.status(404).json({ error: "Medecin non trouve" });

    const { user_id: userId } = doctorRows[0];
    const { firstName, lastName, email, cin, specialty } = validation.data;

    const availability = await ensureDoctorIdentityIsAvailable(connection, {
      email, cin, excludeDoctorId: doctorId,
    });
    if (!availability.ok) return res.status(409).json({ error: availability.error });

    await connection.beginTransaction();

    // Update the doctor profile
    await connection.execute(
      `UPDATE doctors SET prenom = ?, nom = ?, email = ?, cin = ?, specialty = ? WHERE id = ?`,
      [firstName, lastName, email, cin, specialty, doctorId],
    );

    // Keep the auth account in sync via user_id FK — no more WHERE email = ? AND role = ?
    await connection.execute(
      "UPDATE users SET email = ?, cin = ? WHERE id = ?",
      [email, cin, userId],
    );

    const doctor = await getDoctorSummaryById(connection, doctorId);
    await connection.commit();

    return res.json({ message: successMessage, doctor });
  } catch (error) {
    await safeRollback(connection);
    console.error("Update error:", error);
    if (isDuplicateEntryError(error)) {
      return res.status(409).json({ error: "Cet email ou ce CIN existe deja" });
    }
    return res.status(500).json({ error: "Erreur lors de la modification", details: error.message });
  } finally {
    connection.release();
  }
};

export const updateDoctor  = async (req, res) => updateDoctorRecord(req, res, "Medecin modifie avec succes");
export const updateProfile = async (req, res) => updateDoctorRecord(req, res, "Profil du medecin mis a jour avec succes");

export const changePassword = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const doctorId   = Number(req.params.id);
    const oldPassword = String(req.body?.old_password || "");
    const newPassword = String(req.body?.new_password || "");

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caracteres" });
    }

    await connection.beginTransaction();

    // Get user_id from doctors table
    const [doctorRows] = await connection.execute(
      "SELECT user_id FROM doctors WHERE id = ? LIMIT 1",
      [doctorId],
    );
    if (doctorRows.length === 0) {
      await safeRollback(connection);
      return res.status(404).json({ error: "Medecin non trouve" });
    }
    const userId = doctorRows[0].user_id;

    // Verify old password from the single source of truth: users table
    const [userRows] = await connection.execute(
      "SELECT password FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const match = await bcrypt.compare(oldPassword, userRows[0].password);
    if (!match) {
      await safeRollback(connection);
      return res.status(400).json({ error: "Ancien mot de passe incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update only in users — no duplicate update needed
    await connection.execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

    await connection.commit();
    return res.json({ message: "Mot de passe mis a jour avec succes", doctor_id: doctorId });
  } catch (error) {
    await safeRollback(connection);
    console.error("Password change error:", error);
    return res.status(500).json({ error: "Erreur lors du changement de mot de passe", details: error.message });
  } finally {
    connection.release();
  }
};

export const deleteDoctor = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const doctorId = Number(req.params.id);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: "Identifiant medecin invalide" });
    }

    await connection.beginTransaction();

    const [doctorRows] = await connection.execute(
      "SELECT user_id FROM doctors WHERE id = ? LIMIT 1",
      [doctorId],
    );
    if (doctorRows.length === 0) {
      await safeRollback(connection);
      return res.status(404).json({ error: "Medecin non trouve" });
    }
    const userId = doctorRows[0].user_id;

    // Deleting the users row cascades to doctors, secretaries, and all doctor children
    await connection.execute("DELETE FROM users WHERE id = ?", [userId]);

    await connection.commit();
    return res.json({ message: "Medecin et compte utilisateur supprimes avec succes", deleted_doctor_id: doctorId });
  } catch (error) {
    await safeRollback(connection);
    console.error("Delete error:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression", details: error.message });
  } finally {
    connection.release();
  }
};

export const toggleDoctorStatus = async (req, res) => {
  try {
    const { active } = req.body;
    const doctorId = Number(req.params.id);

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Le statut actif doit etre true ou false" });
    }

    const [doctorRows] = await db.execute("SELECT id FROM doctors WHERE id = ? LIMIT 1", [doctorId]);
    if (doctorRows.length === 0) return res.status(404).json({ error: "Medecin non trouve" });

    await db.execute("UPDATE doctors SET is_active = ? WHERE id = ?", [active ? 1 : 0, doctorId]);
    const doctor = await getDoctorSummaryById(db, doctorId);

    return res.json({ message: `Medecin ${active ? "active" : "desactive"} avec succes`, doctor });
  } catch (error) {
    console.error("Status update error:", error);
    return res.status(500).json({ error: "Erreur lors du changement de statut", details: error.message });
  }
};

export const getDoctorsBySpecialty = async (req, res) => {
  try {
    const specialty = String(req.params.specialty || "").trim();
    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at
       FROM doctors WHERE specialty = ? AND is_active = 1 ORDER BY nom, prenom`,
      [specialty],
    );
    return res.json({ success: true, specialty, count: rows.length, doctors: rows });
  } catch (error) {
    console.error("Error fetching doctors by specialty:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation des medecins par specialite", details: error.message });
  }
};

export const getSpecialties = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT specialty, COUNT(*) AS doctor_count
       FROM doctors WHERE is_active = 1 GROUP BY specialty ORDER BY specialty`,
    );
    return res.json({ success: true, count: rows.length, specialties: rows });
  } catch (error) {
    console.error("Error fetching specialties:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation des specialites", details: error.message });
  }
};

export default {
  getProfile,
  createDoctor,
  getAllDoctors,
  updateDoctor,
  updateProfile,
  changePassword,
  deleteDoctor,
  toggleDoctorStatus,
  getDoctorsBySpecialty,
  getSpecialties,
};
