import db from "../db.js";
import bcrypt from "bcryptjs"; // ✅ CORRECTION: bcryptjs au lieu de bcrypt
const { log } = console;

// Helper function to validate pharmacy data
const validatePharmacyData = (data) => {
  const { nom_pharmacie, email, telephone, password, president_pharmacie } = data

  if (!nom_pharmacie || !email || !telephone || !password || !president_pharmacie) {
    return { isValid: false, error: "Tous les champs sont obligatoires" }
  }

  if (typeof password !== "string" || password.trim() === "") {
    return { isValid: false, error: "Le mot de passe ne peut pas être vide" }
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: "Le mot de passe doit contenir au moins 6 caractères",
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Format d'email invalide" }
  }

  return { isValid: true }
}

// Create new pharmacy with pharmacist account
export const createPharmacy = async (req, res) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    // Validate input data
    const validation = validatePharmacyData(req.body)
    if (!validation.isValid) {
      return res.status(400).json({ error: validation.error })
    }

    const { nom_pharmacie, email, telephone, password, president_pharmacie } = req.body

    // Check for existing pharmacy with same email
    const [existingPharmacy] = await connection.execute("SELECT id_pharmacie FROM pharmacie WHERE email = ?", [email])

    if (existingPharmacy.length > 0) {
      return res.status(400).json({ error: "Une pharmacie avec cet email existe déjà" })
    }

    // Check for existing user with same email
    const [existingUser] = await connection.execute("SELECT id FROM users WHERE email = ?", [email])

    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Un compte utilisateur avec cet email existe déjà" })
    }

    // Hash the password with error handling
    let hashedPassword
    try {
      hashedPassword = await bcrypt.hash(password, 10)
    } catch (hashError) {
      console.error("Password hashing error:", hashError)
      return res.status(500).json({ error: "Erreur de sécurité lors du cryptage du mot de passe" })
    }

    // Create pharmacist user account
    const [userResult] = await connection.execute(
      "INSERT INTO users (email, password, role, created_at) VALUES (?, ?, ?, NOW())",
      [email, hashedPassword, "pharmacist"],
    )

    // Create pharmacy record
    const [pharmacyResult] = await connection.execute(
      `INSERT INTO pharmacie 
       (nom_pharmacie, email, telephone, mot_de_passe, president_pharmacie, is_active, created_at) 
       VALUES (?, ?, ?, ?, ?, 1, NOW())`,
      [nom_pharmacie, email, telephone, hashedPassword, president_pharmacie],
    )

    // Get the newly created pharmacy
    const [newPharmacy] = await connection.execute(
      `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie, is_active, created_at
       FROM pharmacie WHERE id_pharmacie = ?`,
      [pharmacyResult.insertId],
    )

    await connection.commit()

    res.status(201).json({
      message: "Pharmacie et compte pharmacien créés avec succès",
      pharmacy: newPharmacy[0],
      user: {
        id: userResult.insertId,
        email: email,
        role: "pharmacist",
      },
    })
  } catch (error) {
    await connection.rollback()
    console.error("Error in createPharmacy:", error)
    res.status(500).json({
      error: "Erreur serveur lors de la création",
      details: error.message,
    })
  } finally {
    connection.release()
  }
}

// Get pharmacy profile by ID
export const getProfile = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.id_pharmacie, p.nom_pharmacie, p.email, p.telephone, p.president_pharmacie, 
              p.is_active, p.created_at, u.id as user_id
       FROM pharmacie p
       LEFT JOIN users u ON p.email = u.email AND u.role = 'pharmacist'
       WHERE p.id_pharmacie = ?`,
      [req.params.id],
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvée" })
    }

    res.json(rows[0])
  } catch (err) {
    console.error("Error getting pharmacy profile:", err)
    res.status(500).json({ error: "Erreur lors de la récupération du profil" })
  }
}

// Update pharmacy (for frontend edit functionality)
// Update pharmacy profile
export const updateProfile = async (req, res) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const { nom_pharmacie, email, telephone, president_pharmacie } = req.body
    const pharmacyId = req.params.id

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Format d'email invalide" })
      }
    }

    // Get current pharmacy email
    const [currentPharmacy] = await connection.execute("SELECT email FROM pharmacie WHERE id_pharmacie = ?", [
      pharmacyId,
    ])

    if (currentPharmacy.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvée" })
    }

    const oldEmail = currentPharmacy[0].email

    // Update pharmacy
    await connection.execute(
      `UPDATE pharmacie SET 
       nom_pharmacie = ?, email = ?, telephone = ?, president_pharmacie = ? 
       WHERE id_pharmacie = ?`,
      [nom_pharmacie, email, telephone, president_pharmacie, pharmacyId],
    )

    // Update user email if changed
    if (email && email !== oldEmail) {
      await connection.execute("UPDATE users SET email = ? WHERE email = ? AND role = ?", [
        email,
        oldEmail,
        "pharmacist",
      ])
    }

    await connection.commit()

    res.json({ message: "Pharmacie mise à jour avec succès" })
  } catch (err) {
    await connection.rollback()
    console.error("Error updating pharmacy:", err)
    res.status(500).json({ error: "Erreur lors de la mise à jour" })
  } finally {
    connection.release()
  }
}

// Change pharmacy password
export const changePassword = async (req, res) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const { old_password, new_password } = req.body
    const pharmacyId = req.params.id

    if (!old_password || !new_password) {
      return res.status(400).json({ error: "Ancien et nouveau mot de passe requis" })
    }

    if (old_password.trim() === "" || new_password.trim() === "") {
      return res.status(400).json({ error: "Les mots de passe ne peuvent pas être vides" })
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: "Le nouveau mot de passe doit contenir au moins 6 caractères",
      })
    }

    // Get pharmacy data
    const [pharmacy] = await connection.execute("SELECT email, mot_de_passe FROM pharmacie WHERE id_pharmacie = ?", [
      pharmacyId,
    ])

    if (pharmacy.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvée" })
    }

    // Verify old password
    const match = await bcrypt.compare(old_password, pharmacy[0].mot_de_passe)
    if (!match) {
      return res.status(400).json({ error: "Ancien mot de passe incorrect" })
    }

    // Hash new password
    const newHashedPassword = await bcrypt.hash(new_password, 10)

    // Update pharmacy password
    await connection.execute("UPDATE pharmacie SET mot_de_passe = ? WHERE id_pharmacie = ?", [
      newHashedPassword,
      pharmacyId,
    ])

    // Update user password
    await connection.execute("UPDATE users SET password = ? WHERE email = ? AND role = ?", [
      newHashedPassword,
      pharmacy[0].email,
      "pharmacist",
    ])

    await connection.commit()

    res.json({ message: "Mot de passe mis à jour avec succès" })
  } catch (err) {
    await connection.rollback()
    console.error("Error changing password:", err)
    res.status(500).json({ error: "Erreur lors du changement de mot de passe" })
  } finally {
    connection.release()
  }
}

// Toggle pharmacy status (updated to return pharmacy data)
export const toggleStatus = async (req, res) => {
  try {
    const { active } = req.body
    const pharmacyId = req.params.id

    // Validation
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Le statut doit être un booléen" })
    }

    const [pharmacy] = await db.execute("SELECT id_pharmacie FROM pharmacie WHERE id_pharmacie = ?", [pharmacyId])

    if (pharmacy.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvée" })
    }

    await db.execute("UPDATE pharmacie SET is_active = ? WHERE id_pharmacie = ?", [active ? 1 : 0, pharmacyId])

    // Récupérer la pharmacie mise à jour
    const [updatedPharmacy] = await db.execute(
      `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie, is_active, created_at
       FROM pharmacie WHERE id_pharmacie = ?`,
      [pharmacyId],
    )

    res.json({
      message: `Pharmacie ${active ? "activée" : "désactivée"} avec succès`,
      pharmacy: updatedPharmacy[0],
    })
  } catch (err) {
    console.error("Error toggling pharmacy status:", err)
    res.status(500).json({ error: "Erreur lors du changement de statut" })
  }
}

// Get all pharmacies
export const getAllPharmacies = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT p.id_pharmacie, p.nom_pharmacie, p.email, p.telephone, p.president_pharmacie, 
              p.is_active, p.created_at, u.id as user_id
       FROM pharmacie p
       LEFT JOIN users u ON p.email = u.email AND u.role = 'pharmacist'
       ORDER BY p.created_at DESC`,
    )

    res.json(rows)
  } catch (err) {
    console.error("Error getting all pharmacies:", err)
    res.status(500).json({ error: "Erreur lors de la récupération des pharmacies" })
  }
}

// Delete pharmacy
export const deletePharmacy = async (req, res) => {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params

    // Get pharmacy email before deletion
    const [pharmacy] = await connection.execute("SELECT email FROM pharmacie WHERE id_pharmacie = ?", [id])

    if (pharmacy.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvée" })
    }

    const email = pharmacy[0].email

    // Delete pharmacy
    await connection.execute("DELETE FROM pharmacie WHERE id_pharmacie = ?", [id])

    // Delete associated user account
    await connection.execute("DELETE FROM users WHERE email = ? AND role = ?", [email, "pharmacist"])

    await connection.commit()

    res.json({
      message: "Pharmacie et compte utilisateur supprimés avec succès",
    })
  } catch (error) {
    await connection.rollback()
    console.error("Error deleting pharmacy:", error)
    res.status(500).json({ error: "Erreur lors de la suppression" })
  } finally {
    connection.release()
  }
}
export const updatePharmacy = async (req, res) => {
  console.log("🔧 updatePharmacy appelée avec ID:", req.params.id)
  console.log("🔧 Données reçues:", req.body)

  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()

    const { id } = req.params
    const { nom_pharmacie, email, telephone, president_pharmacie } = req.body

    // Validation des données
    if (!nom_pharmacie || !email || !telephone || !president_pharmacie) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires" })
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format d'email invalide" })
    }

    // Vérifier si la pharmacie existe
    const [existingPharmacy] = await connection.execute(
      "SELECT id_pharmacie, email FROM pharmacie WHERE id_pharmacie = ?",
      [id],
    )

    if (existingPharmacy.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvée" })
    }

    // Vérifier si l'email existe déjà pour une autre pharmacie
    const [emailExists] = await connection.execute(
      "SELECT id_pharmacie FROM pharmacie WHERE email = ? AND id_pharmacie != ?",
      [email, id],
    )

    if (emailExists.length > 0) {
      return res.status(400).json({ error: "Cet email est déjà utilisé par une autre pharmacie" })
    }

    const oldEmail = existingPharmacy[0].email

    // Mettre à jour la pharmacie
    await connection.execute(
      `UPDATE pharmacie 
       SET nom_pharmacie = ?, email = ?, telephone = ?, president_pharmacie = ?
       WHERE id_pharmacie = ?`,
      [nom_pharmacie, email, telephone, president_pharmacie, id],
    )

    // Update user email if changed
    if (email && email !== oldEmail) {
      await connection.execute("UPDATE users SET email = ? WHERE email = ? AND role = ?", [
        email,
        oldEmail,
        "pharmacist",
      ])
    }

    // Récupérer la pharmacie mise à jour
    const [updatedPharmacy] = await connection.execute(
      `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie, is_active, created_at
       FROM pharmacie WHERE id_pharmacie = ?`,
      [id],
    )

    await connection.commit()

    res.status(200).json({
      message: "Pharmacie modifiée avec succès",
      pharmacy: updatedPharmacy[0],
    })
  } catch (error) {
    await connection.rollback()
    console.error("❌ Erreur dans updatePharmacy:", error)
    res.status(500).json({ error: "Erreur serveur lors de la modification" })
  } finally {
    connection.release()
  }
}

// ✅ Fonction togglePharmacyStatus (alias pour toggleStatus mais avec nom cohérent)
export const togglePharmacyStatus = async (req, res) => {
  console.log("🔧 togglePharmacyStatus appelée avec ID:", req.params.id)
  console.log("🔧 Active:", req.body.active)

  try {
    const { active } = req.body
    const pharmacyId = req.params.id

    // Validation
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Le statut doit être un booléen" })
    }

    const [pharmacy] = await db.execute("SELECT id_pharmacie FROM pharmacie WHERE id_pharmacie = ?", [pharmacyId])

    if (pharmacy.length === 0) {
      return res.status(404).json({ error: "Pharmacie non trouvée" })
    }

    await db.execute("UPDATE pharmacie SET is_active = ? WHERE id_pharmacie = ?", [active ? 1 : 0, pharmacyId])

    // Récupérer la pharmacie mise à jour
    const [updatedPharmacy] = await db.execute(
      `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie, is_active, created_at
       FROM pharmacie WHERE id_pharmacie = ?`,
      [pharmacyId],
    )

    res.json({
      message: `Pharmacie ${active ? "activée" : "désactivée"} avec succès`,
      pharmacy: updatedPharmacy[0],
    })
  } catch (err) {
    console.error("❌ Erreur dans togglePharmacyStatus:", err)
    res.status(500).json({ error: "Erreur lors du changement de statut" })
  }
}





export default {
  createPharmacy,
  getProfile,
  updateProfile,
  changePassword,
  toggleStatus,
  getAllPharmacies,
  deletePharmacy,
  updatePharmacy,
  togglePharmacyStatus,
};

