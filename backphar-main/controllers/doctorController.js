import bcrypt from "bcryptjs";
import db from "../db.js";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeCin = (cin) => String(cin || "").trim();
const isDuplicateEntryError = (error) => error?.code === "ER_DUP_ENTRY";

const safeRollback = async (connection) => {
  try {
    await connection.rollback();
  } catch (_error) {
    // no-op
  }
};

const validateDoctorData = (data) => {
  const firstName = String(data?.firstName || "").trim();
  const lastName = String(data?.lastName || "").trim();
  const email = normalizeEmail(data?.email);
  const password = String(data?.password || "");
  const cin = normalizeCin(data?.cin);
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Format d'email invalide" };
  }

  if (cin.length < 8) {
    return { isValid: false, error: "Le CIN doit contenir au moins 8 caracteres" };
  }

  return {
    isValid: true,
    data: {
      firstName,
      lastName,
      email,
      password,
      cin,
      specialty,
    },
  };
};

const validateDoctorUpdateData = (data) => {
  const firstName = String(data?.firstName || "").trim();
  const lastName = String(data?.lastName || "").trim();
  const email = normalizeEmail(data?.email);
  const cin = normalizeCin(data?.cin);
  const specialty = String(data?.specialty || "").trim();

  if (!firstName || !lastName || !email || !cin || !specialty) {
    return { isValid: false, error: "Tous les champs sont obligatoires" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Format d'email invalide" };
  }

  if (cin.length < 8) {
    return { isValid: false, error: "Le CIN doit contenir au moins 8 caracteres" };
  }

  return {
    isValid: true,
    data: {
      firstName,
      lastName,
      email,
      cin,
      specialty,
    },
  };
};

const ensureDoctorIdentityIsAvailable = async (connection, { email, cin, currentDoctorEmail = null }) => {
  if (email) {
    const params = [email];
    let emailSql = "SELECT id FROM users WHERE email = ? LIMIT 1";
    if (currentDoctorEmail) {
      emailSql = "SELECT id FROM users WHERE email = ? AND NOT (email = ? AND role = 'doctor') LIMIT 1";
      params.push(currentDoctorEmail);
    }

    const [rows] = await connection.execute(emailSql, params);
    if (rows.length > 0) {
      return { ok: false, error: "Un medecin avec cet email existe deja" };
    }
  }

  if (cin) {
    const params = [cin];
    let cinSql = "SELECT id FROM users WHERE cin = ? LIMIT 1";
    if (currentDoctorEmail) {
      cinSql = "SELECT id FROM users WHERE cin = ? AND NOT (email = ? AND role = 'doctor') LIMIT 1";
      params.push(currentDoctorEmail);
    }

    const [rows] = await connection.execute(cinSql, params);
    if (rows.length > 0) {
      return { ok: false, error: "Un medecin avec ce CIN existe deja" };
    }
  }

  return { ok: true };
};

const getDoctorSummaryById = async (connection, doctorId) => {
  const [rows] = await connection.execute(
    `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at
     FROM doctors
     WHERE id = ?`,
    [doctorId],
  );

  return rows[0] || null;
};

const updateDoctorUserIdentity = async (connection, oldEmail, nextEmail, nextCin) => {
  await connection.execute(
    "UPDATE users SET email = ?, cin = ? WHERE email = ? AND role = 'doctor'",
    [nextEmail, nextCin, oldEmail],
  );
};

export const getProfile = async (req, res) => {
  try {
    const doctor = await getDoctorSummaryById(db, req.params.id);

    if (!doctor) {
      return res.status(404).json({ error: "Medecin non trouve" });
    }

    return res.json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    return res.status(500).json({
      error: "Erreur lors de la recuperation du profil",
      details: error.message,
    });
  }
};

export const createDoctor = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const validation = validateDoctorData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const { firstName, lastName, email, password, cin, specialty } = validation.data;
    const availability = await ensureDoctorIdentityIsAvailable(connection, { email, cin });
    if (!availability.ok) {
      return res.status(409).json({ error: availability.error });
    }

    await connection.beginTransaction();

    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.execute(
      "INSERT INTO users (email, cin, password, role) VALUES (?, ?, ?, ?)",
      [email, cin, hashedPassword, "doctor"],
    );

    const [insertResult] = await connection.execute(
      `INSERT INTO doctors
         (prenom, nom, email, password, cin, specialty, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [firstName, lastName, email, hashedPassword, cin, specialty, 1],
    );

    const doctor = await getDoctorSummaryById(connection, insertResult.insertId);
    await connection.commit();

    return res.status(201).json({
      message: "Medecin cree avec succes",
      doctor,
    });
  } catch (error) {
    await safeRollback(connection);
    console.error("Database error:", error);
    if (isDuplicateEntryError(error)) {
      return res.status(409).json({ error: "Cet email ou ce CIN existe deja" });
    }
    return res.status(500).json({
      error: "Erreur serveur lors de la creation",
      details: error.message,
    });
  } finally {
    connection.release();
  }
};

export const getAllDoctors = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at
       FROM doctors
       ORDER BY created_at DESC`,
    );

    return res.json({
      success: true,
      count: rows.length,
      doctors: rows || [],
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return res.status(500).json({
      error: "Erreur lors de la recuperation des medecins",
      details: error.message,
    });
  }
};

const updateDoctorRecord = async (req, res, successMessage) => {
  const connection = await db.getConnection();

  try {
    const validation = validateDoctorUpdateData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const doctorId = Number(req.params.id);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: "Identifiant medecin invalide" });
    }

    const [doctorRows] = await connection.execute(
      "SELECT id, email FROM doctors WHERE id = ? LIMIT 1",
      [doctorId],
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({ error: "Medecin non trouve" });
    }

    const currentDoctorEmail = normalizeEmail(doctorRows[0].email);
    const { firstName, lastName, email, cin, specialty } = validation.data;

    const availability = await ensureDoctorIdentityIsAvailable(connection, {
      email,
      cin,
      currentDoctorEmail,
    });
    if (!availability.ok) {
      return res.status(409).json({ error: availability.error });
    }

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE doctors
       SET prenom = ?, nom = ?, email = ?, cin = ?, specialty = ?
       WHERE id = ?`,
      [firstName, lastName, email, cin, specialty, doctorId],
    );

    await updateDoctorUserIdentity(connection, currentDoctorEmail, email, cin);

    const doctor = await getDoctorSummaryById(connection, doctorId);
    await connection.commit();

    return res.json({
      message: successMessage,
      doctor,
    });
  } catch (error) {
    await safeRollback(connection);
    console.error("Update error:", error);
    if (isDuplicateEntryError(error)) {
      return res.status(409).json({ error: "Cet email ou ce CIN existe deja" });
    }
    return res.status(500).json({
      error: "Erreur lors de la modification",
      details: error.message,
    });
  } finally {
    connection.release();
  }
};

export const updateDoctor = async (req, res) => updateDoctorRecord(req, res, "Medecin modifie avec succes");

export const updateProfile = async (req, res) =>
  updateDoctorRecord(req, res, "Profil du medecin mis a jour avec succes");

export const changePassword = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const doctorId = Number(req.params.id);
    const oldPassword = String(req.body?.old_password || "");
    const newPassword = String(req.body?.new_password || "");

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
    }

    if (oldPassword.trim() === "" || newPassword.trim() === "") {
      return res.status(400).json({ error: "Les mots de passe ne peuvent pas etre vides" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Le nouveau mot de passe doit contenir au moins 6 caracteres",
      });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      "SELECT email, password FROM doctors WHERE id = ? LIMIT 1",
      [doctorId],
    );

    if (rows.length === 0) {
      await safeRollback(connection);
      return res.status(404).json({ error: "Medecin non trouve" });
    }

    const match = await bcrypt.compare(oldPassword, rows[0].password);
    if (!match) {
      await safeRollback(connection);
      return res.status(400).json({ error: "Ancien mot de passe incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await connection.execute("UPDATE doctors SET password = ? WHERE id = ?", [hashedPassword, doctorId]);
    await connection.execute(
      "UPDATE users SET password = ? WHERE email = ? AND role = ?",
      [hashedPassword, rows[0].email, "doctor"],
    );

    await connection.commit();

    return res.json({
      message: "Mot de passe mis a jour avec succes",
      doctor_id: doctorId,
    });
  } catch (error) {
    await safeRollback(connection);
    console.error("Password change error:", error);
    return res.status(500).json({
      error: "Erreur lors du changement de mot de passe",
      details: error.message,
    });
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
      "SELECT id, email FROM doctors WHERE id = ? LIMIT 1",
      [doctorId],
    );

    if (doctorRows.length === 0) {
      await safeRollback(connection);
      return res.status(404).json({ error: "Medecin non trouve" });
    }

    const email = doctorRows[0].email;

    await connection.execute("DELETE FROM doctors WHERE id = ?", [doctorId]);
    await connection.execute("DELETE FROM users WHERE email = ? AND role = ?", [email, "doctor"]);

    await connection.commit();

    return res.json({
      message: "Medecin et compte utilisateur supprimes avec succes",
      deleted_doctor_id: doctorId,
    });
  } catch (error) {
    await safeRollback(connection);
    console.error("Delete error:", error);
    return res.status(500).json({
      error: "Erreur lors de la suppression",
      details: error.message,
    });
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
    if (doctorRows.length === 0) {
      return res.status(404).json({ error: "Medecin non trouve" });
    }

    await db.execute("UPDATE doctors SET is_active = ? WHERE id = ?", [active ? 1 : 0, doctorId]);
    const doctor = await getDoctorSummaryById(db, doctorId);

    return res.json({
      message: `Medecin ${active ? "active" : "desactive"} avec succes`,
      doctor,
    });
  } catch (error) {
    console.error("Status update error:", error);
    return res.status(500).json({
      error: "Erreur lors du changement de statut",
      details: error.message,
    });
  }
};

export const getDoctorsBySpecialty = async (req, res) => {
  try {
    const specialty = String(req.params.specialty || "").trim();

    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at
       FROM doctors
       WHERE specialty = ? AND is_active = 1
       ORDER BY nom, prenom`,
      [specialty],
    );

    return res.json({
      success: true,
      specialty,
      count: rows.length,
      doctors: rows,
    });
  } catch (error) {
    console.error("Error fetching doctors by specialty:", error);
    return res.status(500).json({
      error: "Erreur lors de la recuperation des medecins par specialite",
      details: error.message,
    });
  }
};

export const getSpecialties = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT specialty, COUNT(*) AS doctor_count
       FROM doctors
       WHERE is_active = 1
       GROUP BY specialty
       ORDER BY specialty`,
    );

    return res.json({
      success: true,
      count: rows.length,
      specialties: rows,
    });
  } catch (error) {
    console.error("Error fetching specialties:", error);
    return res.status(500).json({
      error: "Erreur lors de la recuperation des specialites",
      details: error.message,
    });
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
