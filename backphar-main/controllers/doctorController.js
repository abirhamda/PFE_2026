import db from "../db.js";
import bcrypt from "bcryptjs"; // ✅ CORRECTION: bcryptjs au lieu de bcrypt
import { createAndSaveUser } from "./userController.js"; // Import the refactored function
// Helper function to validate doctor data
const validateDoctorData = (data) => {
  const { firstName, lastName, email, password, cin, specialty } = data;

  if (!firstName || !lastName || !email || !password || !cin || !specialty) {
    return { isValid: false, error: "Tous les champs sont obligatoires" };
  }

  if (typeof password !== "string" || password.trim() === "") {
    return { isValid: false, error: "Le mot de passe ne peut pas être vide" };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: "Le mot de passe doit contenir au moins 6 caractères",
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Format d'email invalide" };
  }

  if (cin.length < 8) {
    return {
      isValid: false,
      error: "Le CIN doit contenir au moins 8 caractères",
    };
  }

  return { isValid: true };
};

// Get doctor profile by id
export const getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at 
       FROM doctors WHERE id = ?`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Médecin non trouvé" });
    }

    res.json({
      success: true,
      doctor: rows[0],
    });

  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération du profil",
      details: error.message,
    });
  }
};

// Create new doctor
export const createDoctor = async (req, res) => {
  const connection = await db.getConnection();
  try {
    // 1. Validation
    const { isValid, error } = validateDoctorData(req.body);
    if (!isValid) {
      return res.status(400).json({ error });
    }

    const { firstName, lastName, email, password, cin, specialty } = req.body;

    // 2. Check email / CIN uniqueness
    const [[existsEmail]] = await connection.execute(
      "SELECT id FROM doctors WHERE email = ?",
      [email]
    );
    if (existsEmail) {
      return res.status(400).json({ error: "Un médecin avec cet email existe déjà" });
    }
    const [[existsCin]] = await connection.execute(
      "SELECT id FROM doctors WHERE cin = ?",
      [cin]
    );
    if (existsCin) {
      return res.status(400).json({ error: "Un médecin avec ce CIN existe déjà" });
    }

    // 3. Create user account
    try {
      await createAndSaveUser(email, password, "doctor");
    } catch (userErr) {
      console.error("Error creating user account:", userErr);
      if (userErr.message.includes("already exists")) {
        return res.status(409).json({ error: "Un compte utilisateur avec cet email existe déjà" });
      }
      return res.status(500).json({ error: "Erreur lors de la création du compte utilisateur" });
    }

    await connection.beginTransaction();

    // 4. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Insert into doctors
    const [insertResult] = await connection.execute(
      `INSERT INTO doctors 
         (prenom, nom, email, password, cin, specialty, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [firstName, lastName, email, hashedPassword, cin, specialty, 1]
    );

    // 6. Retrieve new record
    const [[newDoctor]] = await connection.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at
       FROM doctors
       WHERE id = ?`,
      [insertResult.insertId]
    );

    await connection.commit();

    // 7. Return response
    return res.status(201).json({
      message: "Médecin créé avec succès",
      doctor: newDoctor,
    });
  } catch (err) {
    await connection.rollback();
    console.error("Database error:", err);
    return res.status(500).json({
      error: "Erreur serveur lors de la création",
      details: err.message,
    });
  } finally {
    connection.release();
  }
};

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at 
       FROM doctors 
       ORDER BY created_at DESC`,
    );

    res.json({
      success: true,
      count: rows.length,
      doctors: rows || [],
    });

  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des médecins",
      details: error.message,
    });
  }
};

// Update doctor (for frontend edit functionality)
export const updateDoctor = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { firstName, lastName, email, cin, specialty } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !cin || !specialty) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format d'email invalide" });
    }

    // Check if doctor exists
    const [doctorExists] = await connection.execute(
      "SELECT id, email FROM doctors WHERE id = ?",
      [id]
    );

    if (doctorExists.length === 0) {
      return res.status(404).json({ error: "Médecin non trouvé" });
    }

    // Check if email exists for other doctors
    const [existingDoctors] = await connection.execute(
      "SELECT id FROM doctors WHERE email = ? AND id != ?",
      [email, id]
    );

    if (existingDoctors.length > 0) {
      return res.status(400).json({ error: "Un médecin avec cet email existe déjà" });
    }

    // Check if CIN exists for other doctors
    const [existingCIN] = await connection.execute(
      "SELECT id FROM doctors WHERE cin = ? AND id != ?",
      [cin, id]
    );

    if (existingCIN.length > 0) {
      return res.status(400).json({ error: "Un médecin avec ce CIN existe déjà" });
    }

    const oldEmail = doctorExists[0].email;

    // Update doctor
    await connection.execute(
      `UPDATE doctors SET prenom = ?, nom = ?, email = ?, cin = ?, specialty = ? 
       WHERE id = ?`,
      [firstName, lastName, email, cin, specialty, id]
    );

    // Update user email if changed
    if (email && email !== oldEmail) {
      await connection.execute(
        "UPDATE users SET email = ? WHERE email = ? AND role = ?",
        [email, oldEmail, "doctor"]
      );
    }

    // Get updated doctor
    const [updatedDoctor] = await connection.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at 
       FROM doctors WHERE id = ?`,
      [id]
    );

    await connection.commit();

    res.json({
      message: "Médecin modifié avec succès",
      doctor: updatedDoctor[0]
    });

  } catch (error) {
    await connection.rollback();
    console.error("Update error:", error);
    res.status(500).json({
      error: "Erreur lors de la modification",
      details: error.message
    });
  } finally {
    connection.release();
  }
};

// Update doctor profile
export const updateProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { firstName, lastName, email, cin, specialty } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !cin || !specialty) {
      return res
        .status(400)
        .json({ error: "Tous les champs sont obligatoires" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Format d'email invalide" });
    }

    // Check if doctor exists
    const [doctorExists] = await connection.execute(
      "SELECT id, email FROM doctors WHERE id = ?",
      [id],
    );

    if (doctorExists.length === 0) {
      return res.status(404).json({ error: "Médecin non trouvé" });
    }

    // Check if email exists for other doctors
    const [existingDoctors] = await connection.execute(
      "SELECT id FROM doctors WHERE email = ? AND id != ?",
      [email, id],
    );

    if (existingDoctors.length > 0) {
      return res
        .status(400)
        .json({ error: "Un médecin avec cet email existe déjà" });
    }

    // Check if CIN exists for other doctors
    const [existingCIN] = await connection.execute(
      "SELECT id FROM doctors WHERE cin = ? AND id != ?",
      [cin, id],
    );

    if (existingCIN.length > 0) {
      return res
        .status(400)
        .json({ error: "Un médecin avec ce CIN existe déjà" });
    }

    const oldEmail = doctorExists[0].email;

    // Update doctor
    await connection.execute(
      `UPDATE doctors SET prenom = ?, nom = ?, email = ?, cin = ?, specialty = ? 
       WHERE id = ?`,
      [firstName, lastName, email, cin, specialty, id],
    );

    // Update user email if changed
    if (email && email !== oldEmail) {
      await connection.execute(
        "UPDATE users SET email = ? WHERE email = ? AND role = ?",
        [email, oldEmail, "doctor"],
      );
    }

    // Get updated doctor
    const [updatedDoctor] = await connection.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at 
       FROM doctors WHERE id = ?`,
      [id],
    );

    await connection.commit();

    res.json({
      message: "Profil du médecin mis à jour avec succès",
      doctor: updatedDoctor[0],
    });

  } catch (error) {
    await connection.rollback();
    console.error("Update error:", error);
    res.status(500).json({
      error: "Erreur lors de la mise à jour",
      details: error.message,
    });
  } finally {
    connection.release();
  }
};

// Change doctor password
export const changePassword = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { old_password, new_password } = req.body;

    // Validation
    if (!old_password || !new_password) {
      return res
        .status(400)
        .json({ error: "Ancien et nouveau mot de passe requis" });
    }

    if (old_password.trim() === "" || new_password.trim() === "") {
      return res
        .status(400)
        .json({ error: "Les mots de passe ne peuvent pas être vides" });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        error: "Le nouveau mot de passe doit contenir au moins 6 caractères",
      });
    }

    // Get doctor data
    const [rows] = await connection.execute(
      "SELECT email, password FROM doctors WHERE id = ?",
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Médecin non trouvé" });
    }

    // Verify old password
    const match = await bcrypt.compare(old_password, rows[0].password);
    if (!match) {
      return res.status(400).json({ error: "Ancien mot de passe incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update doctor password
    await connection.execute("UPDATE doctors SET password = ? WHERE id = ?", [
      hashedPassword,
      id,
    ]);

    // Update user password
    await connection.execute(
      "UPDATE users SET password = ? WHERE email = ? AND role = ?",
      [hashedPassword, rows[0].email, "doctor"],
    );

    await connection.commit();

    res.json({
      message: "Mot de passe mis à jour avec succès",
      doctor_id: id,
    });

  } catch (error) {
    await connection.rollback();
    console.error("Password change error:", error);
    res.status(500).json({
      error: "Erreur lors du changement de mot de passe",
      details: error.message,
    });
  } finally {
    connection.release();
  }
};

// Delete doctor
export const deleteDoctor = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    // Check if doctor exists
    const [doctor] = await connection.execute(
      "SELECT id, email FROM doctors WHERE id = ?",
      [id],
    );

    if (doctor.length === 0) {
      return res.status(404).json({ error: "Médecin non trouvé" });
    }

    const email = doctor[0].email;

    // Delete doctor
    await connection.execute("DELETE FROM doctors WHERE id = ?", [id]);

    // Delete associated user account
    await connection.execute("DELETE FROM users WHERE email = ? AND role = ?", [
      email,
      "doctor",
    ]);

    await connection.commit();

    res.json({
      message: "Médecin et compte utilisateur supprimés avec succès",
      deleted_doctor_id: id,
    });

  } catch (error) {
    await connection.rollback();
    console.error("Delete error:", error);
    res.status(500).json({
      error: "Erreur lors de la suppression",
      details: error.message,
    });
  } finally {
    connection.release();
  }
};

// Toggle doctor status
export const toggleDoctorStatus = async (req, res) => {
  try {
    const { active } = req.body;
    const { id } = req.params;

    // Validate input
    if (typeof active !== "boolean") {
      return res
        .status(400)
        .json({ error: "Le statut actif doit être true ou false" });
    }

    // Check if doctor exists
    const [doctor] = await db.execute("SELECT id FROM doctors WHERE id = ?", [
      id,
    ]);

    if (doctor.length === 0) {
      return res.status(404).json({ error: "Médecin non trouvé" });
    }

    // Update status
    await db.execute("UPDATE doctors SET is_active = ? WHERE id = ?", [
      active ? 1 : 0,
      id,
    ]);

    // Get updated doctor
    const [updatedDoctor] = await db.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at 
       FROM doctors WHERE id = ?`,
      [id],
    );

    res.json({
      message: `Médecin ${active ? "activé" : "désactivé"} avec succès`,
      doctor: updatedDoctor[0],
    });

  } catch (error) {
    console.error("Status update error:", error);
    res.status(500).json({
      error: "Erreur lors du changement de statut",
      details: error.message,
    });
  }
};

// Get doctors by specialty
export const getDoctorsBySpecialty = async (req, res) => {
  try {
    const { specialty } = req.params;

    const [rows] = await db.execute(
      `SELECT id, nom, prenom, email, cin, specialty, is_active, created_at 
       FROM doctors 
       WHERE specialty = ? AND is_active = 1
       ORDER BY nom, prenom`,
      [specialty],
    );

    res.json({
      success: true,
      specialty: specialty,
      count: rows.length,
      doctors: rows,
    });

  } catch (error) {
    console.error("Error fetching doctors by specialty:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des médecins par spécialité",
      details: error.message,
    });
  }
};

// Get available specialties
export const getSpecialties = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT DISTINCT specialty, COUNT(*) as doctor_count 
       FROM doctors 
       WHERE is_active = 1 
       GROUP BY specialty 
       ORDER BY specialty`,
    );

    res.json({
      success: true,
      count: rows.length,
      specialties: rows,
    });

  } catch (error) {
    console.error("Error fetching specialties:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des spécialités",
      details: error.message,
    });
  }
};




export default {
  getProfile,
  createDoctor,
  getAllDoctors,
  updateDoctor,
  updateProfile,
  changePassword,
  deleteDoctor,
  toggleDoctorStatus,
  getDoctorsBySpecialty,
  getSpecialties,
};

