import db from "../db.js";

export const getDemandesByPharmacie = async (req, res) => {
  const pharmacieId = Number(req.params.id);

  try {
    const [demandes] = await db.execute(
      `SELECT
         d.id,
         d.nom_medicament,
         d.quantite,
         d.status,
         d.date_acceptation,
         d.created_at,
         d.supplier_id,
         COALESCE(CONCAT(s.prenom, ' ', s.nom), 'Non specifie') AS nom_fournisseur,
         s.email AS fournisseur_email,
         s.telephone AS fournisseur_telephone
       FROM demandes d
       LEFT JOIN suppliers s ON d.supplier_id = s.id
       WHERE d.pharmacie_id = ?
       ORDER BY d.created_at DESC`,
      [pharmacieId],
    );

    const stats = {
      total: demandes.length,
      en_attente: demandes.filter((d) => d.status === "en_attente").length,
      acceptees: demandes.filter((d) => d.status === "acceptee").length,
      recues: demandes.filter((d) => d.status === "recue").length,
      refusees: demandes.filter((d) => d.status === "refusee").length,
    };

    res.status(200).json({ success: true, demandes, stats });
  } catch (error) {
    console.error("Erreur recuperation demandes:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la recuperation des demandes",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const testConnection = async (_req, res) => {
  try {
    const [result] = await db.execute("SELECT NOW() as current_time, DATABASE() as database_name");

    res.status(200).json({
      success: true,
      message: "API and database connection working",
      data: result[0],
    });
  } catch (error) {
    console.error("Test connection failed:", error);
    res.status(500).json({
      success: false,
      error: "Database connection failed",
      details: error.message,
    });
  }
};

export const updateDemandeStatus = async (req, res) => {
  const demandeId = Number(req.params.id);
  const status = String(req.body?.status || "").trim();

  const allowedStatuses = ["en_attente", "acceptee", "recue", "non_livree", "refusee"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: "Statut invalide fourni" });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [existingRows] = await connection.execute(
      "SELECT id, nom_medicament, quantite, pharmacie_id FROM demandes WHERE id = ?",
      [demandeId],
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: "Demande non trouvee" });
    }

    if (status === "acceptee") {
      await connection.execute("UPDATE demandes SET status = ?, date_acceptation = NOW() WHERE id = ?", [status, demandeId]);
    } else {
      await connection.execute("UPDATE demandes SET status = ? WHERE id = ?", [status, demandeId]);
    }

    if (status === "recue") {
      const demande = existingRows[0];

      await connection.execute(
        `INSERT INTO medicaments_stock (nom, quantite, id_pharmacie, created_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE quantite = quantite + VALUES(quantite)`,
        [demande.nom_medicament, demande.quantite, demande.pharmacie_id],
      );
    }

    await connection.commit();

    res.status(200).json({ success: true, message: "Statut de la demande mis a jour avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Erreur mise a jour statut demande:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la mise a jour du statut",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    connection.release();
  }
};

export const createDemande = async (req, res) => {
  const pharmacie_id = Number(req.body?.pharmacie_id);
  const supplier_id = Number(req.body?.supplier_id);
  const nom_medicament = String(req.body?.nom_medicament || "").trim();
  const quantite = Number(req.body?.quantite);

  if (!pharmacie_id || !supplier_id || !nom_medicament || !Number.isFinite(quantite) || quantite <= 0) {
    return res.status(400).json({ success: false, error: "Tous les champs sont obligatoires" });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [demandeResult] = await connection.execute(
      `INSERT INTO demandes (pharmacie_id, supplier_id, nom_medicament, quantite, status, created_at)
       VALUES (?, ?, ?, ?, 'en_attente', NOW())`,
      [pharmacie_id, supplier_id, nom_medicament, quantite],
    );

    const demandeId = demandeResult.insertId;

    await connection.execute(
      `INSERT INTO notifications
       (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'en_attente', ?, NOW())`,
      [nom_medicament, quantite, pharmacie_id, supplier_id, "Nouvelle demande de medicament recue", demandeId],
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Demande creee et notification envoyee avec succes",
      demande_id: demandeId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Erreur creation demande:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la creation de la demande",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  } finally {
    connection.release();
  }
};

export default {
  getDemandesByPharmacie,
  testConnection,
  updateDemandeStatus,
  createDemande,
};

