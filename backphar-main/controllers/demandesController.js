import db from "../db.js";
import {
  canAccessPharmacy,
  canAccessSupplier,
  normalizeRole,
  resolvePharmacyContext,
  resolveSupplierContext,
} from "../utils/userContext.js";

const ALLOWED_STATUSES = ["en_attente", "acceptee", "recue", "non_livree", "refusee"];

const mapStats = (demandes) => ({
  total: demandes.length,
  en_attente: demandes.filter((item) => item.status === "en_attente").length,
  acceptees: demandes.filter((item) => item.status === "acceptee").length,
  recues: demandes.filter((item) => item.status === "recue").length,
  non_livree: demandes.filter((item) => item.status === "non_livree").length,
  refusees: demandes.filter((item) => item.status === "refusee").length,
});

const buildDemandeQuery = (filterField) => `
  SELECT
    d.id,
    d.pharmacie_id,
    d.supplier_id,
    d.nom_medicament,
    d.quantite,
    d.status,
    d.response_note,
    d.date_acceptation,
    d.created_at,
    d.updated_at,
    p.nom_pharmacie,
    p.email AS pharmacie_email,
    p.telephone AS pharmacie_telephone,
    p.president_pharmacie,
    COALESCE(CONCAT(s.prenom, ' ', s.nom), 'Non specifie') AS nom_fournisseur,
    s.email AS fournisseur_email,
    s.telephone AS fournisseur_telephone
  FROM demandes d
  LEFT JOIN pharmacie p ON p.id_pharmacie = d.pharmacie_id
  LEFT JOIN suppliers s ON s.id = d.supplier_id
  WHERE d.${filterField} = ?
  ORDER BY d.created_at DESC
`;

const upsertPharmacyStockFromDemand = async (connection, demande) => {
  await connection.execute(
    `INSERT INTO medicaments_stock (nom, quantite, id_pharmacie, seuil_alerte, created_at, updated_at)
     VALUES (?, ?, ?, 10, NOW(), NOW())
     ON DUPLICATE KEY UPDATE quantite = quantite + VALUES(quantite), updated_at = NOW()`,
    [demande.nom_medicament, demande.quantite, demande.pharmacie_id],
  );
};

const updateNotificationMirror = async (connection, demandeId, status) => {
  await connection.execute(
    `UPDATE notifications
     SET status = ?
     WHERE demande_id = ?`,
    [status, demandeId],
  );
};

export const getDemandesByPharmacie = async (req, res) => {
  const pharmacyId = Number(req.params.id);
  const connection = await db.getConnection();

  try {
    const allowed = await canAccessPharmacy(connection, req.user, pharmacyId);
    if (!allowed) {
      return res.status(403).json({ success: false, error: "Acces refuse a cette pharmacie" });
    }

    const [demandes] = await connection.execute(buildDemandeQuery("pharmacie_id"), [pharmacyId]);
    return res.status(200).json({ success: true, demandes, stats: mapStats(demandes) });
  } catch (error) {
    console.error("Erreur recuperation demandes pharmacie:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la recuperation des demandes" });
  } finally {
    connection.release();
  }
};

export const getMyDemandes = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ success: false, error: "Profil pharmacien invalide" });
    }

    const [demandes] = await connection.execute(buildDemandeQuery("pharmacie_id"), [pharmacy.id_pharmacie]);
    return res.status(200).json({
      success: true,
      pharmacy,
      demandes,
      stats: mapStats(demandes),
    });
  } catch (error) {
    console.error("Erreur recuperation de mes demandes:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la recuperation des demandes" });
  } finally {
    connection.release();
  }
};

export const getMySupplierDemandes = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ success: false, error: "Profil fournisseur invalide" });
    }

    const [demandes] = await connection.execute(buildDemandeQuery("supplier_id"), [supplier.id]);
    return res.status(200).json({
      success: true,
      supplier,
      demandes,
      stats: mapStats(demandes),
    });
  } catch (error) {
    console.error("Erreur recuperation demandes fournisseur:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la recuperation des demandes" });
  } finally {
    connection.release();
  }
};

export const testConnection = async (_req, res) => {
  try {
    const [result] = await db.execute("SELECT NOW() as current_time, DATABASE() as database_name");
    return res.status(200).json({
      success: true,
      message: "API and database connection working",
      data: result[0],
    });
  } catch (error) {
    console.error("Test connection failed:", error);
    return res.status(500).json({ success: false, error: "Database connection failed", details: error.message });
  }
};

export const updateDemandeStatus = async (req, res) => {
  const demandeId = Number(req.params.id);
  const status = String(req.body?.status || "").trim();
  const responseNote = req.body?.response_note ? String(req.body.response_note).trim() : null;
  const role = normalizeRole(req.user?.role);

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: "Statut invalide fourni" });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      `SELECT id, nom_medicament, quantite, pharmacie_id, supplier_id, status
       FROM demandes
       WHERE id = ?
       LIMIT 1`,
      [demandeId],
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Demande non trouvee" });
    }

    const demande = existingRows[0];

    if (role === "supplier") {
      const allowed = await canAccessSupplier(connection, req.user, demande.supplier_id);
      if (!allowed) {
        await connection.rollback();
        return res.status(403).json({ success: false, error: "Acces refuse a cette demande" });
      }

      if (!["en_attente", "acceptee", "refusee"].includes(status)) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: "Le fournisseur peut seulement accepter ou refuser la demande" });
      }
    }

    if (role === "pharmacist") {
      const allowed = await canAccessPharmacy(connection, req.user, demande.pharmacie_id);
      if (!allowed) {
        await connection.rollback();
        return res.status(403).json({ success: false, error: "Acces refuse a cette demande" });
      }

      if (!["recue", "non_livree"].includes(status)) {
        await connection.rollback();
        return res.status(400).json({ success: false, error: "Le pharmacien peut seulement confirmer la reception ou la non livraison" });
      }
    }

    if (status === "acceptee") {
      await connection.execute(
        `UPDATE demandes
         SET status = ?, response_note = ?, date_acceptation = NOW(), updated_at = NOW()
         WHERE id = ?`,
        [status, responseNote, demandeId],
      );
    } else {
      await connection.execute(
        `UPDATE demandes
         SET status = ?, response_note = ?, updated_at = NOW()
         WHERE id = ?`,
        [status, responseNote, demandeId],
      );
    }

    if (status === "recue") {
      await upsertPharmacyStockFromDemand(connection, demande);
    }

    await updateNotificationMirror(connection, demandeId, status);
    await connection.commit();

    return res.status(200).json({ success: true, message: "Statut de la demande mis a jour avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Erreur mise a jour statut demande:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la mise a jour du statut" });
  } finally {
    connection.release();
  }
};

export const createDemande = async (req, res) => {
  const connection = await db.getConnection();
  let hasTransaction = false;

  try {
    const pharmacy = await resolvePharmacyContext(connection, req.user);
    if (!pharmacy) {
      return res.status(403).json({ success: false, error: "Profil pharmacien invalide" });
    }

    const supplierId = Number(req.body?.supplier_id);
    const nomMedicament = String(req.body?.nom_medicament || "").trim();
    const quantite = Number(req.body?.quantite);
    const message = req.body?.message ? String(req.body.message).trim() : "Nouvelle demande de reapprovisionnement";

    if (!supplierId || !nomMedicament || !Number.isFinite(quantite) || quantite <= 0) {
      return res.status(400).json({ success: false, error: "Tous les champs sont obligatoires" });
    }

    const [supplierRows] = await connection.execute("SELECT id FROM suppliers WHERE id = ? LIMIT 1", [supplierId]);
    if (supplierRows.length === 0) {
      return res.status(404).json({ success: false, error: "Fournisseur introuvable" });
    }

    await connection.beginTransaction();
    hasTransaction = true;

    const [demandeResult] = await connection.execute(
      `INSERT INTO demandes (pharmacie_id, supplier_id, nom_medicament, quantite, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'en_attente', NOW(), NOW())`,
      [pharmacy.id_pharmacie, supplierId, nomMedicament, quantite],
    );

    const demandeId = demandeResult.insertId;

    await connection.execute(
      `INSERT INTO notifications
       (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'en_attente', ?, NOW())`,
      [nomMedicament, quantite, pharmacy.id_pharmacie, supplierId, message, demandeId],
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Demande creee et notification envoyee avec succes",
      demande_id: demandeId,
    });
  } catch (error) {
    if (hasTransaction) {
      await connection.rollback();
    }
    console.error("Erreur creation demande:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la creation de la demande" });
  } finally {
    connection.release();
  }
};

export default {
  getDemandesByPharmacie,
  getMyDemandes,
  getMySupplierDemandes,
  testConnection,
  updateDemandeStatus,
  createDemande,
};
