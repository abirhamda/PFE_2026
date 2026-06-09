import db from "../db.js";
import bcrypt from "bcryptjs";
import { resolveSupplierContext } from "../utils/userContext.js";

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

    // 1. Create the auth account in users
    const [userInsert] = await connection.execute(
      "INSERT INTO users (email, password, role) VALUES (?, ?, 'supplier')",
      [email, hashedPassword],
    );
    const userId = userInsert.insertId;

    // 2. Create the supplier profile linked via user_id (no password stored here)
    const [result] = await connection.execute(
      `INSERT INTO suppliers (user_id, nom, prenom, email, telephone, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [userId, nom, prenom, email, telephone],
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

    const [existingRows] = await connection.execute("SELECT id, user_id, email FROM suppliers WHERE id = ?", [supplierId]);
    if (existingRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Fournisseur non trouve" });
    }

    const { user_id: userId, email: oldEmail } = existingRows[0];

    const [duplicate] = await connection.execute(
      "SELECT id FROM suppliers WHERE email = ? AND id <> ?",
      [email, supplierId],
    );
    if (duplicate.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Email deja utilise par un autre fournisseur" });
    }

    await connection.execute(
      "UPDATE suppliers SET nom = ?, prenom = ?, email = ?, telephone = ? WHERE id = ?",
      [nom, prenom, email, telephone, supplierId],
    );

    // Sync auth account via user_id FK — no more WHERE email = ? AND role = ?
    if (email !== oldEmail) {
      await connection.execute("UPDATE users SET email = ? WHERE id = ?", [email, userId]);
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

    const [rows] = await connection.execute("SELECT user_id FROM suppliers WHERE id = ?", [supplierId]);
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Fournisseur non trouve" });
    }

    const userId = rows[0].user_id;

    // Deleting users row cascades to suppliers via FK (supplier_pharmacie cascade is on suppliers FK)
    await connection.execute("DELETE FROM users WHERE id = ?", [userId]);

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

    // Get user_id — password lives only in users table
    const [suppRows] = await connection.execute(
      "SELECT user_id FROM suppliers WHERE id = ? LIMIT 1",
      [supplierId],
    );
    if (suppRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Fournisseur non trouve" });
    }
    const userId = suppRows[0].user_id;

    const [userRows] = await connection.execute(
      "SELECT password FROM users WHERE id = ? LIMIT 1",
      [userId],
    );
    const isMatch = await bcrypt.compare(oldPassword, userRows[0].password);
    if (!isMatch) {
      await connection.rollback();
      return res.status(400).json({ error: "Ancien mot de passe incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update only in users — single source of truth
    await connection.execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);

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

const getMyProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ error: "Profil fournisseur invalide" });
    }

    const [rows] = await connection.execute(
      `SELECT id, nom, prenom, email, telephone, is_active, created_at
       FROM suppliers
       WHERE id = ?
       LIMIT 1`,
      [supplier.id],
    );

    return res.json({ success: true, profile: rows[0] });
  } catch (error) {
    console.error("Error getting my supplier profile:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation du profil fournisseur" });
  } finally {
    connection.release();
  }
};

const updateMyProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ error: "Profil fournisseur invalide" });
    }

    const payload = {
      ...req.body,
      nom: String(req.body?.nom || "").trim(),
      prenom: String(req.body?.prenom || "").trim(),
      email: String(req.body?.email || "").trim().toLowerCase(),
      telephone: String(req.body?.telephone || "").trim(),
    };

    const validation = validateSupplierData(payload, false);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    await connection.beginTransaction();

    const [duplicate] = await connection.execute(
      "SELECT id FROM suppliers WHERE email = ? AND id <> ? LIMIT 1",
      [payload.email, supplier.id],
    );
    if (duplicate.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Cet email est deja utilise par un autre fournisseur" });
    }

    await connection.execute(
      "UPDATE suppliers SET nom = ?, prenom = ?, email = ?, telephone = ? WHERE id = ?",
      [payload.nom, payload.prenom, payload.email, payload.telephone, supplier.id],
    );

    if (payload.email !== supplier.email) {
      // Sync auth account via user_id FK
      await connection.execute(
        "UPDATE users SET email = ? WHERE id = (SELECT user_id FROM suppliers WHERE id = ? LIMIT 1)",
        [payload.email, supplier.id],
      );
    }

    await connection.commit();
    return res.json({ success: true, message: "Profil fournisseur mis a jour avec succes" });
  } catch (error) {
    await connection.rollback();
    console.error("Error updating my supplier profile:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour du profil fournisseur" });
  } finally {
    connection.release();
  }
};

const getMyDashboard = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ error: "Profil fournisseur invalide" });
    }

    const [demandeRows] = await connection.execute(
      `SELECT id, nom_medicament, quantite, status, created_at, response_note, pharmacie_id
       FROM demandes
       WHERE supplier_id = ?
       ORDER BY created_at DESC`,
      [supplier.id],
    );
    const [partnershipRows] = await connection.execute(
      `SELECT id, pharmacie_id, status, created_at, response_note
       FROM supplier_partnership_requests
       WHERE supplier_id = ?
       ORDER BY created_at DESC`,
      [supplier.id],
    );
    const [partnerRows] = await connection.execute(
      `SELECT COUNT(*) AS total
       FROM supplier_pharmacie
       WHERE supplier_id = ?`,
      [supplier.id],
    );

    const merged = [
      ...demandeRows.map((row) => ({ ...row, request_kind: "medicament" })),
      ...partnershipRows.map((row) => ({ ...row, request_kind: "partenariat" })),
    ];

    const stats = {
      demandes_recues: merged.length,
      en_attente: merged.filter((item) => item.status === "en_attente").length,
      acceptees: merged.filter((item) => item.status === "acceptee").length,
      refusees: merged.filter((item) => item.status === "refusee").length,
      pharmacies_partenaires: Number(partnerRows[0]?.total || 0),
    };

    return res.json({
      success: true,
      stats,
      recent_medicament_requests: demandeRows.slice(0, 5),
      recent_partnership_requests: partnershipRows.slice(0, 5),
    });
  } catch (error) {
    console.error("Error loading supplier dashboard:", error);
    return res.status(500).json({ error: "Erreur lors du chargement du dashboard fournisseur" });
  } finally {
    connection.release();
  }
};

const getMyRequestCenter = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ error: "Profil fournisseur invalide" });
    }

    const [medicineRows] = await connection.execute(
      `SELECT
         d.id,
         d.nom_medicament AS label,
         d.quantite,
         d.status,
         d.response_note,
         d.created_at,
         d.updated_at,
         d.pharmacie_id,
         p.nom_pharmacie,
         p.email AS pharmacie_email,
         p.telephone AS pharmacie_telephone,
         p.president_pharmacie,
         'medicament' AS request_kind
       FROM demandes d
       INNER JOIN pharmacie p ON p.id_pharmacie = d.pharmacie_id
       WHERE d.supplier_id = ?
       ORDER BY d.created_at DESC`,
      [supplier.id],
    );

    const [partnershipRows] = await connection.execute(
      `SELECT
         pr.id,
         'Demande de partenariat' AS label,
         NULL AS quantite,
         pr.status,
         pr.response_note,
         pr.created_at,
         pr.updated_at,
         pr.pharmacie_id,
         p.nom_pharmacie,
         p.email AS pharmacie_email,
         p.telephone AS pharmacie_telephone,
         p.president_pharmacie,
         'partenariat' AS request_kind
       FROM supplier_partnership_requests pr
       INNER JOIN pharmacie p ON p.id_pharmacie = pr.pharmacie_id
       WHERE pr.supplier_id = ?
       ORDER BY pr.created_at DESC`,
      [supplier.id],
    );

    const items = [...medicineRows, ...partnershipRows].sort(
      (left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0),
    );

    return res.json({ success: true, items });
  } catch (error) {
    console.error("Error loading supplier request center:", error);
    return res.status(500).json({ error: "Erreur lors du chargement des demandes fournisseur" });
  } finally {
    connection.release();
  }
};

export default {
  createSupplier,
  getAllSuppliers,
  getSupplier,
  getMyProfile,
  updateMyProfile,
  getMyDashboard,
  getMyRequestCenter,
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
