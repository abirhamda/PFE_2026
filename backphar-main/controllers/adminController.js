import db from "../db.js";
import bcrypt from "bcryptjs";

const validatePharmacyData = (data) => {
  const { nom_pharmacie, email, telephone, password, president_pharmacie } = data || {};

  if (!nom_pharmacie || !email || !telephone || !password || !president_pharmacie) {
    return { isValid: false, error: "Tous les champs sont obligatoires" };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(email).trim())) {
    return { isValid: false, error: "Format d'email invalide" };
  }

  if (String(password).length < 6) {
    return { isValid: false, error: "Le mot de passe doit contenir au moins 6 caracteres" };
  }

  return { isValid: true };
};

export const addPharmacy = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const validation = validatePharmacyData(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error });
    }

    const nom_pharmacie = String(req.body.nom_pharmacie).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const telephone = String(req.body.telephone).trim();
    const password = String(req.body.password);
    const president_pharmacie = String(req.body.president_pharmacie).trim();

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

    const [userResult] = await connection.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [
      email,
      hashedPassword,
      "pharmacist",
    ]);

    const [pharmacyResult] = await connection.execute(
      `INSERT INTO pharmacie
       (nom_pharmacie, email, telephone, mot_de_passe, president_pharmacie, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [nom_pharmacie, email, telephone, hashedPassword, president_pharmacie],
    );

    const [newPharmacy] = await connection.execute(
      `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie, is_active, created_at
       FROM pharmacie WHERE id_pharmacie = ?`,
      [pharmacyResult.insertId],
    );

    await connection.commit();

    return res.status(201).json({
      message: "Pharmacie et compte pharmacien crees avec succes",
      pharmacy: newPharmacy[0],
      user: {
        id: userResult.insertId,
        email,
        role: "pharmacist",
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error in addPharmacy:", error);
    return res.status(500).json({ error: "Erreur serveur lors de la creation", details: error.message });
  } finally {
    connection.release();
  }
};

export const getAllPharmacies = async (_req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie, is_active, created_at
       FROM pharmacie
       ORDER BY created_at DESC, id_pharmacie DESC`,
    );

    res.json(rows);
  } catch (error) {
    console.error("Error getting all pharmacies:", error);
    res.status(500).json({ error: "Erreur lors de la recuperation des pharmacies", details: error.message });
  }
};

export const deletePharmacy = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const pharmacyId = Number(req.params.id);
    await connection.beginTransaction();

    const [pharmacy] = await connection.execute("SELECT id_pharmacie, email FROM pharmacie WHERE id_pharmacie = ?", [
      pharmacyId,
    ]);

    if (pharmacy.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: "Pharmacie non trouvee" });
    }

    const email = pharmacy[0].email;

    await connection.execute("DELETE FROM pharmacie WHERE id_pharmacie = ?", [pharmacyId]);
    await connection.execute("DELETE FROM users WHERE email = ? AND role = ?", [email, "pharmacist"]);

    await connection.commit();

    res.json({
      message: "Pharmacie et compte utilisateur supprimes avec succes",
      deleted_pharmacy_id: pharmacyId,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting pharmacy:", error);
    res.status(500).json({ error: "Erreur lors de la suppression", details: error.message });
  } finally {
    connection.release();
  }
};

export const togglePharmacyStatus = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.id);
    const active = req.body?.active;

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Le statut actif doit etre true ou false" });
    }

    const [pharmacy] = await db.execute("SELECT id_pharmacie FROM pharmacie WHERE id_pharmacie = ?", [pharmacyId]);
    if (pharmacy.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvee" });
    }

    await db.execute("UPDATE pharmacie SET is_active = ? WHERE id_pharmacie = ?", [active ? 1 : 0, pharmacyId]);

    const [updated] = await db.execute(
      `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie, is_active, created_at
       FROM pharmacie WHERE id_pharmacie = ?`,
      [pharmacyId],
    );

    res.json({
      message: `Pharmacie ${active ? "activee" : "desactivee"} avec succes`,
      pharmacy_id: pharmacyId,
      pharmacy: updated[0],
    });
  } catch (error) {
    console.error("Error toggling pharmacy status:", error);
    res.status(500).json({ error: "Erreur lors du changement de statut", details: error.message });
  }
};

export const getPharmacyDetails = async (req, res) => {
  try {
    const pharmacyId = Number(req.params.id);

    const [rows] = await db.execute(
      `SELECT p.id_pharmacie, p.nom_pharmacie, p.email, p.telephone, p.president_pharmacie,
              p.is_active, p.created_at, u.id as user_id
       FROM pharmacie p
       LEFT JOIN users u ON p.email = u.email AND u.role = 'pharmacist'
       WHERE p.id_pharmacie = ?`,
      [pharmacyId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvee" });
    }

    res.json({ success: true, pharmacy: rows[0] });
  } catch (error) {
    console.error("Error getting pharmacy details:", error);
    res.status(500).json({ error: "Erreur lors de la recuperation des details", details: error.message });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    const adminId = Number(req.params.id);

    const [rows] = await db.execute(
      "SELECT id, full_name, email, phone, address, created_at FROM admin WHERE id = ?",
      [adminId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Admin non trouve" });
    }

    res.json({ success: true, admin: rows[0] });
  } catch (error) {
    console.error("Error getting admin profile:", error);
    res.status(500).json({ error: "Erreur lors de la recuperation du profil", details: error.message });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const adminId = Number(req.params.id);
    const full_name = String(req.body?.full_name || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const phone = req.body?.phone ? String(req.body.phone).trim() : null;
    const address = req.body?.address ? String(req.body.address).trim() : null;

    if (!full_name || !email) {
      return res.status(400).json({ error: "Le nom complet et l'email sont obligatoires" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format d'email invalide" });
    }

    const [adminExists] = await db.execute("SELECT id FROM admin WHERE id = ?", [adminId]);
    if (adminExists.length === 0) {
      return res.status(404).json({ error: "Admin non trouve" });
    }

    await db.execute("UPDATE admin SET full_name = ?, email = ?, phone = ?, address = ? WHERE id = ?", [
      full_name,
      email,
      phone,
      address,
      adminId,
    ]);

    res.json({ message: "Profil mis a jour avec succes", updated_admin_id: adminId });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    res.status(500).json({ error: "Erreur lors de la mise a jour du profil", details: error.message });
  }
};

export const changeAdminPassword = async (req, res) => {
  try {
    const adminId = Number(req.params.id);
    const oldPassword = String(req.body?.old_password || "");
    const newPassword = String(req.body?.new_password || "");

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir au moins 6 caracteres" });
    }

    const [rows] = await db.execute("SELECT mot_de_passe FROM admin WHERE id = ?", [adminId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Admin non trouve" });
    }

    const isMatch = await bcrypt.compare(oldPassword, rows[0].mot_de_passe);
    if (!isMatch) {
      return res.status(400).json({ error: "Ancien mot de passe incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute("UPDATE admin SET mot_de_passe = ? WHERE id = ?", [hashedPassword, adminId]);

    res.json({ message: "Mot de passe mis a jour avec succes", admin_id: adminId });
  } catch (error) {
    console.error("Error changing admin password:", error);
    res.status(500).json({ error: "Erreur lors du changement de mot de passe", details: error.message });
  }
};

export const addDoctor = async (_req, res) => {
  res.status(501).json({ error: "Utilisez doctorController.createDoctor" });
};

export const deleteDoctor = async (_req, res) => {
  res.status(501).json({ error: "Utilisez doctorController.deleteDoctor" });
};

export const deactivateDoctor = async (_req, res) => {
  res.status(501).json({ error: "Utilisez doctorController.toggleDoctorStatus" });
};

export const getDoctorDetails = async (_req, res) => {
  res.status(501).json({ error: "Utilisez doctorController.getProfile" });
};

export const deleteSupplier = async (_req, res) => {
  res.status(501).json({ error: "Utilisez supplierController.deleteSupplier" });
};

export const activateSupplier = async (_req, res) => {
  res.status(501).json({ error: "Utilisez supplierController.toggleStatus" });
};

export const deactivateSupplier = async (_req, res) => {
  res.status(501).json({ error: "Utilisez supplierController.toggleStatus" });
};

export const getSupplierDetails = async (_req, res) => {
  res.status(501).json({ error: "Utilisez supplierController.getSupplier" });
};

export default {
  addPharmacy,
  getAllPharmacies,
  deletePharmacy,
  togglePharmacyStatus,
  getPharmacyDetails,
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword,
  addDoctor,
  deleteDoctor,
  deactivateDoctor,
  getDoctorDetails,
  deleteSupplier,
  activateSupplier,
  deactivateSupplier,
  getSupplierDetails,
};
