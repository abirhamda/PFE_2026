import bcrypt from "bcryptjs";
import db from "../db.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeRole = (role) => String(role || "").trim().toLowerCase();
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const resolveDoctorByUser = async (connection, user) => {
  const role = normalizeRole(user?.role);
  const email = normalizeEmail(user?.email);

  if (!email) {
    return null;
  }

  if (role === "doctor") {
    const [rows] = await connection.execute(
      "SELECT id, nom, prenom FROM doctors WHERE email = ? LIMIT 1",
      [email],
    );
    return rows[0] || null;
  }

  if (role === "secretaire") {
    const [rows] = await connection.execute(
      `SELECT d.id, d.nom, d.prenom
       FROM secretaries s
       INNER JOIN doctors d ON d.id = s.doctor_id
       WHERE s.email = ?
       LIMIT 1`,
      [email],
    );
    return rows[0] || null;
  }

  return null;
};

const validateCreatePayload = (payload) => {
  const nom = String(payload?.nom || "").trim();
  const prenom = String(payload?.prenom || "").trim();
  const email = normalizeEmail(payload?.email);
  const password = String(payload?.password || "");
  const telephone = payload?.telephone ? String(payload.telephone).trim() : null;

  if (!nom || !prenom || !email || !password) {
    return { valid: false, error: "nom, prenom, email et password sont obligatoires" };
  }

  if (!emailRegex.test(email)) {
    return { valid: false, error: "Format d'email invalide" };
  }

  if (password.length < 6) {
    return { valid: false, error: "Le mot de passe doit contenir au moins 6 caracteres" };
  }

  return {
    valid: true,
    data: {
      nom,
      prenom,
      email,
      password,
      telephone,
    },
  };
};

const validateUpdatePayload = (payload) => {
  const hasOwn = (key) => Object.prototype.hasOwnProperty.call(payload || {}, key);
  const data = {};

  if (hasOwn("nom")) {
    const nom = String(payload?.nom || "").trim();
    if (!nom) {
      return { valid: false, error: "nom invalide" };
    }
    data.nom = nom;
  }

  if (hasOwn("prenom")) {
    const prenom = String(payload?.prenom || "").trim();
    if (!prenom) {
      return { valid: false, error: "prenom invalide" };
    }
    data.prenom = prenom;
  }

  if (hasOwn("email")) {
    const email = normalizeEmail(payload?.email);
    if (!emailRegex.test(email)) {
      return { valid: false, error: "Format d'email invalide" };
    }
    data.email = email;
  }

  if (hasOwn("telephone")) {
    data.telephone = payload?.telephone ? String(payload.telephone).trim() : null;
  }

  if (hasOwn("password")) {
    const password = String(payload?.password || "");
    if (password && password.length < 6) {
      return { valid: false, error: "Le mot de passe doit contenir au moins 6 caracteres" };
    }
    data.password = password || null;
  }

  if (Object.keys(data).length === 0) {
    return { valid: false, error: "Aucune donnee a modifier" };
  }

  return { valid: true, data };
};

export const createSecretary = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const validation = validateCreatePayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const requesterRole = normalizeRole(req.user?.role);
    let doctorId = Number(req.body?.doctor_id);

    if (requesterRole === "doctor") {
      const doctor = await resolveDoctorByUser(connection, req.user);
      if (!doctor) {
        return res.status(404).json({ error: "Docteur introuvable" });
      }
      doctorId = Number(doctor.id);
    } else if (requesterRole !== "admin") {
      return res.status(403).json({ error: "Acces refuse" });
    }

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: "doctor_id invalide" });
    }

    await connection.beginTransaction();

    const [doctorRows] = await connection.execute(
      "SELECT id, nom, prenom FROM doctors WHERE id = ? LIMIT 1",
      [doctorId],
    );
    if (doctorRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Docteur non trouve" });
    }

    const { nom, prenom, email, password, telephone } = validation.data;
    const [existingUsers] = await connection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Un compte avec cet email existe deja" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.execute(
      "INSERT INTO users (email, password, role) VALUES (?, ?, 'secretaire')",
      [email, hashedPassword],
    );

    const [insertResult] = await connection.execute(
      `INSERT INTO secretaries (doctor_id, nom, prenom, email, password, telephone, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [doctorId, nom, prenom, email, hashedPassword, telephone],
    );

    const [newRows] = await connection.execute(
      `SELECT s.id, s.doctor_id, s.nom, s.prenom, s.email, s.telephone, s.is_active, s.created_at,
              d.nom AS doctor_nom, d.prenom AS doctor_prenom
       FROM secretaries s
       INNER JOIN doctors d ON d.id = s.doctor_id
       WHERE s.id = ?`,
      [insertResult.insertId],
    );

    await connection.commit();

    return res.status(201).json({
      message: "Secretaire creee avec succes",
      secretary: newRows[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating secretary:", error);
    return res.status(500).json({ error: "Erreur serveur lors de la creation", details: error.message });
  } finally {
    connection.release();
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const role = normalizeRole(req.user?.role);
    const email = normalizeEmail(req.user?.email);

    if (role !== "secretaire") {
      return res.status(403).json({ error: "Acces reserve au role secretaire" });
    }

    const [rows] = await db.execute(
      `SELECT s.id, s.doctor_id, s.nom, s.prenom, s.email, s.telephone, s.is_active, s.created_at,
              d.nom AS doctor_nom, d.prenom AS doctor_prenom, d.specialty AS doctor_specialty
       FROM secretaries s
       INNER JOIN doctors d ON d.id = s.doctor_id
       WHERE s.email = ?
       LIMIT 1`,
      [email],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Secretaire non trouvee" });
    }

    return res.json({
      success: true,
      secretary: rows[0],
    });
  } catch (error) {
    console.error("Error fetching secretary profile:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation du profil", details: error.message });
  }
};

export const getDoctorSecretaries = async (req, res) => {
  try {
    const requestedDoctorId = Number(req.params.doctorId);
    if (!Number.isInteger(requestedDoctorId) || requestedDoctorId <= 0) {
      return res.status(400).json({ error: "doctorId invalide" });
    }

    const requesterRole = normalizeRole(req.user?.role);
    if (requesterRole === "doctor") {
      const doctor = await resolveDoctorByUser(db, req.user);
      if (!doctor) {
        return res.status(404).json({ error: "Docteur introuvable" });
      }
      if (Number(doctor.id) !== requestedDoctorId) {
        return res.status(403).json({ error: "Acces refuse a ce docteur" });
      }
    } else if (requesterRole !== "admin") {
      return res.status(403).json({ error: "Acces refuse" });
    }

    const [rows] = await db.execute(
      `SELECT s.id, s.doctor_id, s.nom, s.prenom, s.email, s.telephone, s.is_active, s.created_at
       FROM secretaries s
       WHERE s.doctor_id = ?
       ORDER BY s.created_at DESC`,
      [requestedDoctorId],
    );

    return res.json({
      success: true,
      count: rows.length,
      secretaries: rows,
    });
  } catch (error) {
    console.error("Error fetching doctor secretaries:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation des secretaires", details: error.message });
  }
};

const ensureSecretaryOwnership = async (connection, requester, secretaryId) => {
  const [rows] = await connection.execute(
    "SELECT id, doctor_id, email, is_active FROM secretaries WHERE id = ? LIMIT 1",
    [secretaryId],
  );

  if (rows.length === 0) {
    return { ok: false, status: 404, error: "Secretaire non trouvee" };
  }

  const secretary = rows[0];
  const role = normalizeRole(requester?.role);

  if (role === "admin") {
    return { ok: true, secretary };
  }

  if (role === "doctor") {
    const doctor = await resolveDoctorByUser(connection, requester);
    if (!doctor || Number(doctor.id) !== Number(secretary.doctor_id)) {
      return { ok: false, status: 403, error: "Acces refuse" };
    }
    return { ok: true, secretary };
  }

  return { ok: false, status: 403, error: "Acces refuse" };
};

export const toggleSecretaryStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const secretaryId = Number(req.params.id);
    const active = req.body?.active;

    if (!Number.isInteger(secretaryId) || secretaryId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "active doit etre un booleen" });
    }

    const ownership = await ensureSecretaryOwnership(connection, req.user, secretaryId);
    if (!ownership.ok) {
      return res.status(ownership.status).json({ error: ownership.error });
    }

    await connection.execute(
      "UPDATE secretaries SET is_active = ? WHERE id = ?",
      [active ? 1 : 0, secretaryId],
    );

    const [rows] = await connection.execute(
      `SELECT id, doctor_id, nom, prenom, email, telephone, is_active, created_at
       FROM secretaries
       WHERE id = ?
       LIMIT 1`,
      [secretaryId],
    );

    return res.json({
      message: `Secretaire ${active ? "activee" : "desactivee"} avec succes`,
      secretary: rows[0],
    });
  } catch (error) {
    console.error("Error toggling secretary status:", error);
    return res.status(500).json({ error: "Erreur lors du changement de statut", details: error.message });
  } finally {
    connection.release();
  }
};

export const deleteSecretary = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const secretaryId = Number(req.params.id);
    if (!Number.isInteger(secretaryId) || secretaryId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }

    await connection.beginTransaction();
    const ownership = await ensureSecretaryOwnership(connection, req.user, secretaryId);
    if (!ownership.ok) {
      await connection.rollback();
      return res.status(ownership.status).json({ error: ownership.error });
    }

    await connection.execute("DELETE FROM secretaries WHERE id = ?", [secretaryId]);
    await connection.execute(
      "DELETE FROM users WHERE email = ? AND role = 'secretaire'",
      [ownership.secretary.email],
    );

    await connection.commit();
    return res.json({ message: "Secretaire supprimee avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting secretary:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression", details: error.message });
  } finally {
    connection.release();
  }
};

export const updateSecretary = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const secretaryId = Number(req.params.id);
    if (!Number.isInteger(secretaryId) || secretaryId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }

    const validation = validateUpdatePayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    await connection.beginTransaction();

    const ownership = await ensureSecretaryOwnership(connection, req.user, secretaryId);
    if (!ownership.ok) {
      await connection.rollback();
      return res.status(ownership.status).json({ error: ownership.error });
    }

    const [currentRows] = await connection.execute(
      "SELECT id, doctor_id, nom, prenom, email, telephone, is_active FROM secretaries WHERE id = ? LIMIT 1",
      [secretaryId],
    );
    if (currentRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Secretaire non trouvee" });
    }

    const current = currentRows[0];
    const next = {
      nom: validation.data.nom ?? current.nom,
      prenom: validation.data.prenom ?? current.prenom,
      email: validation.data.email ?? current.email,
      telephone:
        Object.prototype.hasOwnProperty.call(validation.data, "telephone")
          ? validation.data.telephone
          : current.telephone,
      password: validation.data.password ?? null,
    };

    if (next.email !== current.email) {
      const [existingUsers] = await connection.execute(
        "SELECT id FROM users WHERE email = ? AND email <> ? LIMIT 1",
        [next.email, current.email],
      );
      if (existingUsers.length > 0) {
        await connection.rollback();
        return res.status(409).json({ error: "Un compte avec cet email existe deja" });
      }
    }

    let hashedPassword = null;
    if (next.password) {
      hashedPassword = await bcrypt.hash(next.password, 10);
    }

    if (hashedPassword) {
      await connection.execute(
        `UPDATE secretaries
         SET nom = ?, prenom = ?, email = ?, telephone = ?, password = ?
         WHERE id = ?`,
        [next.nom, next.prenom, next.email, next.telephone, hashedPassword, secretaryId],
      );
      await connection.execute(
        "UPDATE users SET email = ?, password = ? WHERE email = ? AND role = 'secretaire'",
        [next.email, hashedPassword, current.email],
      );
    } else {
      await connection.execute(
        `UPDATE secretaries
         SET nom = ?, prenom = ?, email = ?, telephone = ?
         WHERE id = ?`,
        [next.nom, next.prenom, next.email, next.telephone, secretaryId],
      );
      await connection.execute(
        "UPDATE users SET email = ? WHERE email = ? AND role = 'secretaire'",
        [next.email, current.email],
      );
    }

    const [rows] = await connection.execute(
      `SELECT s.id, s.doctor_id, s.nom, s.prenom, s.email, s.telephone, s.is_active, s.created_at,
              d.nom AS doctor_nom, d.prenom AS doctor_prenom
       FROM secretaries s
       INNER JOIN doctors d ON d.id = s.doctor_id
       WHERE s.id = ?
       LIMIT 1`,
      [secretaryId],
    );

    await connection.commit();
    return res.json({
      message: "Secretaire mise a jour avec succes",
      secretary: rows[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating secretary:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour", details: error.message });
  } finally {
    connection.release();
  }
};

export default {
  createSecretary,
  getMyProfile,
  getDoctorSecretaries,
  updateSecretary,
  toggleSecretaryStatus,
  deleteSecretary,
};
