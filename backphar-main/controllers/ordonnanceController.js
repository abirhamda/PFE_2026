import db from "../db.js";
import { resolvePharmacyContext } from "../utils/userContext.js";

const normalizeRole = (role) => String(role || "").trim().toLowerCase();
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const resolveDoctorIdFromUser = async (connection, user, options = {}) => {
  const allowSecretary = Boolean(options?.allowSecretary);
  const role = normalizeRole(user?.role);
  const email = normalizeEmail(user?.email);

  if (!email) {
    return null;
  }

  if (role === "doctor") {
    const [rows] = await connection.execute("SELECT id FROM doctors WHERE email = ? LIMIT 1", [email]);
    if (rows.length === 0) {
      return null;
    }
    return Number(rows[0].id);
  }

  if (allowSecretary && role === "secretaire") {
    const [rows] = await connection.execute(
      `SELECT doctor_id
       FROM secretaries
       WHERE email = ?
       LIMIT 1`,
      [email],
    );
    if (rows.length === 0) {
      return null;
    }
    return Number(rows[0].doctor_id);
  }

  return null;
};

const ensureDoctorOwnsOrdonnance = async (connection, ordonnanceId, doctorId) => {
  const [rows] = await connection.execute("SELECT id, doctor_id FROM ordonnances WHERE id = ? LIMIT 1", [ordonnanceId]);
  if (rows.length === 0) {
    return { ok: false, status: 404, error: "Ordonnance non trouvee" };
  }

  if (Number(rows[0].doctor_id) !== Number(doctorId)) {
    return { ok: false, status: 403, error: "Acces refuse a cette ordonnance" };
  }

  return { ok: true };
};

export const getAllOrdonnances = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const role = normalizeRole(req.user?.role);

    let query =
      `SELECT o.id, o.doctor_id, o.id_doctor, o.pation_id, o.cin, o.nom, o.prenom, o.ordonnance, o.status, o.created_at,
              p.matricule AS patient_matricule,
              p.date_naissance AS patient_date_naissance,
              d.specialty AS doctor_specialty,
              CONCAT(COALESCE(d.prenom, ''), ' ', COALESCE(d.nom, '')) AS doctor_name
       FROM ordonnances o
       LEFT JOIN doctor_patients p ON p.id = o.pation_id AND p.doctor_id = o.doctor_id
       LEFT JOIN doctors d ON d.id = o.doctor_id`;
    const params = [];

    if (role === "doctor" || role === "secretaire") {
      const doctorId = await resolveDoctorIdFromUser(connection, req.user, { allowSecretary: true });
      if (!doctorId) {
        return res.status(403).json({ error: "Profil utilisateur invalide" });
      }

      query += " WHERE o.doctor_id = ?";
      params.push(doctorId);
    } else if (role === "pharmacist") {
      const cin = String(req.query?.cin || "").trim();
      const nom = String(req.query?.nom || "").trim().toLowerCase();
      const prenom = String(req.query?.prenom || "").trim().toLowerCase();
      const dateNaissance = String(req.query?.date_naissance || "").trim();

      const hasCinSearch = Boolean(cin);
      const hasIdentitySearch = Boolean(nom && prenom && dateNaissance);

      if (!hasCinSearch && !hasIdentitySearch) {
        return res.json([]);
      }

      if (hasCinSearch) {
        query += " WHERE o.cin = ?";
        params.push(cin);
      } else {
        query += " WHERE LOWER(o.nom) = ? AND LOWER(o.prenom) = ? AND p.date_naissance = ?";
        params.push(nom, prenom, dateNaissance);
      }
    }

    query += " ORDER BY o.created_at DESC";

    const [rows] = await connection.execute(query, params);
    return res.json(rows || []);
  } catch (error) {
    console.error("Erreur recuperation ordonnances:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const updateStatus = async (req, res) => {
  const ordonnanceId = Number(req.params.id);
  const status = String(req.body?.status || "").trim();

  if (!status) {
    return res.status(400).json({ error: "Le statut est obligatoire" });
  }

  try {
    const [existingRows] = await db.execute("SELECT id FROM ordonnances WHERE id = ?", [ordonnanceId]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Ordonnance non trouvee" });
    }

    await db.execute("UPDATE ordonnances SET status = ? WHERE id = ?", [status, ordonnanceId]);
    return res.json({ message: "Statut mis a jour avec succes" });
  } catch (error) {
    console.error("Erreur mise a jour statut ordonnance:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const createOrdonnance = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const doctorId = await resolveDoctorIdFromUser(connection, req.user);
    if (!doctorId) {
      return res.status(403).json({ error: "Profil docteur invalide" });
    }

    const rawPatientId = req.body?.pation_id ?? req.body?.patient_id;
    const patientId = rawPatientId ? Number(rawPatientId) : null;

    let nom = String(req.body?.nom || "").trim();
    let prenom = String(req.body?.prenom || "").trim();
    let cin = String(req.body?.cin || "").trim();
    const ordonnance = String(req.body?.ordonnance || "").trim();

    if (patientId && Number.isInteger(patientId) && patientId > 0 && (!nom || !prenom || !cin)) {
      const [patients] = await connection.execute(
        `SELECT id, nom, prenom, cin
         FROM doctor_patients
         WHERE id = ? AND doctor_id = ?
         LIMIT 1`,
        [patientId, doctorId],
      );

      if (patients.length > 0) {
        nom = nom || String(patients[0].nom || "").trim();
        prenom = prenom || String(patients[0].prenom || "").trim();
        cin = cin || String(patients[0].cin || "").trim();
      }
    }

    if (!nom || !prenom || !ordonnance) {
      return res.status(400).json({
        error: "nom, prenom et ordonnance sont obligatoires",
      });
    }

    if (cin && !/^\d{8}$/.test(cin)) {
      return res.status(400).json({
        error: "Le CIN doit contenir exactement 8 chiffres lorsqu'il est renseigne",
      });
    }

    const normalizedPatientId = patientId && Number.isInteger(patientId) && patientId > 0 ? patientId : null;

    const [result] = await connection.execute(
      `INSERT INTO ordonnances
       (doctor_id, id_doctor, pation_id, cin, nom, prenom, ordonnance, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'En attente', NOW())`,
      [doctorId, doctorId, normalizedPatientId, cin, nom, prenom, ordonnance],
    );

    return res.status(201).json({ message: "Ordonnance creee", id: result.insertId });
  } catch (error) {
    console.error("Erreur creation ordonnance:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const getOrdonnanceById = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const ordonnanceId = Number(req.params.id);
    const [rows] = await connection.execute(
      `SELECT o.id, o.doctor_id, o.id_doctor, o.pation_id, o.cin, o.nom, o.prenom, o.ordonnance, o.status, o.created_at,
              p.matricule AS patient_matricule,
              p.date_naissance AS patient_date_naissance,
              d.specialty AS doctor_specialty,
              CONCAT(COALESCE(d.prenom, ''), ' ', COALESCE(d.nom, '')) AS doctor_name
       FROM ordonnances o
       LEFT JOIN doctor_patients p ON p.id = o.pation_id AND p.doctor_id = o.doctor_id
       LEFT JOIN doctors d ON d.id = o.doctor_id
       WHERE o.id = ?
       LIMIT 1`,
      [ordonnanceId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Ordonnance non trouvee" });
    }

    if (["doctor", "secretaire"].includes(normalizeRole(req.user?.role))) {
      const doctorId = await resolveDoctorIdFromUser(connection, req.user, { allowSecretary: true });
      if (!doctorId) {
        return res.status(403).json({ error: "Profil utilisateur invalide" });
      }

      if (Number(rows[0].doctor_id) !== Number(doctorId)) {
        return res.status(403).json({ error: "Acces refuse a cette ordonnance" });
      }
    }

    if (normalizeRole(req.user?.role) === "pharmacist") {
      const pharmacy = await resolvePharmacyContext(connection, req.user);
      if (!pharmacy) {
        return res.status(403).json({ error: "Profil pharmacien invalide" });
      }

      await connection.execute(
        `INSERT INTO pharmacy_ordonnance_views (pharmacie_id, ordonnance_id, view_count, first_viewed_at, last_viewed_at)
         VALUES (?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE
           view_count = view_count + 1,
           last_viewed_at = NOW()`,
        [pharmacy.id_pharmacie, ordonnanceId],
      );
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("Erreur recuperation ordonnance:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export const updateOrdonnance = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const ordonnanceId = Number(req.params.id);
    const doctorId = await resolveDoctorIdFromUser(connection, req.user);
    if (!doctorId) {
      return res.status(403).json({ error: "Profil docteur invalide" });
    }

    const access = await ensureDoctorOwnsOrdonnance(connection, ordonnanceId, doctorId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const nom = String(req.body?.nom || "").trim();
    const prenom = String(req.body?.prenom || "").trim();
    const cin = String(req.body?.cin || "").trim();
    const ordonnance = String(req.body?.ordonnance || "").trim();

    if (!nom || !prenom || !ordonnance) {
      return res.status(400).json({ error: "nom, prenom et ordonnance sont obligatoires" });
    }

    if (cin && !/^\d{8}$/.test(cin)) {
      return res.status(400).json({
        error: "Le CIN doit contenir exactement 8 chiffres lorsqu'il est renseigne",
      });
    }

    await connection.execute(
      "UPDATE ordonnances SET nom = ?, prenom = ?, cin = ?, ordonnance = ? WHERE id = ?",
      [nom, prenom, cin, ordonnance, ordonnanceId],
    );

    return res.json({ message: "Ordonnance mise a jour avec succes" });
  } catch (error) {
    console.error("Erreur mise a jour ordonnance:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour" });
  } finally {
    connection.release();
  }
};

export const deleteOrdonnance = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const ordonnanceId = Number(req.params.id);
    const doctorId = await resolveDoctorIdFromUser(connection, req.user);
    if (!doctorId) {
      return res.status(403).json({ error: "Profil docteur invalide" });
    }

    const access = await ensureDoctorOwnsOrdonnance(connection, ordonnanceId, doctorId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    await connection.execute("DELETE FROM ordonnances WHERE id = ?", [ordonnanceId]);
    return res.json({ message: "Ordonnance supprimee avec succes" });
  } catch (error) {
    console.error("Erreur suppression ordonnance:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    connection.release();
  }
};

export default {
  getAllOrdonnances,
  updateStatus,
  createOrdonnance,
  getOrdonnanceById,
  updateOrdonnance,
  deleteOrdonnance,
};
