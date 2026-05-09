import db from "../db.js";
import bcrypt from "bcryptjs";

const validateSupplierData = (data, isCreate = true) => {
  const required = ["nom", "prenom", "email", "telephone"];
  if (isCreate) required.push("password");

  const missing = required.find((field) => !String(data?.[field] || "").trim());
  if (missing) {
    return { isValid: false, error: `Le champ ${missing} est obligatoire` };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(data.email).trim())) {
    return { isValid: false, error: "Format d'email invalide" };
  }

  if (isCreate && String(data.password).length < 6) {
    return { isValid: false, error: "Le mot de passe doit contenir au moins 6 caracteres" };
  }

  return { isValid: true };
};

const createSupplier = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const validation = validateSupplierData(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const nom = String(req.body.nom).trim();
    const prenom = String(req.body.prenom).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const password = String(req.body.password);
    const telephone = String(req.body.telephone).trim();

    await connection.beginTransaction();

    const [existingSupplier] = await connection.execute("SELECT id FROM suppliers WHERE email = ?", [email]);
    if (existingSupplier.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Un fournisseur avec cet email existe deja" });
    }

    const [existingUser] = await connection.execute("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUser.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Un compte utilisateur avec cet email existe deja" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [email, hashedPassword, "supplier"]);

    const [result] = await connection.execute(
      `INSERT INTO suppliers (nom, prenom, email, password, telephone, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [nom, prenom, email, hashedPassword, telephone],
    );

    const [newRows] = await connection.execute(
      `SELECT id, nom, prenom, email, telephone, is_active, created_at
       FROM suppliers WHERE id = ?`,
      [result.insertId],
    );

    await connection.commit();

    return res.status(201).json({
      message: "Fournisseur cree avec succes",
      supplier: newRows[0],
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error creating supplier:", error);
    return res.status(500).json({ error: "Erreur serveur lors de la creation", details: error.message });
  } finally {
    connection.release();
  }
};

const getAllSuppliers = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, telephone, is_active, created_at
       FROM suppliers
       ORDER BY created_at DESC, id DESC`,
    );

    res.json(rows);
  } catch (error) {
    console.error("Error getting all suppliers:", error);
    res.status(500).json({ error: "Erreur lors de la recuperation des fournisseurs", details: error.message });
  }
};

const getSupplier = async (req, res) => {
  try {
    const supplierId = Number(req.params.id);
    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, telephone, is_active, created_at
       FROM suppliers WHERE id = ?`,
      [supplierId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Fournisseur non trouve" });
    }

    res.json({ success: true, supplier: rows[0] });
  } catch (error) {
    console.error("Error getting supplier:", error);
    res.status(500).json({ error: "Erreur lors de la recuperation du fournisseur", details: error.message });
  }
};

const updateSupplier = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const validation = validateSupplierData(req.body, false);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const supplierId = Number(req.params.id);
    const nom = String(req.body.nom).trim();
    const prenom = String(req.body.prenom).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const telephone = String(req.body.telephone).trim();

    await connection.beginTransaction();

    const [existingRows] = await connection.execute("SELECT id, email FROM suppliers WHERE id = ?", [supplierId]);
    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Fournisseur non trouve" });
    }

    const oldEmail = existingRows[0].email;

    const [duplicate] = await connection.execute("SELECT id FROM suppliers WHERE email = ? AND id <> ?", [email, supplierId]);
    if (duplicate.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Email deja utilise par un autre fournisseur" });
    }

    await connection.execute(
      "UPDATE suppliers SET nom = ?, prenom = ?, email = ?, telephone = ? WHERE id = ?",
      [nom, prenom, email, telephone, supplierId],
    );

    if (email !== oldEmail) {
      await connection.execute("UPDATE users SET email = ? WHERE email = ? AND role = ?", [email, oldEmail, "supplier"]);
    }

    const [updatedRows] = await connection.execute(
      `SELECT id, nom, prenom, email, telephone, is_active, created_at
       FROM suppliers WHERE id = ?`,
      [supplierId],
    );

    await connection.commit();

    res.json({ message: "Fournisseur mis a jour avec succes", supplier: updatedRows[0] });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Erreur lors de la mise a jour", details: error.message });
  } finally {
    connection.release();
  }
};

const toggleStatus = async (req, res) => {
  try {
    const supplierId = Number(req.params.id);
    const active = req.body?.active;

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Le statut actif doit etre true ou false" });
    }

    const [existingRows] = await db.execute("SELECT id FROM suppliers WHERE id = ?", [supplierId]);
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Fournisseur non trouve" });
    }

    await db.execute("UPDATE suppliers SET is_active = ? WHERE id = ?", [active ? 1 : 0, supplierId]);

    const [updatedRows] = await db.execute(
      `SELECT id, nom, prenom, email, telephone, is_active, created_at
       FROM suppliers WHERE id = ?`,
      [supplierId],
    );

    res.json({
      message: `Fournisseur ${active ? "active" : "desactive"} avec succes`,
      supplier: updatedRows[0],
    });
  } catch (error) {
    console.error("Error toggling supplier status:", error);
    res.status(500).json({ error: "Erreur lors du changement de statut", details: error.message });
  }
};

const deleteSupplier = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const supplierId = Number(req.params.id);
    await connection.beginTransaction();

    const [rows] = await connection.execute("SELECT email FROM suppliers WHERE id = ?", [supplierId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Fournisseur non trouve" });
    }

    const email = rows[0].email;

    await connection.execute("DELETE FROM supplier_pharmacie WHERE supplier_id = ?", [supplierId]);
    await connection.execute("DELETE FROM suppliers WHERE id = ?", [supplierId]);
    await connection.execute("DELETE FROM users WHERE email = ? AND role = ?", [email, "supplier"]);

    await connection.commit();

    res.json({ message: "Fournisseur et compte utilisateur supprimes avec succes", deleted_supplier_id: supplierId });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Erreur lors de la suppression", details: error.message });
  } finally {
    connection.release();
  }
};

const changePassword = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const supplierId = Number(req.params.id);
    const oldPassword = String(req.body?.old_password || "");
    const newPassword = String(req.body?.new_password || "");

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caracteres" });
    }

    await connection.beginTransaction();

    const [rows] = await connection.execute("SELECT email, password FROM suppliers WHERE id = ?", [supplierId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Fournisseur non trouve" });
    }

    const isMatch = await bcrypt.compare(oldPassword, rows[0].password);
    if (!isMatch) {
      await connection.rollback();
      return res.status(400).json({ error: "Ancien mot de passe incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await connection.execute("UPDATE suppliers SET password = ? WHERE id = ?", [hashedPassword, supplierId]);
    await connection.execute("UPDATE users SET password = ? WHERE email = ? AND role = ?", [
      hashedPassword,
      rows[0].email,
      "supplier",
    ]);

    await connection.commit();

    res.json({ message: "Mot de passe mis a jour avec succes", supplier_id: supplierId });
  } catch (error) {
    await connection.rollback();
    console.error("Error changing supplier password:", error);
    res.status(500).json({ error: "Erreur lors du changement de mot de passe", details: error.message });
  } finally {
    connection.release();
  }
};

const getSuppliersByStatus = async (req, res) => {
  try {
    const status = String(req.params.status || "").toLowerCase();
    const isActive = status === "active" ? 1 : 0;

    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, telephone, is_active, created_at
       FROM suppliers
       WHERE is_active = ?
       ORDER BY created_at DESC, id DESC`,
      [isActive],
    );

    res.json(rows);
  } catch (error) {
    console.error("Error getting suppliers by status:", error);
    res.status(500).json({ error: "Erreur lors de la recuperation par statut", details: error.message });
  }
};

const addPharmacyToSupplier = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const supplierId = Number(req.params.supplierId);
    const pharmacyId = Number(req.params.pharmacyId);

    await connection.beginTransaction();

    const [supplierRows] = await connection.execute("SELECT id FROM suppliers WHERE id = ?", [supplierId]);
    if (supplierRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Fournisseur non trouve" });
    }

    const [pharmacyRows] = await connection.execute("SELECT id_pharmacie FROM pharmacie WHERE id_pharmacie = ?", [pharmacyId]);
    if (pharmacyRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Pharmacie non trouvee" });
    }

    const [existing] = await connection.execute(
      "SELECT supplier_id FROM supplier_pharmacie WHERE supplier_id = ? AND pharmacie_id = ?",
      [supplierId, pharmacyId],
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Relation deja existante" });
    }

    await connection.execute("INSERT INTO supplier_pharmacie (supplier_id, pharmacie_id) VALUES (?, ?)", [
      supplierId,
      pharmacyId,
    ]);

    await connection.commit();

    res.status(201).json({ message: "Relation creee avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Error adding pharmacy to supplier:", error);
    res.status(500).json({ error: "Erreur serveur", details: error.message });
  } finally {
    connection.release();
  }
};

const getPharmaciesBySupplierId = async (req, res) => {
  try {
    const supplierId = Number(req.params.id);

    const [rows] = await db.execute(
      `SELECT
         p.id_pharmacie AS pharmacy_id,
         p.nom_pharmacie,
         p.email AS pharmacy_email,
         p.telephone AS pharmacy_phone,
         p.president_pharmacie,
         p.is_active
       FROM supplier_pharmacie sp
       JOIN pharmacie p ON p.id_pharmacie = sp.pharmacie_id
       WHERE sp.supplier_id = ?
       ORDER BY p.nom_pharmacie ASC`,
      [supplierId],
    );

    res.status(200).json({ success: true, pharmacies: rows });
  } catch (error) {
    console.error("Error getting supplier pharmacies:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

const getPharmaciesWithDemandes = async (req, res) => {
  try {
    const supplierId = Number(req.params.supplierId);

    const [rows] = await db.execute(
      `SELECT
         p.id_pharmacie AS pharmacy_id,
         p.nom_pharmacie,
         p.email AS pharmacy_email,
         p.telephone AS pharmacy_phone,
         p.president_pharmacie,
         d.id AS demande_id,
         d.nom_medicament,
         d.quantite,
         d.status,
         d.created_at
       FROM supplier_pharmacie sp
       JOIN pharmacie p ON p.id_pharmacie = sp.pharmacie_id
       LEFT JOIN demandes d ON d.pharmacie_id = p.id_pharmacie AND d.supplier_id = sp.supplier_id
       WHERE sp.supplier_id = ?
       ORDER BY d.created_at DESC`,
      [supplierId],
    );

    const grouped = {};

    rows.forEach((row) => {
      if (!grouped[row.pharmacy_id]) {
        grouped[row.pharmacy_id] = {
          pharmacy_id: row.pharmacy_id,
          nom_pharmacie: row.nom_pharmacie,
          pharmacy_email: row.pharmacy_email,
          pharmacy_phone: row.pharmacy_phone,
          president_pharmacie: row.president_pharmacie,
          medicaments_demandes: [],
        };
      }

      if (row.demande_id) {
        grouped[row.pharmacy_id].medicaments_demandes.push({
          demande_id: row.demande_id,
          nom: row.nom_medicament,
          quantite: row.quantite,
          status: row.status,
          created_at: row.created_at,
        });
      }
    });

    res.json({ success: true, pharmacies: Object.values(grouped) });
  } catch (error) {
    console.error("Error getting pharmacies with demandes:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};

const getSupplierPharmacies = getPharmaciesBySupplierId;

export default {
  createSupplier,
  getAllSuppliers,
  getSupplier,
  updateSupplier,
  toggleStatus,
  deleteSupplier,
  changePassword,
  getSuppliersByStatus,
  getSupplierPharmacies,
  addPharmacyToSupplier,
  getPharmaciesBySupplierId,
  getPharmaciesWithDemandes,
};
