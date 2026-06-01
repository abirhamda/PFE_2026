import db from "../db.js";
import { normalizeRole, resolvePharmacyContext } from "../utils/userContext.js";

const toStatus = (quantite, seuilAlerte) => {
  const stock = Number(quantite || 0);
  const threshold = Number(seuilAlerte || 0);

  if (stock <= 0) return "rupture";
  if (stock <= threshold) return "faible_stock";
  return "disponible";
};

const shapeStockRow = (row) => ({
  ...row,
  quantite: Number(row.quantite || 0),
  prix: row.prix === null ? null : Number(row.prix),
  seuil_alerte: Number(row.seuil_alerte || 10),
  statut_stock: toStatus(row.quantite, row.seuil_alerte),
});

const buildStats = (rows) => ({
  total_medicaments: rows.length,
  disponible: rows.filter((item) => item.statut_stock === "disponible").length,
  faible_stock: rows.filter((item) => item.statut_stock === "faible_stock").length,
  rupture: rows.filter((item) => item.statut_stock === "rupture").length,
  quantite_totale: rows.reduce((total, item) => total + Number(item.quantite || 0), 0),
});

const parsePositiveInteger = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : NaN;
};

const parseDecimal = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
};

const ensurePharmacyScope = async (connection, user) => {
  const role = normalizeRole(user?.role);
  if (role === "admin") {
    return { pharmacyId: Number(user?.entityId || 0) || null, isAdmin: true };
  }

  const pharmacy = await resolvePharmacyContext(connection, user);
  if (!pharmacy) {
    return null;
  }

  return { pharmacyId: Number(pharmacy.id_pharmacie), isAdmin: false, pharmacy };
};

export const getAllMedicaments = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const scope = await ensurePharmacyScope(connection, req.user);
    const requestedPharmacyId = Number(req.query?.pharmacy_id || 0);
    const search = String(req.query?.search || "").trim().toLowerCase();

    let pharmacyId = scope?.pharmacyId || null;
    if (scope?.isAdmin && requestedPharmacyId > 0) {
      pharmacyId = requestedPharmacyId;
    }

    let query =
      `SELECT id, id_pharmacie, nom, quantite, prix, seuil_alerte, created_at, updated_at
       FROM medicaments_stock`;
    const params = [];
    const filters = [];

    if (pharmacyId) {
      filters.push("id_pharmacie = ?");
      params.push(pharmacyId);
    }

    if (search) {
      filters.push("LOWER(nom) LIKE ?");
      params.push(`%${search}%`);
    }

    if (filters.length > 0) {
      query += ` WHERE ${filters.join(" AND ")}`;
    }

    query += " ORDER BY nom ASC";

    const [rows] = await connection.execute(query, params);
    const items = rows.map(shapeStockRow);
    return res.json({
      success: true,
      items,
      stats: buildStats(items),
    });
  } catch (error) {
    console.error("Erreur lors de la recuperation des medicaments:", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la recuperation du stock" });
  } finally {
    connection.release();
  }
};

export const createMedicament = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ success: false, error: "Profil pharmacien invalide" });
    }

    const nom = String(req.body?.nom || "").trim();
    const quantite = parsePositiveInteger(req.body?.quantite, 0);
    const seuilAlerte = parsePositiveInteger(req.body?.seuil_alerte, 10);
    const prix = parseDecimal(req.body?.prix, null);

    if (!nom) {
      return res.status(400).json({ success: false, error: "Le nom du medicament est obligatoire" });
    }
    if (Number.isNaN(quantite) || Number.isNaN(seuilAlerte) || Number.isNaN(prix)) {
      return res.status(400).json({ success: false, error: "Les valeurs numeriques sont invalides" });
    }

    const [result] = await connection.execute(
      `INSERT INTO medicaments_stock (id_pharmacie, nom, quantite, prix, seuil_alerte, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [pharmacy.id_pharmacie, nom, quantite, prix, seuilAlerte],
    );

    const [rows] = await connection.execute(
      `SELECT id, id_pharmacie, nom, quantite, prix, seuil_alerte, created_at, updated_at
       FROM medicaments_stock
       WHERE id = ?`,
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      message: "Medicament ajoute avec succes",
      item: shapeStockRow(rows[0]),
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout du medicament:", error);
    const duplicate = error?.code === "ER_DUP_ENTRY";
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      error: duplicate ? "Ce medicament existe deja dans votre stock" : "Erreur lors de l'ajout du medicament",
    });
  } finally {
    connection.release();
  }
};

export const updateMedicament = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ success: false, error: "Profil pharmacien invalide" });
    }

    const medicamentId = Number(req.params.id);
    const nom = String(req.body?.nom || "").trim();
    const quantite = parsePositiveInteger(req.body?.quantite, null);
    const seuilAlerte = parsePositiveInteger(req.body?.seuil_alerte, null);
    const prix = parseDecimal(req.body?.prix, null);

    const [existingRows] = await connection.execute(
      "SELECT id FROM medicaments_stock WHERE id = ? AND id_pharmacie = ? LIMIT 1",
      [medicamentId, pharmacy.id_pharmacie],
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: "Medicament introuvable" });
    }

    if (!nom) {
      return res.status(400).json({ success: false, error: "Le nom du medicament est obligatoire" });
    }
    if (Number.isNaN(quantite) || Number.isNaN(seuilAlerte) || Number.isNaN(prix)) {
      return res.status(400).json({ success: false, error: "Les valeurs numeriques sont invalides" });
    }

    await connection.execute(
      `UPDATE medicaments_stock
       SET nom = ?, quantite = ?, prix = ?, seuil_alerte = ?, updated_at = NOW()
       WHERE id = ? AND id_pharmacie = ?`,
      [nom, quantite ?? 0, prix, seuilAlerte ?? 10, medicamentId, pharmacy.id_pharmacie],
    );

    const [rows] = await connection.execute(
      `SELECT id, id_pharmacie, nom, quantite, prix, seuil_alerte, created_at, updated_at
       FROM medicaments_stock
       WHERE id = ?`,
      [medicamentId],
    );

    return res.json({
      success: true,
      message: "Medicament mis a jour avec succes",
      item: shapeStockRow(rows[0]),
    });
  } catch (error) {
    console.error("Erreur lors de la mise a jour du medicament:", error);
    const duplicate = error?.code === "ER_DUP_ENTRY";
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      error: duplicate ? "Un medicament avec ce nom existe deja dans votre stock" : "Erreur lors de la mise a jour du medicament",
    });
  } finally {
    connection.release();
  }
};

export const deleteMedicament = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ success: false, error: "Profil pharmacien invalide" });
    }

    const medicamentId = Number(req.params.id);
    const [result] = await connection.execute(
      "DELETE FROM medicaments_stock WHERE id = ? AND id_pharmacie = ?",
      [medicamentId, pharmacy.id_pharmacie],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Medicament introuvable" });
    }

    return res.json({ success: true, message: "Medicament supprime avec succes" });
  } catch (error) {
    console.error("Erreur lors de la suppression du medicament:", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la suppression du medicament" });
  } finally {
    connection.release();
  }
};

export const updateQuantite = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ success: false, error: "Profil pharmacien invalide" });
    }

    const medicamentId = Number(req.params.id);
    const quantite = parsePositiveInteger(req.body?.quantite, null);

    if (Number.isNaN(quantite) || quantite === null) {
      return res.status(400).json({ success: false, error: "Quantite invalide" });
    }

    const [result] = await connection.execute(
      `UPDATE medicaments_stock
       SET quantite = ?, updated_at = NOW()
       WHERE id = ? AND id_pharmacie = ?`,
      [quantite, medicamentId, pharmacy.id_pharmacie],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Medicament introuvable" });
    }

    const [rows] = await connection.execute(
      `SELECT id, id_pharmacie, nom, quantite, prix, seuil_alerte, created_at, updated_at
       FROM medicaments_stock
       WHERE id = ?`,
      [medicamentId],
    );

    return res.json({
      success: true,
      message: "Quantite mise a jour avec succes",
      item: shapeStockRow(rows[0]),
    });
  } catch (error) {
    console.error("Erreur mise a jour quantite:", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la mise a jour de la quantite" });
  } finally {
    connection.release();
  }
};

export const adjustQuantite = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ success: false, error: "Profil pharmacien invalide" });
    }

    const medicamentId = Number(req.params.id);
    const delta = Number(req.body?.delta);
    if (!Number.isFinite(delta) || Number.isNaN(delta)) {
      return res.status(400).json({ success: false, error: "Delta invalide" });
    }

    const [rows] = await connection.execute(
      `SELECT id, quantite
       FROM medicaments_stock
       WHERE id = ? AND id_pharmacie = ?
       LIMIT 1`,
      [medicamentId, pharmacy.id_pharmacie],
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Medicament introuvable" });
    }

    const nextQuantity = Math.max(0, Number(rows[0].quantite || 0) + delta);

    await connection.execute(
      `UPDATE medicaments_stock
       SET quantite = ?, updated_at = NOW()
       WHERE id = ?`,
      [nextQuantity, medicamentId],
    );

    const [updatedRows] = await connection.execute(
      `SELECT id, id_pharmacie, nom, quantite, prix, seuil_alerte, created_at, updated_at
       FROM medicaments_stock
       WHERE id = ?`,
      [medicamentId],
    );

    return res.json({
      success: true,
      message: "Stock ajuste avec succes",
      item: shapeStockRow(updatedRows[0]),
    });
  } catch (error) {
    console.error("Erreur ajustement quantite:", error);
    return res.status(500).json({ success: false, error: "Erreur lors de l'ajustement du stock" });
  } finally {
    connection.release();
  }
};

export default {
  getAllMedicaments,
  createMedicament,
  updateMedicament,
  deleteMedicament,
  updateQuantite,
  adjustQuantite,
};
