import bcrypt from "bcryptjs";
import db from "../db.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const ALLOWED_ROLES = ["admin", "pharmacist", "doctor", "supplier", "secretaire", "pation"];

const normalizeRole = (role) => String(role || "").trim().toLowerCase();
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const buildDisplayName = (nom, prenom, fallback = "") => {
  const full = [prenom, nom].filter(Boolean).join(" ").trim();
  return full || fallback;
};

const getProfileForUser = async (role, email) => {
  if (!role || !email) {
    return {};
  }

  switch (role) {
    case "admin": {
      const [rows] = await db.execute(
        "SELECT id, full_name, phone, address FROM admin WHERE email = ? LIMIT 1",
        [email],
      );
      if (rows.length === 0) return {};
      return {
        entityId: rows[0].id,
        name: rows[0].full_name,
        phone: rows[0].phone || null,
        address: rows[0].address || null,
      };
    }

    case "pharmacist": {
      const [rows] = await db.execute(
        `SELECT id_pharmacie, nom_pharmacie, president_pharmacie, telephone, is_active
         FROM pharmacie WHERE email = ? LIMIT 1`,
        [email],
      );
      if (rows.length === 0) return {};
      return {
        entityId: rows[0].id_pharmacie,
        name: rows[0].nom_pharmacie,
        nom: rows[0].president_pharmacie || null,
        prenom: null,
        phone: rows[0].telephone || null,
        is_active: Boolean(rows[0].is_active),
      };
    }

    case "doctor": {
      const [rows] = await db.execute(
        "SELECT id, nom, prenom, specialty, cin, is_active FROM doctors WHERE email = ? LIMIT 1",
        [email],
      );
      if (rows.length === 0) return {};
      return {
        entityId: rows[0].id,
        name: buildDisplayName(rows[0].nom, rows[0].prenom, "Doctor"),
        nom: rows[0].nom || null,
        prenom: rows[0].prenom || null,
        specialty: rows[0].specialty || null,
        cin: rows[0].cin || null,
        is_active: Boolean(rows[0].is_active),
      };
    }

    case "supplier": {
      const [rows] = await db.execute(
        "SELECT id, nom, prenom, telephone, is_active FROM suppliers WHERE email = ? LIMIT 1",
        [email],
      );
      if (rows.length === 0) return {};
      return {
        entityId: rows[0].id,
        name: buildDisplayName(rows[0].nom, rows[0].prenom, "Supplier"),
        nom: rows[0].nom || null,
        prenom: rows[0].prenom || null,
        phone: rows[0].telephone || null,
        is_active: Boolean(rows[0].is_active),
      };
    }

    case "secretaire": {
      const [rows] = await db.execute(
        `SELECT s.id, s.nom, s.prenom, s.telephone, s.is_active, s.doctor_id, d.nom AS doctor_nom, d.prenom AS doctor_prenom
         FROM secretaries s
         INNER JOIN doctors d ON d.id = s.doctor_id
         WHERE s.email = ?
         LIMIT 1`,
        [email],
      );
      if (rows.length === 0) return {};
      return {
        entityId: rows[0].id,
        name: buildDisplayName(rows[0].nom, rows[0].prenom, "Secretaire"),
        nom: rows[0].nom || null,
        prenom: rows[0].prenom || null,
        phone: rows[0].telephone || null,
        is_active: Boolean(rows[0].is_active),
        doctor_id: rows[0].doctor_id,
        doctor_name: buildDisplayName(rows[0].doctor_nom, rows[0].doctor_prenom, "Docteur"),
      };
    }

    case "pation": {
      const [rows] = await db.execute(
        `SELECT p.id, p.user_id, p.nom, p.prenom, p.email, p.telephone, p.cin, p.date_naissance, p.city, p.latitude, p.longitude, p.is_active
         FROM patient_portal_profiles p
         WHERE p.email = ?
         LIMIT 1`,
        [email],
      );
      if (rows.length === 0) return {};
      return {
        entityId: rows[0].user_id || rows[0].id,
        profile_id: rows[0].id,
        name: buildDisplayName(rows[0].nom, rows[0].prenom, "Patient"),
        nom: rows[0].nom || null,
        prenom: rows[0].prenom || null,
        phone: rows[0].telephone || null,
        cin: rows[0].cin || null,
        date_naissance: rows[0].date_naissance || null,
        city: rows[0].city || null,
        latitude: rows[0].latitude ?? null,
        longitude: rows[0].longitude ?? null,
        is_active: Boolean(rows[0].is_active),
      };
    }

    default:
      return {};
  }
};

export const createAndSaveUser = async (email, password, role) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeRole(role);

  if (!normalizedEmail || !password || !normalizedRole) {
    throw new Error("All fields (email, password, role) are required for user creation");
  }

  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    throw new Error(`Role "${normalizedRole}" is not supported`);
  }

  try {
    const [existingUsers] = await db.execute("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
    if (existingUsers.length > 0) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [
      normalizedEmail,
      hashedPassword,
      normalizedRole,
    ]);

    return {
      success: true,
      message: "User account created successfully",
      userId: result.insertId,
      email: normalizedEmail,
      role: normalizedRole,
    };
  } catch (err) {
    console.error("Error in createAndSaveUser:", err);
    throw err;
  }
};

export const createUser = async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const result = await createAndSaveUser(email, password, role);
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: result.userId,
        email: result.email,
        role: result.role,
      },
    });
  } catch (err) {
    console.error("Error creating user via /register:", err);
    if (err.message.includes("User with this email already exists")) {
      return res.status(409).json({ error: err.message });
    }
    if (err.message.includes("not supported")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: `Server error: ${err.message}` });
  }
};

export const loginUser = async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const [rows] = await db.execute("SELECT * FROM users WHERE email = ? LIMIT 1", [email]);
    if (rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const role = normalizeRole(user.role);
    const profile = await getProfileForUser(role, email);
    const entityId = profile.entityId || user.id;

    const token = jwt.sign({ id: user.id, role, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    const { entityId: _entityId, ...profilePayload } = profile;
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: entityId,
        userId: user.id,
        email: user.email,
        role,
        ...profilePayload,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const verifyAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    if (normalizeRole(decoded.role) !== "admin") {
      return res.status(403).json({ message: "Acces refuse : administrateur uniquement" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token invalide ou expire" });
  }
};

export default {
  createAndSaveUser,
  createUser,
  loginUser,
  verifyAdmin,
};
