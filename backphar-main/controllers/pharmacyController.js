import db from "../db.js";
import bcrypt from "bcryptjs";
import { resolvePharmacyContext } from "../utils/userContext.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validatePharmacyData = (data) => {
  const { nom_pharmacie, email, telephone, password, president_pharmacie } = data || {};

  if (!nom_pharmacie || !email || !telephone || !password || !president_pharmacie) {
    return { isValid: false, error: "Tous les champs sont obligatoires" };
  }

  if (typeof password !== "string" || password.trim() === "") {
    return { isValid: false, error: "Le mot de passe ne peut pas etre vide" };
  }

  if (password.length < 6) {
    return { isValid: false, error: "Le mot de passe doit contenir au moins 6 caracteres" };
  }

  if (!emailRegex.test(String(email).trim())) {
    return { isValid: false, error: "Format d'email invalide" };
  }

  return { isValid: true };
};

const parseJsonField = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return null; }
};

const pharmacyTypeLabel = (type) => {
  if (type === "night") return "Pharmacie de nuit";
  if (type === "both") return "Pharmacie jour et nuit";
  return "Pharmacie de jour";
};

const shapePharmacy = (row) => ({
  id_pharmacie: Number(row.id_pharmacie),
  nom_pharmacie: row.nom_pharmacie,
  email: row.email,
  telephone: row.telephone,
  president_pharmacie: row.president_pharmacie,
  address_line: row.address_line || null,
  city: row.city || null,
  pharmacy_type: row.pharmacy_type || "day",
  opening_hours: parseJsonField(row.opening_hours_json),
  latitude: row.latitude != null ? Number(row.latitude) : null,
  longitude: row.longitude != null ? Number(row.longitude) : null,
  is_active: Boolean(row.is_active),
  created_at: row.created_at,
});

const shapePublicPharmacy = (row) => ({
  id_pharmacie: Number(row.id_pharmacie),
  nom_pharmacie: row.nom_pharmacie,
  telephone: row.telephone || null,
  email: row.email || null,
  president_pharmacie: row.president_pharmacie || null,
  address_line: row.address_line || null,
  city: row.city || null,
  pharmacy_type: row.pharmacy_type || "day",
  type_label: pharmacyTypeLabel(row.pharmacy_type),
  opening_hours: parseJsonField(row.opening_hours_json),
  latitude: row.latitude != null ? Number(row.latitude) : null,
  longitude: row.longitude != null ? Number(row.longitude) : null,
});

const getPharmacyById = async (connection, pharmacyId) => {
  const [rows] = await connection.execute(
    `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie,
            address_line, city, pharmacy_type, opening_hours_json, latitude, longitude,
            is_active, created_at
     FROM pharmacie
     WHERE id_pharmacie = ?
     LIMIT 1`,
    [pharmacyId],
  );

  return rows[0] || null;
};

export const createPharmacy = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const validation = validatePharmacyData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const nom_pharmacie = String(req.body.nom_pharmacie).trim();
    const president_pharmacie = String(req.body.president_pharmacie).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const telephone = String(req.body.telephone).trim();
    const password = String(req.body.password);

    await connection.beginTransaction();

    const [existingPharmacy] = await connection.execute("SELECT id_pharmacie FROM pharmacie WHERE email = ?", [email]);
    if (existingPharmacy.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Une pharmacie avec cet email existe deja" });
    }

    const [existingUser] = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Un compte utilisateur avec cet email existe deja" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 1. Create the auth account in users
    const [userResult] = await connection.execute(
      "INSERT INTO users (email, password, role, created_at) VALUES (?, ?, 'pharmacist', NOW())",
      [email, hashedPassword],
    );
    const userId = userResult.insertId;

    // 2. Create the pharmacy profile linked via user_id (no password stored here)
    const [pharmacyResult] = await connection.execute(
      `INSERT INTO pharmacie
       (user_id, nom_pharmacie, email, telephone, president_pharmacie, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [userId, nom_pharmacie, email, telephone, president_pharmacie],
    );

    const pharmacy = await getPharmacyById(connection, pharmacyResult.insertId);
    await connection.commit();

    return res.status(201).json({
      message: "Pharmacie et compte pharmacien crees avec succes",
      pharmacy: shapePharmacy(pharmacy),
      user: {
        id: userResult.insertId,
        email,
        role: "pharmacist",
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating pharmacy:", error);
    return res.status(500).json({ error: "Erreur serveur lors de la creation", details: error.message });
  } finally {
    connection.release();
  }
};

export const getProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await getPharmacyById(connection, Number(req.params.id));
    if (!pharmacy) {
      return res.status(404).json({ error: "Pharmacie non trouvee" });
    }

    return res.json(shapePharmacy(pharmacy));
  } catch (error) {
    console.error("Error getting pharmacy profile:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation du profil" });
  } finally {
    connection.release();
  }
};

export const getMyProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ error: "Profil pharmacien invalide" });
    }

    const current = await getPharmacyById(connection, pharmacy.id_pharmacie);
    return res.json({ success: true, profile: shapePharmacy(current) });
  } catch (error) {
    console.error("Error getting my pharmacy profile:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation du profil pharmacien" });
  } finally {
    connection.release();
  }
};

export const updateProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const pharmacyId = Number(req.params.id);
    const nom_pharmacie = String(req.body?.nom_pharmacie || "").trim();
    const president_pharmacie = String(req.body?.president_pharmacie || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const telephone = String(req.body?.telephone || "").trim();

    if (!nom_pharmacie || !president_pharmacie || !email || !telephone) {
      await connection.rollback();
      return res.status(400).json({ error: "Tous les champs sont obligatoires" });
    }

    if (!emailRegex.test(email)) {
      await connection.rollback();
      return res.status(400).json({ error: "Format d'email invalide" });
    }

    const current = await getPharmacyById(connection, pharmacyId);
    if (!current) {
      await connection.rollback();
      return res.status(404).json({ error: "Pharmacie non trouvee" });
    }

    const [duplicateRows] = await connection.execute(
      "SELECT id_pharmacie FROM pharmacie WHERE email = ? AND id_pharmacie <> ? LIMIT 1",
      [email, pharmacyId],
    );
    if (duplicateRows.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Cet email est deja utilise par une autre pharmacie" });
    }

    await connection.execute(
      `UPDATE pharmacie
       SET nom_pharmacie = ?, email = ?, telephone = ?, president_pharmacie = ?
       WHERE id_pharmacie = ?`,
      [nom_pharmacie, email, telephone, president_pharmacie, pharmacyId],
    );

    if (email !== current.email) {
      // Sync auth account via user_id FK — no more WHERE email = ? AND role = ?
      const [pharmRow] = await connection.execute(
        "SELECT user_id FROM pharmacie WHERE id_pharmacie = ? LIMIT 1",
        [pharmacyId],
      );
      if (pharmRow.length > 0) {
        await connection.execute(
          "UPDATE users SET email = ? WHERE id = ?",
          [email, pharmRow[0].user_id],
        );
      }
    }

    const updated = await getPharmacyById(connection, pharmacyId);
    await connection.commit();

    return res.json({ message: "Pharmacie mise a jour avec succes", pharmacy: shapePharmacy(updated) });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating pharmacy:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour" });
  } finally {
    connection.release();
  }
};

export const updateMyProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ error: "Profil pharmacien invalide" });
    }

    req.params.id = String(pharmacy.id_pharmacie);
    return updateProfile(req, res);
  } finally {
    connection.release();
  }
};

export const changePassword = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const oldPassword = String(req.body?.old_password || "");
    const newPassword = String(req.body?.new_password || "");
    const pharmacyId = Number(req.params.id);

    if (!oldPassword || !newPassword) {
      await connection.rollback();
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
    }

    if (newPassword.length < 6) {
      await connection.rollback();
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caracteres" });
    }

    // Get user_id from pharmacie — password lives only in users table
    const [pharmRows] = await connection.execute(
      "SELECT user_id FROM pharmacie WHERE id_pharmacie = ? LIMIT 1",
      [pharmacyId],
    );
    if (pharmRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Pharmacie non trouvee" });
    }
    const userId = pharmRows[0].user_id;

    const [userRows] = await connection.execute(
      "SELECT password FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const match = await bcrypt.compare(oldPassword, userRows[0].password);
    if (!match) {
      await connection.rollback();
      return res.status(400).json({ error: "Ancien mot de passe incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update only in users — single source of truth
    await connection.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, userId],
    );

    await connection.commit();
    return res.json({ message: "Mot de passe mis a jour avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Error changing pharmacy password:", error);
    return res.status(500).json({ error: "Erreur lors du changement de mot de passe" });
  } finally {
    connection.release();
  }
};

export const toggleStatus = async (req, res) => {
  try {
    const active = Boolean(req.body?.active);
    const pharmacyId = Number(req.params.id);

    const [rows] = await db.execute("SELECT id_pharmacie FROM pharmacie WHERE id_pharmacie = ? LIMIT 1", [pharmacyId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvee" });
    }

    await db.execute("UPDATE pharmacie SET is_active = ? WHERE id_pharmacie = ?", [active ? 1 : 0, pharmacyId]);
    const connection = await db.getConnection();
    try {
      const pharmacy = await getPharmacyById(connection, pharmacyId);
      return res.json({
        message: `Pharmacie ${active ? "activee" : "desactivee"} avec succes`,
        pharmacy: shapePharmacy(pharmacy),
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error toggling pharmacy status:", error);
    return res.status(500).json({ error: "Erreur lors du changement de statut" });
  }
};

export const getAllPharmacies = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie, is_active, created_at
       FROM pharmacie
       ORDER BY created_at DESC`,
    );

    return res.json(rows.map(shapePharmacy));
  } catch (error) {
    console.error("Error getting all pharmacies:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation des pharmacies" });
  }
};

export const searchPublicPharmacies = async (req, res) => {
  try {
    const query = String(req.query?.query || "").trim();
    const name = String(req.query?.name || "").trim();
    const city = String(req.query?.city || "").trim();
    const address = String(req.query?.address || "").trim();
    const limit = Math.max(1, Math.min(24, Number(req.query?.limit || 12)));

    const params = [];
    const conditions = ["is_active = 1"];

    if (query) {
      conditions.push(
        "(nom_pharmacie LIKE ? OR president_pharmacie LIKE ? OR telephone LIKE ? OR email LIKE ? OR IFNULL(address_line, '') LIKE ? OR IFNULL(city, '') LIKE ?)",
      );
      params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
    }

    if (name) {
      conditions.push("nom_pharmacie LIKE ?");
      params.push(`%${name}%`);
    }

    if (city) {
      conditions.push("(IFNULL(city, '') LIKE ? OR IFNULL(address_line, '') LIKE ?)");
      params.push(`%${city}%`, `%${city}%`);
    }

    if (address) {
      conditions.push("(IFNULL(address_line, '') LIKE ? OR IFNULL(city, '') LIKE ?)");
      params.push(`%${address}%`, `%${address}%`);
    }

    params.push(limit);

    const [rows] = await db.execute(
      `SELECT id_pharmacie, nom_pharmacie, telephone, email, president_pharmacie,
              address_line, city, pharmacy_type, opening_hours_json, latitude, longitude
       FROM pharmacie
       WHERE ${conditions.join(" AND ")}
       ORDER BY nom_pharmacie ASC
       LIMIT ?`,
      params,
    );

    return res.json({
      success: true,
      count: rows.length,
      pharmacies: rows.map(shapePublicPharmacy),
    });
  } catch (error) {
    console.error("Error searching public pharmacies:", error);
    return res.status(500).json({ error: "Erreur lors de la recherche des pharmacies" });
  }
};

export const deletePharmacy = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacyId = Number(req.params.id);
    await connection.beginTransaction();

    // Get user_id — cascade on users FK handles pharmacie deletion
    const [pharmRow] = await connection.execute(
      "SELECT user_id FROM pharmacie WHERE id_pharmacie = ? LIMIT 1",
      [pharmacyId],
    );
    if (pharmRow.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Pharmacie non trouvee" });
    }
    await connection.execute("DELETE FROM users WHERE id = ?", [pharmRow[0].user_id]);

    await connection.commit();
    return res.json({ message: "Pharmacie et compte utilisateur supprimes avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting pharmacy:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression" });
  } finally {
    connection.release();
  }
};

export const updatePublicProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ error: "Profil pharmacien invalide" });
    }

    const { pharmacy_type, opening_hours, address_line, city, latitude, longitude } = req.body;

    const validTypes = ["day", "night", "both"];
    const type = validTypes.includes(pharmacy_type) ? pharmacy_type : "day";
    const openingHoursJson = opening_hours ? JSON.stringify(opening_hours) : null;
    const lat = latitude != null && latitude !== "" ? Number(latitude) : null;
    const lng = longitude != null && longitude !== "" ? Number(longitude) : null;

    await connection.execute(
      `UPDATE pharmacie
       SET pharmacy_type = ?, opening_hours_json = ?, address_line = ?, city = ?,
           latitude = ?, longitude = ?
       WHERE id_pharmacie = ?`,
      [type, openingHoursJson, address_line || null, city || null, lat, lng, pharmacy.id_pharmacie],
    );

    const updated = await getPharmacyById(connection, pharmacy.id_pharmacie);
    return res.json({ success: true, message: "Profil public mis a jour avec succes", profile: shapePharmacy(updated) });
  } catch (error) {
    console.error("Error updating public profile:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour du profil public" });
  } finally {
    connection.release();
  }
};

export const updatePharmacy = updateProfile;
export const togglePharmacyStatus = toggleStatus;

export const getMyDashboard = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ error: "Profil pharmacien invalide" });
    }

    const [stockRows] = await connection.execute(
      `SELECT id, nom, quantite, prix, seuil_alerte, updated_at
       FROM medicaments_stock
       WHERE id_pharmacie = ?
       ORDER BY updated_at DESC`,
      [pharmacy.id_pharmacie],
    );
    const [demandeRows] = await connection.execute(
      `SELECT id, nom_medicament, quantite, status, created_at, response_note
       FROM demandes
       WHERE pharmacie_id = ?
       ORDER BY created_at DESC`,
      [pharmacy.id_pharmacie],
    );

    const rupture = stockRows.filter((item) => Number(item.quantite || 0) <= 0).length;
    const faibleStock = stockRows.filter(
      (item) => Number(item.quantite || 0) > 0 && Number(item.quantite || 0) <= Number(item.seuil_alerte || 10),
    ).length;

    const recentStock = stockRows
      .map((item) => ({
        ...item,
        quantite: Number(item.quantite || 0),
        seuil_alerte: Number(item.seuil_alerte || 10),
        statut:
          Number(item.quantite || 0) <= 0
            ? "rupture"
            : Number(item.quantite || 0) <= Number(item.seuil_alerte || 10)
              ? "faible_stock"
              : "disponible",
      }))
      .sort((left, right) => left.quantite - right.quantite)
      .slice(0, 5);

    return res.json({
      success: true,
      stats: {
        medicaments_en_stock: stockRows.length,
        ruptures: rupture,
        demandes_envoyees: demandeRows.length,
        faible_stock: faibleStock,
      },
      recent_stock: recentStock,
      recent_demandes: demandeRows.slice(0, 5),
    });
  } catch (error) {
    console.error("Error loading pharmacy dashboard:", error);
    return res.status(500).json({ error: "Erreur lors du chargement du dashboard pharmacien" });
  } finally {
    connection.release();
  }
};

export default {
  createPharmacy,
  getProfile,
  getMyProfile,
  updateProfile,
  updateMyProfile,
  updatePublicProfile,
  changePassword,
  toggleStatus,
  getAllPharmacies,
  searchPublicPharmacies,
  deletePharmacy,
  updatePharmacy,
  togglePharmacyStatus,
  getMyDashboard,
};
