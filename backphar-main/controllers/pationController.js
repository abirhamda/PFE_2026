import bcrypt from "bcryptjs";
import db from "../db.js";

const validatePationPayload = (payload, isCreate = true) => {
  const requiredFields = ["nom", "prenom", "email", "cin"];
  if (isCreate) requiredFields.push("password");

  const missing = requiredFields.find((field) => !String(payload?.[field] || "").trim());
  if (missing) {
    return { valid: false, error: `Le champ ${missing} est obligatoire` };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(payload.email).trim())) {
    return { valid: false, error: "Format d'email invalide" };
  }

  if (isCreate && String(payload.password).length < 6) {
    return { valid: false, error: "Le mot de passe doit contenir au moins 6 caracteres" };
  }

  if (String(payload.cin).trim().length < 6) {
    return { valid: false, error: "Le CIN doit contenir au moins 6 caracteres" };
  }

  return { valid: true };
};

export const createPation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const validation = validatePationPayload(req.body, true);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const nom = String(req.body.nom).trim();
    const prenom = String(req.body.prenom).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const cin = String(req.body.cin).trim();
    const telephone = req.body.telephone ? String(req.body.telephone).trim() : null;
    const date_naissance = req.body.date_naissance || null;

    await connection.beginTransaction();

    const [existingPationByEmail] = await connection.execute("SELECT id FROM pations WHERE email = ?", [email]);
    if (existingPationByEmail.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Un pation avec cet email existe deja" });
    }

    const [existingPationByCin] = await connection.execute("SELECT id FROM pations WHERE cin = ?", [cin]);
    if (existingPationByCin.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Un pation avec ce CIN existe deja" });
    }

    const [existingUser] = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Un compte utilisateur avec cet email existe deja" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [email, hashedPassword, "pation"]);

    const [result] = await connection.execute(
      `INSERT INTO pations (nom, prenom, email, password, cin, telephone, date_naissance, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [nom, prenom, email, hashedPassword, cin, telephone, date_naissance],
    );

    const [newRows] = await connection.execute(
      `SELECT id, nom, prenom, email, cin, telephone, date_naissance, is_active, created_at
       FROM pations WHERE id = ?`,
      [result.insertId],
    );

    await connection.commit();

    return res.status(201).json({
      message: "Pation cree avec succes",
      pation: newRows[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating pation:", error);
    return res.status(500).json({ error: "Erreur serveur lors de la creation", details: error.message });
  } finally {
    connection.release();
  }
};

export const getAllPations = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, telephone, date_naissance, is_active, created_at
       FROM pations ORDER BY created_at DESC`,
    );

    res.json(rows);
  } catch (error) {
    console.error("Error getting pations:", error);
    res.status(500).json({ error: "Erreur lors de la recuperation des pations", details: error.message });
  }
};

export const getPationById = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, telephone, date_naissance, is_active, created_at
       FROM pations WHERE id = ?`,
      [req.params.id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pation non trouve" });
    }

    return res.json({ success: true, pation: rows[0] });
  } catch (error) {
    console.error("Error getting pation:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation", details: error.message });
  }
};

export const updatePation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const validation = validatePationPayload(req.body, false);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const pationId = Number(req.params.id);
    const nom = String(req.body.nom).trim();
    const prenom = String(req.body.prenom).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const cin = String(req.body.cin).trim();
    const telephone = req.body.telephone ? String(req.body.telephone).trim() : null;
    const date_naissance = req.body.date_naissance || null;

    await connection.beginTransaction();

    const [existingRows] = await connection.execute("SELECT id, email FROM pations WHERE id = ?", [pationId]);
    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Pation non trouve" });
    }

    const oldEmail = existingRows[0].email;

    const [emailExists] = await connection.execute("SELECT id FROM pations WHERE email = ? AND id <> ?", [email, pationId]);
    if (emailExists.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Un pation avec cet email existe deja" });
    }

    const [cinExists] = await connection.execute("SELECT id FROM pations WHERE cin = ? AND id <> ?", [cin, pationId]);
    if (cinExists.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Un pation avec ce CIN existe deja" });
    }

    await connection.execute(
      `UPDATE pations
       SET nom = ?, prenom = ?, email = ?, cin = ?, telephone = ?, date_naissance = ?
       WHERE id = ?`,
      [nom, prenom, email, cin, telephone, date_naissance, pationId],
    );

    if (email !== oldEmail) {
      await connection.execute("UPDATE users SET email = ? WHERE email = ? AND role = ?", [email, oldEmail, "pation"]);
    }

    const [updatedRows] = await connection.execute(
      `SELECT id, nom, prenom, email, cin, telephone, date_naissance, is_active, created_at
       FROM pations WHERE id = ?`,
      [pationId],
    );

    await connection.commit();

    return res.json({ message: "Pation mis a jour avec succes", pation: updatedRows[0] });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating pation:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour", details: error.message });
  } finally {
    connection.release();
  }
};

export const changePationPassword = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const pationId = Number(req.params.id);
    const oldPassword = String(req.body.old_password || "");
    const newPassword = String(req.body.new_password || "");

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caracteres" });
    }

    await connection.beginTransaction();

    const requesterRole = String(req.user?.role || "").toLowerCase();
    if (requesterRole === "pation") {
      const requesterEmail = String(req.user?.email || "").trim().toLowerCase();
      if (!requesterEmail) {
        await connection.rollback();
        return res.status(400).json({ error: "Email utilisateur introuvable dans le token" });
      }

      const [selfRows] = await connection.execute("SELECT id FROM pations WHERE email = ? LIMIT 1", [requesterEmail]);
      if (selfRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Pation non trouve" });
      }

      if (Number(selfRows[0].id) !== pationId) {
        await connection.rollback();
        return res.status(403).json({ error: "Acces refuse" });
      }
    }

    const [rows] = await connection.execute("SELECT email, password FROM pations WHERE id = ?", [pationId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Pation non trouve" });
    }

    const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isMatch) {
      await connection.rollback();
      return res.status(400).json({ error: "Ancien mot de passe incorrect" });
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);

    await connection.execute("UPDATE pations SET password = ? WHERE id = ?", [newHashedPassword, pationId]);
    await connection.execute("UPDATE users SET password = ? WHERE email = ? AND role = ?", [newHashedPassword, rows[0].email, "pation"]);

    await connection.commit();

    return res.json({ message: "Mot de passe mis a jour avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Error changing pation password:", error);
    return res.status(500).json({ error: "Erreur lors du changement de mot de passe", details: error.message });
  } finally {
    connection.release();
  }
};

export const togglePationStatus = async (req, res) => {
  try {
    const pationId = Number(req.params.id);
    const active = req.body?.active;

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Le statut doit etre un booleen" });
    }

    const [existing] = await db.execute("SELECT id FROM pations WHERE id = ?", [pationId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Pation non trouve" });
    }

    await db.execute("UPDATE pations SET is_active = ? WHERE id = ?", [active ? 1 : 0, pationId]);

    const [updated] = await db.execute(
      `SELECT id, nom, prenom, email, cin, telephone, date_naissance, is_active, created_at
       FROM pations WHERE id = ?`,
      [pationId],
    );

    return res.json({
      message: `Pation ${active ? "active" : "desactive"} avec succes`,
      pation: updated[0],
    });
  } catch (error) {
    console.error("Error toggling pation status:", error);
    return res.status(500).json({ error: "Erreur lors du changement de statut", details: error.message });
  }
};

export const deletePation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const pationId = Number(req.params.id);
    await connection.beginTransaction();

    const [rows] = await connection.execute("SELECT email FROM pations WHERE id = ?", [pationId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Pation non trouve" });
    }

    const email = rows[0].email;

    await connection.execute("DELETE FROM pations WHERE id = ?", [pationId]);
    await connection.execute("DELETE FROM users WHERE email = ? AND role = ?", [email, "pation"]);

    await connection.commit();

    return res.json({ message: "Pation et compte utilisateur supprimes avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting pation:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression", details: error.message });
  } finally {
    connection.release();
  }
};

export const getPationOrdonnances = async (req, res) => {
  try {
    const pationId = Number(req.params.id);
    const requesterRole = String(req.user?.role || "").toLowerCase();

    if (requesterRole === "pation") {
      const requesterEmail = String(req.user?.email || "").trim().toLowerCase();
      if (!requesterEmail) {
        return res.status(400).json({ error: "Email utilisateur introuvable dans le token" });
      }

      const [selfRows] = await db.execute("SELECT id FROM pations WHERE email = ? LIMIT 1", [requesterEmail]);
      if (selfRows.length === 0) {
        return res.status(404).json({ error: "Pation non trouve" });
      }

      if (Number(selfRows[0].id) !== pationId) {
        return res.status(403).json({ error: "Acces refuse" });
      }
    }

    const [pations] = await db.execute("SELECT id, cin FROM pations WHERE id = ?", [pationId]);
    if (pations.length === 0) {
      return res.status(404).json({ error: "Pation non trouve" });
    }

    const cin = pations[0].cin;

    const [rows] = await db.execute(
      `SELECT o.id, o.id_doctor, o.cin, o.nom, o.prenom, o.ordonnance, o.status, o.created_at
       FROM ordonnances o
       WHERE o.cin = ?
       ORDER BY o.created_at DESC`,
      [cin],
    );

    return res.json({
      success: true,
      count: rows.length,
      ordonnances: rows,
    });
  } catch (error) {
    console.error("Error getting pation ordonnances:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation des ordonnances", details: error.message });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const email = String(req.user?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email utilisateur introuvable dans le token" });
    }

    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, telephone, date_naissance, is_active, created_at
       FROM pations
       WHERE email = ?
       LIMIT 1`,
      [email],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pation non trouve" });
    }

    return res.json({ success: true, pation: rows[0] });
  } catch (error) {
    console.error("Error getting my pation profile:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation du profil", details: error.message });
  }
};

export const getMyOrdonnances = async (req, res) => {
  try {
    const email = String(req.user?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email utilisateur introuvable dans le token" });
    }

    const [pationRows] = await db.execute("SELECT id FROM pations WHERE email = ? LIMIT 1", [email]);
    if (pationRows.length === 0) {
      return res.status(404).json({ error: "Pation non trouve" });
    }

    req.params.id = String(pationRows[0].id);
    return getPationOrdonnances(req, res);
  } catch (error) {
    console.error("Error getting my pation ordonnances:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation des ordonnances", details: error.message });
  }
};

export default {
  createPation,
  getAllPations,
  getPationById,
  updatePation,
  changePationPassword,
  togglePationStatus,
  deletePation,
  getPationOrdonnances,
  getMyProfile,
  getMyOrdonnances,
};
