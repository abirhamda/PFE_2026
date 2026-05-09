import db from "../db.js";

export const getNotificationsByFournisseur = async (req, res) => {
  try {
    const fournisseurId = Number(req.params.fournisseurId);

    const [rows] = await db.execute(
      `SELECT
         n.id,
         n.nom_medicament,
         n.quantite,
         n.message,
         n.status,
         n.created_at,
         n.pharmacien_id,
         n.fournisseur_id,
         n.demande_id,
         p.nom_pharmacie,
         p.president_pharmacie
       FROM notifications n
       LEFT JOIN pharmacie p ON n.pharmacien_id = p.id_pharmacie
       WHERE n.fournisseur_id = ?
       ORDER BY n.created_at DESC`,
      [fournisseurId],
    );

    res.json(rows);
  } catch (error) {
    console.error("Erreur recuperation notifications fournisseur:", error);
    res.status(500).json({ error: "Erreur lors de la recuperation des notifications", details: error.message });
  }
};

export const updateNotificationStatus = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    const status = String(req.body?.status || "").trim();

    const validStatuses = ["en_attente", "acceptee", "refusee", "recue"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Statut invalide" });
    }

    const [result] = await db.execute("UPDATE notifications SET status = ? WHERE id = ?", [status, notificationId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Notification non trouvee" });
    }

    res.json({ message: "Statut mis a jour avec succes" });
  } catch (error) {
    console.error("Erreur mise a jour notification:", error);
    res.status(500).json({ error: "Erreur lors de la mise a jour du statut", details: error.message });
  }
};

export const createNotification = async (req, res) => {
  try {
    const nom_medicament = String(req.body?.nom_medicament || "").trim();
    const quantite = Number(req.body?.quantite);
    const pharmacien_id = Number(req.body?.pharmacien_id);
    const fournisseur_id = Number(req.body?.fournisseur_id);
    const message = req.body?.message ? String(req.body.message).trim() : "";
    const demande_id = req.body?.demande_id ? Number(req.body.demande_id) : null;

    if (!nom_medicament || !Number.isFinite(quantite) || quantite <= 0 || !pharmacien_id || !fournisseur_id) {
      return res.status(400).json({ error: "Tous les champs obligatoires doivent etre remplis" });
    }

    const [result] = await db.execute(
      `INSERT INTO notifications
       (nom_medicament, quantite, pharmacien_id, fournisseur_id, message, status, demande_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'en_attente', ?, NOW())`,
      [nom_medicament, quantite, pharmacien_id, fournisseur_id, message, demande_id],
    );

    res.status(201).json({ message: "Notification creee avec succes", id: result.insertId });
  } catch (error) {
    console.error("Erreur creation notification:", error);
    res.status(500).json({ error: "Erreur lors de la creation de la notification", details: error.message });
  }
};

export const getAllNotifications = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT
         n.id,
         n.nom_medicament,
         n.quantite,
         n.message,
         n.status,
         n.created_at,
         n.pharmacien_id,
         n.fournisseur_id,
         n.demande_id,
         p.nom_pharmacie,
         p.president_pharmacie
       FROM notifications n
       LEFT JOIN pharmacie p ON n.pharmacien_id = p.id_pharmacie
       ORDER BY n.created_at DESC`,
    );

    res.json(rows);
  } catch (error) {
    console.error("Erreur recuperation notifications:", error);
    res.status(500).json({ error: "Erreur lors de la recuperation des notifications", details: error.message });
  }
};

export default {
  getNotificationsByFournisseur,
  updateNotificationStatus,
  createNotification,
  getAllNotifications,
};
