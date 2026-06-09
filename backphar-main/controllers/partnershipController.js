import db from "../db.js";
import { resolvePharmacyContext, resolveSupplierContext } from "../utils/userContext.js";

const buildStatus = (row) => {
  if (Number(row?.is_partner) === 1) return "partenaire";
  if (row?.request_status) return row.request_status;
  return "disponible";
};

export const getSupplierDirectoryForPharmacy = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ success: false, error: "Profil pharmacien invalide" });
    }

    const search = String(req.query?.search || "").trim().toLowerCase();
    const params = [pharmacy.id_pharmacie, pharmacy.id_pharmacie];
    let whereClause = "";

    if (search) {
      whereClause =
        "WHERE LOWER(CONCAT_WS(' ', s.nom, s.prenom, s.email, s.telephone)) LIKE ?";
      params.push(`%${search}%`);
    }

    const [rows] = await connection.execute(
      `SELECT
         s.id,
         s.nom,
         s.prenom,
         s.email,
         s.telephone,
         s.is_active,
         s.created_at,
         pr.id AS request_id,
         pr.message AS request_message,
         pr.response_note,
         pr.status AS request_status,
         pr.created_at AS request_created_at,
         pr.responded_at,
         CASE WHEN sp.supplier_id IS NULL THEN 0 ELSE 1 END AS is_partner
       FROM suppliers s
       LEFT JOIN supplier_partnership_requests pr
         ON pr.supplier_id = s.id AND pr.pharmacie_id = ?
       LEFT JOIN supplier_pharmacie sp
         ON sp.supplier_id = s.id AND sp.pharmacie_id = ?
       ${whereClause}
       ORDER BY
         CASE WHEN sp.supplier_id IS NULL THEN 1 ELSE 0 END,
         s.prenom ASC,
         s.nom ASC`,
      params,
    );

    const items = rows.map((row) => ({
      ...row,
      partnership_status: buildStatus(row),
      is_active: Boolean(row.is_active),
      is_partner: Number(row.is_partner) === 1,
    }));

    const stats = {
      total: items.length,
      partenaires: items.filter((item) => item.partnership_status === "partenaire").length,
      en_attente: items.filter((item) => item.partnership_status === "en_attente").length,
      refuses: items.filter((item) => item.partnership_status === "refusee").length,
    };

    return res.json({ success: true, pharmacy, items, stats });
  } catch (error) {
    console.error("Erreur recuperation annuaire fournisseurs:", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la recuperation des fournisseurs" });
  } finally {
    connection.release();
  }
};

export const createPartnershipRequest = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ success: false, error: "Profil pharmacien invalide" });
    }

    const supplierId = Number(req.body?.supplier_id);
    const message = req.body?.message ? String(req.body.message).trim() : "";
    if (!supplierId) {
      return res.status(400).json({ success: false, error: "supplier_id est obligatoire" });
    }

    const [supplierRows] = await connection.execute("SELECT id FROM suppliers WHERE id = ? LIMIT 1", [supplierId]);
    if (supplierRows.length === 0) {
      return res.status(404).json({ success: false, error: "Fournisseur introuvable" });
    }

    const [partnerRows] = await connection.execute(
      "SELECT supplier_id FROM supplier_pharmacie WHERE supplier_id = ? AND pharmacie_id = ? LIMIT 1",
      [supplierId, pharmacy.id_pharmacie],
    );
    if (partnerRows.length > 0) {
      return res.status(409).json({ success: false, error: "Ce fournisseur est deja partenaire" });
    }

    await connection.execute(
      `INSERT INTO supplier_partnership_requests
       (pharmacie_id, supplier_id, message, status, response_note, created_at, updated_at, responded_at)
       VALUES (?, ?, ?, 'en_attente', NULL, NOW(), NOW(), NULL)
       ON DUPLICATE KEY UPDATE
         message = VALUES(message),
         status = 'en_attente',
         response_note = NULL,
         updated_at = NOW(),
         responded_at = NULL`,
      [pharmacy.id_pharmacie, supplierId, message],
    );

    const [rows] = await connection.execute(
      `SELECT id, pharmacie_id, supplier_id, message, status, response_note, created_at, updated_at, responded_at
       FROM supplier_partnership_requests
       WHERE pharmacie_id = ? AND supplier_id = ?
       LIMIT 1`,
      [pharmacy.id_pharmacie, supplierId],
    );

    return res.status(201).json({
      success: true,
      message: "Demande de partenariat envoyee avec succes",
      request: rows[0],
    });
  } catch (error) {
    console.error("Erreur creation demande partenariat:", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la creation de la demande de partenariat" });
  } finally {
    connection.release();
  }
};

export const getIncomingPartnershipRequests = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ success: false, error: "Profil fournisseur invalide" });
    }

    const [rows] = await connection.execute(
      `SELECT
         pr.id,
         pr.pharmacie_id,
         pr.supplier_id,
         pr.message,
         pr.status,
         pr.response_note,
         pr.created_at,
         pr.updated_at,
         pr.responded_at,
         p.nom_pharmacie,
         p.email AS pharmacie_email,
         p.telephone AS pharmacie_telephone,
         p.president_pharmacie,
         p.is_active
       FROM supplier_partnership_requests pr
       INNER JOIN pharmacie p ON p.id_pharmacie = pr.pharmacie_id
       WHERE pr.supplier_id = ?
       ORDER BY pr.created_at DESC`,
      [supplier.id],
    );

    const stats = {
      total: rows.length,
      en_attente: rows.filter((item) => item.status === "en_attente").length,
      acceptees: rows.filter((item) => item.status === "acceptee").length,
      refusees: rows.filter((item) => item.status === "refusee").length,
    };

    return res.json({ success: true, items: rows, stats });
  } catch (error) {
    console.error("Erreur recuperation demandes partenariat:", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la recuperation des demandes de partenariat" });
  } finally {
    connection.release();
  }
};

export const respondToPartnershipRequest = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ success: false, error: "Profil fournisseur invalide" });
    }

    const requestId = Number(req.params.id);
    const status = String(req.body?.status || "").trim();
    const responseNote = req.body?.response_note ? String(req.body.response_note).trim() : null;

    if (!["acceptee", "refusee"].includes(status)) {
      return res.status(400).json({ success: false, error: "Statut invalide" });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT id, pharmacie_id, supplier_id, status
       FROM supplier_partnership_requests
       WHERE id = ? AND supplier_id = ?
       LIMIT 1`,
      [requestId, supplier.id],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Demande de partenariat introuvable" });
    }

    const request = rows[0];

    await connection.execute(
      `UPDATE supplier_partnership_requests
       SET status = ?, response_note = ?, responded_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [status, responseNote, requestId],
    );

    if (status === "acceptee") {
      await connection.execute(
        `INSERT IGNORE INTO supplier_pharmacie (supplier_id, pharmacie_id, created_at)
         VALUES (?, ?, NOW())`,
        [request.supplier_id, request.pharmacie_id],
      );
    }

    await connection.commit();
    return res.json({ success: true, message: "Demande de partenariat traitee avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Erreur reponse partenariat:", error);
    return res.status(500).json({ success: false, error: "Erreur lors du traitement de la demande de partenariat" });
  } finally {
    connection.release();
  }
};

export default {
  getSupplierDirectoryForPharmacy,
  createPartnershipRequest,
  getIncomingPartnershipRequests,
  respondToPartnershipRequest,
};
