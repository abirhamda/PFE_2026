
import bcrypt from "bcryptjs";
import db from "../db.js";

const DEFAULT_SLOT_DURATION = 20;

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const pad2 = (num) => String(num).padStart(2, "0");

const formatDateTime = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(
    date.getMinutes(),
  )}:${pad2(date.getSeconds())}`;

const toSqlDateTime = (value) => {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    const normalized = raw.replace("T", " ");
    return normalized.length === 16 ? `${normalized}:00` : normalized;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatDateTime(date);
};

const parseDateOnlyString = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const raw = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
};

const parseNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const timeToMinutes = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

const defaultWorkingHours = () => ({
  0: { enabled: false, start: "09:00", end: "17:00" },
  1: { enabled: true, start: "09:00", end: "17:00" },
  2: { enabled: true, start: "09:00", end: "17:00" },
  3: { enabled: true, start: "09:00", end: "17:00" },
  4: { enabled: true, start: "09:00", end: "17:00" },
  5: { enabled: true, start: "09:00", end: "17:00" },
  6: { enabled: true, start: "09:00", end: "13:00" },
});

const sanitizeWorkingHours = (input) => {
  const defaults = defaultWorkingHours();

  let parsed = null;
  if (typeof input === "string" && input.trim()) {
    try {
      parsed = JSON.parse(input);
    } catch (_error) {
      parsed = null;
    }
  } else if (input && typeof input === "object") {
    parsed = input;
  }

  if (!parsed || typeof parsed !== "object") {
    return defaults;
  }

  const normalized = { ...defaults };
  for (let day = 0; day <= 6; day += 1) {
    const key = String(day);
    const source = parsed[key] || parsed[day];
    if (!source || typeof source !== "object") continue;

    const start = String(source.start || normalized[key].start);
    const end = String(source.end || normalized[key].end);
    const enabled = Boolean(source.enabled);

    if (timeToMinutes(start) !== null && timeToMinutes(end) !== null) {
      normalized[key] = { enabled, start, end };
    }
  }

  return normalized;
};

const computeDistanceKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const resolveDoctorContextForProvider = async (connection, user) => {
  const role = normalizeRole(user?.role);
  const email = normalizeEmail(user?.email);

  if (!email) {
    return null;
  }

  if (role === "doctor") {
    const [rows] = await connection.execute("SELECT id, nom, prenom, specialty FROM doctors WHERE email = ? LIMIT 1", [
      email,
    ]);
    if (rows.length === 0) return null;
    return {
      role,
      doctorId: Number(rows[0].id),
      doctor: rows[0],
      secretaryId: null,
    };
  }

  if (role === "secretaire") {
    const [rows] = await connection.execute(
      `SELECT s.id, s.doctor_id, d.nom AS doctor_nom, d.prenom AS doctor_prenom, d.specialty
       FROM secretaries s
       INNER JOIN doctors d ON d.id = s.doctor_id
       WHERE s.email = ?
       LIMIT 1`,
      [email],
    );

    if (rows.length === 0) return null;
    return {
      role,
      doctorId: Number(rows[0].doctor_id),
      doctor: {
        id: rows[0].doctor_id,
        nom: rows[0].doctor_nom,
        prenom: rows[0].doctor_prenom,
        specialty: rows[0].specialty,
      },
      secretaryId: Number(rows[0].id),
    };
  }

  return null;
};

const getPatientProfileByUserId = async (connection, userId) => {
  const [rows] = await connection.execute(
    `SELECT id, user_id, nom, prenom, email, telephone, cin, date_naissance, city, latitude, longitude, is_active, created_at, updated_at
     FROM patient_portal_profiles
     WHERE user_id = ?
     LIMIT 1`,
    [userId],
  );

  return rows[0] || null;
};

const getExistingDoctorPatientFromPatientAccount = async (connection, doctorId, patientProfile) => {
  const cin = String(patientProfile?.cin || "").trim();
  const nom = String(patientProfile?.nom || "").trim();
  const prenom = String(patientProfile?.prenom || "").trim();
  const telephone = patientProfile?.telephone ? String(patientProfile.telephone).trim() : null;

  if (cin) {
    const [rows] = await connection.execute(
      `SELECT id, matricule, nom, prenom, cin, telephone, date_naissance
       FROM doctor_patients
       WHERE doctor_id = ? AND cin = ?
       LIMIT 1`,
      [doctorId, cin],
    );

    if (rows.length > 0) {
      return rows[0];
    }
  }

  const [rowsByIdentity] = await connection.execute(
    `SELECT id, matricule, nom, prenom, cin, telephone, date_naissance
     FROM doctor_patients
     WHERE doctor_id = ?
       AND nom = ?
       AND prenom = ?
       AND IFNULL(telephone, '') = IFNULL(?, '')
     LIMIT 1`,
    [doctorId, nom, prenom, telephone],
  );

  if (rowsByIdentity.length > 0) {
    return rowsByIdentity[0];
  }

  return null;
};

const ensureDoctorPublicProfileExists = async (connection, doctorId) => {
  const [doctorRows] = await connection.execute(
    `SELECT id, nom, prenom, specialty
     FROM doctors
     WHERE id = ?
     LIMIT 1`,
    [doctorId],
  );

  if (doctorRows.length === 0) {
    return null;
  }

  const doctor = doctorRows[0];
  const [existingRows] = await connection.execute(
    "SELECT doctor_id FROM doctor_public_profiles WHERE doctor_id = ? LIMIT 1",
    [doctorId],
  );

  if (existingRows.length === 0) {
    const displayName = `${doctor.prenom || ""} ${doctor.nom || ""}`.trim();
    await connection.execute(
      `INSERT INTO doctor_public_profiles
       (doctor_id, display_name, consultation_duration_min, working_hours_json, online_visibility, online_booking_enabled)
       VALUES (?, ?, ?, ?, 0, 0)`,
      [doctorId, displayName, DEFAULT_SLOT_DURATION, JSON.stringify(defaultWorkingHours())],
    );
  }

  const [rows] = await connection.execute(
    `SELECT d.id AS doctor_id, d.nom, d.prenom, d.specialty,
            p.display_name, p.public_phone, p.address_line, p.city, p.latitude, p.longitude,
            p.consultation_fee, p.consultation_duration_min, p.working_hours_json, p.bio,
            p.online_visibility, p.online_booking_enabled, p.updated_at
     FROM doctors d
     LEFT JOIN doctor_public_profiles p ON p.doctor_id = d.id
     WHERE d.id = ?
     LIMIT 1`,
    [doctorId],
  );

  return rows[0] || null;
};

const buildAvailableSlots = async (connection, doctorId, profileRow, options = {}) => {
  const slotLimit = Number(options.slotLimit || 60);
  const daysAhead = Number(options.daysAhead || 28);

  const workingHours = sanitizeWorkingHours(profileRow?.working_hours_json);
  const duration = Number(profileRow?.consultation_duration_min || DEFAULT_SLOT_DURATION);

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysAhead);
  endDate.setHours(23, 59, 59, 0);

  const [bookedRows] = await connection.execute(
    `SELECT appointment_at
     FROM appointments
     WHERE doctor_id = ?
       AND appointment_at BETWEEN ? AND ?`,
    [doctorId, formatDateTime(startDate), formatDateTime(endDate)],
  );

  const bookedSet = new Set(
    bookedRows.map((row) => formatDateTime(new Date(String(row.appointment_at).replace(" ", "T")))),
  );

  const slots = [];
  for (let dayOffset = 0; dayOffset <= daysAhead; dayOffset += 1) {
    if (slots.length >= slotLimit) break;

    const dayDate = new Date();
    dayDate.setDate(dayDate.getDate() + dayOffset);
    dayDate.setHours(0, 0, 0, 0);

    const dayConfig = workingHours[String(dayDate.getDay())] || { enabled: false };
    if (!dayConfig.enabled) {
      continue;
    }

    const startMinutes = timeToMinutes(dayConfig.start);
    const endMinutes = timeToMinutes(dayConfig.end);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      continue;
    }

    for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += duration) {
      const candidate = new Date(dayDate);
      candidate.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

      if (candidate.getTime() <= Date.now()) {
        continue;
      }

      const candidateSql = formatDateTime(candidate);
      if (bookedSet.has(candidateSql)) {
        continue;
      }

      slots.push(candidateSql);
      if (slots.length >= slotLimit) {
        break;
      }
    }
  }

  return slots;
};

const isBookableSlotAgainstSchedule = (appointmentDate, profileRow) => {
  const workingHours = sanitizeWorkingHours(profileRow?.working_hours_json);
  const duration = Number(profileRow?.consultation_duration_min || DEFAULT_SLOT_DURATION);

  const dayConfig = workingHours[String(appointmentDate.getDay())] || { enabled: false };
  if (!dayConfig.enabled) {
    return false;
  }

  const startMinutes = timeToMinutes(dayConfig.start);
  const endMinutes = timeToMinutes(dayConfig.end);
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return false;
  }

  const selectedMinutes = appointmentDate.getHours() * 60 + appointmentDate.getMinutes();
  if (selectedMinutes < startMinutes || selectedMinutes + duration > endMinutes) {
    return false;
  }

  return (selectedMinutes - startMinutes) % duration === 0;
};
export const registerPatientPortalAccount = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const nom = String(req.body?.nom || "").trim();
    const prenom = String(req.body?.prenom || "").trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ error: "nom, prenom, email et password sont obligatoires" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caracteres" });
    }

    const telephone = req.body?.telephone ? String(req.body.telephone).trim() : null;
    const cin = req.body?.cin ? String(req.body.cin).trim() : null;
    const dateNaissance = parseDateOnlyString(req.body?.date_naissance);
    const city = req.body?.city ? String(req.body.city).trim() : null;
    const latitude = parseNumberOrNull(req.body?.latitude);
    const longitude = parseNumberOrNull(req.body?.longitude);

    await connection.beginTransaction();

    const [existingUsers] = await connection.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({ error: "Un compte avec cet email existe deja" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [userInsert] = await connection.execute(
      "INSERT INTO users (email, password, role) VALUES (?, ?, 'pation')",
      [email, hashedPassword],
    );

    await connection.execute(
      `INSERT INTO patient_portal_profiles
       (user_id, nom, prenom, email, telephone, cin, date_naissance, city, latitude, longitude, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [userInsert.insertId, nom, prenom, email, telephone, cin, dateNaissance, city, latitude, longitude],
    );

    await connection.commit();

    return res.status(201).json({
      message: "Compte patient cree avec succes",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error registering patient portal account:", error);
    return res.status(500).json({ error: "Erreur lors de l'inscription", details: error.message });
  } finally {
    connection.release();
  }
};

export const getMyPatientPortalProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Token utilisateur invalide" });
    }

    const profile = await getPatientProfileByUserId(connection, userId);
    if (!profile) {
      return res.status(404).json({ error: "Profil patient introuvable" });
    }

    return res.json({ success: true, profile });
  } catch (error) {
    console.error("Error getting patient portal profile:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation du profil", details: error.message });
  } finally {
    connection.release();
  }
};

export const updateMyPatientPortalProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Token utilisateur invalide" });
    }

    const profile = await getPatientProfileByUserId(connection, userId);
    if (!profile) {
      return res.status(404).json({ error: "Profil patient introuvable" });
    }

    const nom = String(req.body?.nom || profile.nom || "").trim();
    const prenom = String(req.body?.prenom || profile.prenom || "").trim();
    const telephone = req.body?.telephone !== undefined ? String(req.body.telephone || "").trim() || null : profile.telephone;
    const cin = req.body?.cin !== undefined ? String(req.body.cin || "").trim() || null : profile.cin;
    const dateNaissance =
      req.body?.date_naissance !== undefined
        ? parseDateOnlyString(req.body?.date_naissance)
        : parseDateOnlyString(profile.date_naissance);
    const city = req.body?.city !== undefined ? String(req.body.city || "").trim() || null : profile.city;
    const latitude = req.body?.latitude !== undefined ? parseNumberOrNull(req.body.latitude) : parseNumberOrNull(profile.latitude);
    const longitude =
      req.body?.longitude !== undefined ? parseNumberOrNull(req.body.longitude) : parseNumberOrNull(profile.longitude);

    if (!nom || !prenom) {
      return res.status(400).json({ error: "nom et prenom sont obligatoires" });
    }

    await connection.execute(
      `UPDATE patient_portal_profiles
       SET nom = ?, prenom = ?, telephone = ?, cin = ?, date_naissance = ?, city = ?, latitude = ?, longitude = ?, updated_at = NOW()
       WHERE user_id = ?`,
      [nom, prenom, telephone, cin, dateNaissance, city, latitude, longitude, userId],
    );

    const updated = await getPatientProfileByUserId(connection, userId);
    return res.json({ message: "Profil patient mis a jour", profile: updated });
  } catch (error) {
    console.error("Error updating patient portal profile:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour du profil", details: error.message });
  } finally {
    connection.release();
  }
};

export const getProviderPublicProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveDoctorContextForProvider(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Acces reserve au medecin ou a la secretaire" });
    }

    const row = await ensureDoctorPublicProfileExists(connection, context.doctorId);
    if (!row) {
      return res.status(404).json({ error: "Docteur introuvable" });
    }

    return res.json({ success: true, profile: row });
  } catch (error) {
    console.error("Error getting provider public profile:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation du profil public", details: error.message });
  } finally {
    connection.release();
  }
};

export const updateProviderPublicProfile = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveDoctorContextForProvider(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Acces reserve au medecin ou a la secretaire" });
    }

    const current = await ensureDoctorPublicProfileExists(connection, context.doctorId);
    if (!current) {
      return res.status(404).json({ error: "Docteur introuvable" });
    }

    const next = {
      display_name:
        req.body?.display_name !== undefined
          ? String(req.body.display_name || "").trim() || null
          : current.display_name,
      public_phone:
        req.body?.public_phone !== undefined
          ? String(req.body.public_phone || "").trim() || null
          : current.public_phone,
      address_line:
        req.body?.address_line !== undefined
          ? String(req.body.address_line || "").trim() || null
          : current.address_line,
      city: req.body?.city !== undefined ? String(req.body.city || "").trim() || null : current.city,
      latitude: req.body?.latitude !== undefined ? parseNumberOrNull(req.body.latitude) : parseNumberOrNull(current.latitude),
      longitude:
        req.body?.longitude !== undefined
          ? parseNumberOrNull(req.body.longitude)
          : parseNumberOrNull(current.longitude),
      consultation_fee:
        req.body?.consultation_fee !== undefined
          ? parseNumberOrNull(req.body.consultation_fee)
          : parseNumberOrNull(current.consultation_fee),
      consultation_duration_min:
        req.body?.consultation_duration_min !== undefined
          ? Math.max(5, Math.min(120, Number(req.body.consultation_duration_min) || DEFAULT_SLOT_DURATION))
          : Number(current.consultation_duration_min || DEFAULT_SLOT_DURATION),
      bio: req.body?.bio !== undefined ? String(req.body.bio || "").trim() || null : current.bio,
      online_visibility:
        req.body?.online_visibility !== undefined
          ? Boolean(req.body.online_visibility)
          : Boolean(current.online_visibility),
      online_booking_enabled:
        req.body?.online_booking_enabled !== undefined
          ? Boolean(req.body.online_booking_enabled)
          : Boolean(current.online_booking_enabled),
      working_hours_json: JSON.stringify(
        sanitizeWorkingHours(req.body?.working_hours ?? current.working_hours_json),
      ),
    };

    await connection.execute(
      `UPDATE doctor_public_profiles
       SET display_name = ?, public_phone = ?, address_line = ?, city = ?, latitude = ?, longitude = ?,
           consultation_fee = ?, consultation_duration_min = ?, working_hours_json = ?, bio = ?,
           online_visibility = ?, online_booking_enabled = ?, updated_at = NOW()
       WHERE doctor_id = ?`,
      [
        next.display_name,
        next.public_phone,
        next.address_line,
        next.city,
        next.latitude,
        next.longitude,
        next.consultation_fee,
        next.consultation_duration_min,
        next.working_hours_json,
        next.bio,
        next.online_visibility ? 1 : 0,
        next.online_booking_enabled ? 1 : 0,
        context.doctorId,
      ],
    );

    const updated = await ensureDoctorPublicProfileExists(connection, context.doctorId);
    return res.json({ message: "Profil public mis a jour", profile: updated });
  } catch (error) {
    console.error("Error updating provider public profile:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour du profil public", details: error.message });
  } finally {
    connection.release();
  }
};
export const searchPublicDoctors = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const name = String(req.query?.name || "").trim();
    const specialty = String(req.query?.specialty || "").trim();
    const city = String(req.query?.city || "").trim();
    const patientLat = parseNumberOrNull(req.query?.lat);
    const patientLng = parseNumberOrNull(req.query?.lng);
    const radiusKm = Math.max(1, Math.min(200, Number(req.query?.radius_km || 50)));
    const limit = Math.max(1, Math.min(40, Number(req.query?.limit || 20)));

    const conditions = ["d.is_active = 1"];
    const params = [];

    if (name) {
      conditions.push("(d.nom LIKE ? OR d.prenom LIKE ? OR CONCAT(d.prenom, ' ', d.nom) LIKE ? OR p.display_name LIKE ?)");
      params.push(`%${name}%`, `%${name}%`, `%${name}%`, `%${name}%`);
    }

    if (specialty) {
      conditions.push("d.specialty LIKE ?");
      params.push(`%${specialty}%`);
    }

    if (city) {
      conditions.push("(p.city LIKE ? OR p.address_line LIKE ?)");
      params.push(`%${city}%`, `%${city}%`);
    }

    params.push(limit);

    const [rows] = await connection.execute(
      `SELECT d.id AS doctor_id, d.nom, d.prenom, d.specialty,
              COALESCE(p.display_name, CONCAT(d.prenom, ' ', d.nom)) AS display_name,
              p.public_phone, p.address_line, p.city, p.latitude, p.longitude,
              p.consultation_fee, COALESCE(p.consultation_duration_min, ?) AS consultation_duration_min,
              p.working_hours_json, p.bio,
              COALESCE(p.online_visibility, 0) AS online_visibility,
              COALESCE(p.online_booking_enabled, 0) AS online_booking_enabled
       FROM doctors d
       LEFT JOIN doctor_public_profiles p ON p.doctor_id = d.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY d.nom ASC, d.prenom ASC
       LIMIT ?`,
      [DEFAULT_SLOT_DURATION, ...params],
    );

    const doctors = [];
    for (const row of rows) {
      const lat = parseNumberOrNull(row.latitude);
      const lng = parseNumberOrNull(row.longitude);
      const distanceKm =
        patientLat !== null && patientLng !== null && lat !== null && lng !== null
          ? Number(computeDistanceKm(patientLat, patientLng, lat, lng).toFixed(2))
          : null;

      if (distanceKm !== null && distanceKm > radiusKm) {
        continue;
      }

      const onlineVisible = Boolean(Number(row.online_visibility || 0));
      const onlineBookable = onlineVisible && Boolean(Number(row.online_booking_enabled || 0));
      const slots = onlineBookable
        ? await buildAvailableSlots(connection, Number(row.doctor_id), row, { daysAhead: 28, slotLimit: 84 })
        : [];

      doctors.push({
        doctor_id: Number(row.doctor_id),
        display_name: row.display_name,
        nom: row.nom,
        prenom: row.prenom,
        specialty: row.specialty,
        public_phone: row.public_phone || null,
        address_line: row.address_line || null,
        city: row.city || null,
        distance_km: distanceKm,
        consultation_fee: parseNumberOrNull(row.consultation_fee),
        consultation_duration_min: Number(row.consultation_duration_min || DEFAULT_SLOT_DURATION),
        working_hours: sanitizeWorkingHours(row.working_hours_json),
        bio: row.bio || null,
        online_visibility: onlineVisible,
        online_booking_enabled: onlineBookable,
        available_slots: slots,
      });
    }

    if (patientLat !== null && patientLng !== null) {
      doctors.sort((left, right) => {
        if (left.distance_km === null && right.distance_km === null) return 0;
        if (left.distance_km === null) return 1;
        if (right.distance_km === null) return -1;
        return left.distance_km - right.distance_km;
      });
    }

    return res.json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (error) {
    console.error("Error searching public doctors:", error);
    return res.status(500).json({ error: "Erreur lors de la recherche des medecins", details: error.message });
  } finally {
    connection.release();
  }
};

export const getPublicDoctorAvailability = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const doctorId = Number(req.params.doctorId);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: "doctorId invalide" });
    }

    const [rows] = await connection.execute(
      `SELECT d.id AS doctor_id, d.nom, d.prenom, d.specialty,
              p.display_name, p.working_hours_json,
              COALESCE(p.consultation_duration_min, ?) AS consultation_duration_min,
              COALESCE(p.online_visibility, 0) AS online_visibility,
              COALESCE(p.online_booking_enabled, 0) AS online_booking_enabled
       FROM doctors d
       LEFT JOIN doctor_public_profiles p ON p.doctor_id = d.id
       WHERE d.id = ? AND d.is_active = 1
       LIMIT 1`,
      [DEFAULT_SLOT_DURATION, doctorId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Medecin introuvable" });
    }

    const doctor = rows[0];
    const onlineVisible = Boolean(Number(doctor.online_visibility || 0));
    const onlineBookable = onlineVisible && Boolean(Number(doctor.online_booking_enabled || 0));

    if (!onlineBookable) {
      return res.json({
        success: true,
        doctor_id: doctorId,
        online_booking_enabled: false,
        available_slots: [],
      });
    }

    const slots = await buildAvailableSlots(connection, doctorId, doctor, {
      daysAhead: Math.max(1, Math.min(45, Number(req.query?.days || 14))),
      slotLimit: Math.max(1, Math.min(40, Number(req.query?.limit || 16))),
    });

    return res.json({
      success: true,
      doctor_id: doctorId,
      online_booking_enabled: true,
      available_slots: slots,
    });
  } catch (error) {
    console.error("Error loading doctor availability:", error);
    return res.status(500).json({ error: "Erreur lors du chargement des disponibilites", details: error.message });
  } finally {
    connection.release();
  }
};

export const bookAppointmentOnline = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Token utilisateur invalide" });
    }

    const profile = await getPatientProfileByUserId(connection, userId);
    if (!profile) {
      return res.status(404).json({ error: "Profil patient introuvable" });
    }

    const doctorId = Number(req.body?.doctor_id);
    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({ error: "doctor_id invalide" });
    }

    const appointmentAtSql = toSqlDateTime(req.body?.appointment_at);
    if (!appointmentAtSql) {
      return res.status(400).json({ error: "appointment_at invalide" });
    }

    const appointmentDate = new Date(appointmentAtSql.replace(" ", "T"));
    if (Number.isNaN(appointmentDate.getTime()) || appointmentDate.getTime() <= Date.now()) {
      return res.status(400).json({ error: "Le creneau doit etre dans le futur" });
    }

    const [doctorRows] = await connection.execute(
      `SELECT d.id, d.nom, d.prenom, d.specialty,
              p.working_hours_json,
              COALESCE(p.consultation_duration_min, ?) AS consultation_duration_min,
              COALESCE(p.online_visibility, 0) AS online_visibility,
              COALESCE(p.online_booking_enabled, 0) AS online_booking_enabled
       FROM doctors d
       LEFT JOIN doctor_public_profiles p ON p.doctor_id = d.id
       WHERE d.id = ? AND d.is_active = 1
       LIMIT 1`,
      [DEFAULT_SLOT_DURATION, doctorId],
    );

    if (doctorRows.length === 0) {
      return res.status(404).json({ error: "Medecin introuvable" });
    }

    const doctor = doctorRows[0];
    const onlineAllowed = Boolean(Number(doctor.online_visibility || 0)) && Boolean(Number(doctor.online_booking_enabled || 0));
    if (!onlineAllowed) {
      return res.status(403).json({ error: "Le medecin n'accepte pas les rendez-vous en ligne" });
    }

    if (!isBookableSlotAgainstSchedule(appointmentDate, doctor)) {
      return res.status(400).json({ error: "Ce creneau ne correspond pas aux disponibilites configurees" });
    }

    const [existingAtSlot] = await connection.execute(
      `SELECT id
       FROM appointments
       WHERE doctor_id = ? AND appointment_at = ?
       LIMIT 1`,
      [doctorId, appointmentAtSql],
    );
    if (existingAtSlot.length > 0) {
      return res.status(409).json({ error: "Ce creneau vient d'etre reserve" });
    }

    await connection.beginTransaction();

    const doctorPatient = await getExistingDoctorPatientFromPatientAccount(connection, doctorId, profile);
    const patientNom = doctorPatient?.nom || String(profile?.nom || "").trim();
    const patientPrenom = doctorPatient?.prenom || String(profile?.prenom || "").trim();
    const patientCin = doctorPatient?.cin || String(profile?.cin || "").trim() || null;
    const patientPhone = doctorPatient?.telephone || (profile?.telephone ? String(profile.telephone).trim() : null);
    const patientDateNaissance =
      doctorPatient?.date_naissance || parseDateOnlyString(profile?.date_naissance) || null;

    if (!patientNom || !patientPrenom) {
      await connection.rollback();
      return res.status(400).json({ error: "Le profil patient est incomplet (nom/prenom requis)" });
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO appointments
       (doctor_id, secretary_id, patient_id, booked_by_patient_user_id, patient_matricule, patient_nom, patient_prenom,
        patient_cin, patient_phone, patient_date_naissance,
        appointment_at, payment_amount, payment_doctor_comment, doctor_notes, created_by_role, created_at, updated_at)
       VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 'doctor', NOW(), NOW())`,
      [
        doctorId,
        doctorPatient?.id || null,
        userId,
        doctorPatient?.matricule || null,
        patientNom,
        patientPrenom,
        patientCin,
        patientPhone,
        patientDateNaissance,
        appointmentAtSql,
      ],
    );

    const [appointmentRows] = await connection.execute(
      `SELECT a.id, a.doctor_id, a.secretary_id, a.patient_id, a.booked_by_patient_user_id, a.patient_matricule,
              a.patient_nom, a.patient_prenom, a.patient_cin, a.patient_phone, a.patient_date_naissance,
              a.appointment_at, a.payment_amount, a.payment_doctor_comment, a.doctor_notes, a.created_by_role,
              a.created_at, a.updated_at,
              d.nom AS doctor_nom, d.prenom AS doctor_prenom, d.specialty AS doctor_specialty
       FROM appointments a
       INNER JOIN doctors d ON d.id = a.doctor_id
       WHERE a.id = ?
       LIMIT 1`,
      [insertResult.insertId],
    );

    await connection.commit();

    return res.status(201).json({
      message: "Rendez-vous reserve avec succes",
      appointment: appointmentRows[0] || null,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error booking online appointment:", error);
    return res.status(500).json({ error: "Erreur lors de la reservation", details: error.message });
  } finally {
    connection.release();
  }
};

export const getMyBookedAppointments = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Token utilisateur invalide" });
    }

    const [rows] = await connection.execute(
      `SELECT a.id, a.doctor_id, a.patient_id, a.patient_matricule, a.patient_nom, a.patient_prenom,
              a.patient_cin, a.patient_phone, a.patient_date_naissance,
              a.appointment_at, a.payment_amount, a.payment_doctor_comment, a.doctor_notes, a.created_by_role,
              a.created_at, a.updated_at,
              d.nom AS doctor_nom, d.prenom AS doctor_prenom, d.specialty AS doctor_specialty
       FROM appointments a
       INNER JOIN doctors d ON d.id = a.doctor_id
       WHERE a.booked_by_patient_user_id = ?
       ORDER BY a.appointment_at DESC`,
      [userId],
    );

    return res.json({
      success: true,
      count: rows.length,
      appointments: rows,
    });
  } catch (error) {
    console.error("Error loading patient appointments:", error);
    return res.status(500).json({ error: "Erreur lors du chargement des rendez-vous", details: error.message });
  } finally {
    connection.release();
  }
};

export const getMyOrdonnances = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Token utilisateur invalide" });
    }

    const profile = await getPatientProfileByUserId(connection, userId);
    if (!profile) {
      return res.status(404).json({ error: "Profil patient introuvable" });
    }

    const cin = String(profile.cin || "").trim();
    if (!cin) {
      return res.json({ success: true, count: 0, ordonnances: [] });
    }

    const [rows] = await connection.execute(
      `SELECT o.id, o.doctor_id, o.cin, o.nom, o.prenom, o.ordonnance, o.status, o.created_at,
              d.nom AS doctor_nom, d.prenom AS doctor_prenom, d.specialty AS doctor_specialty
       FROM ordonnances o
       LEFT JOIN doctors d ON d.id = o.doctor_id
       WHERE o.cin = ?
       ORDER BY o.created_at DESC`,
      [cin],
    );

    return res.json({ success: true, count: rows.length, ordonnances: rows });
  } catch (error) {
    console.error("Error loading patient ordonnances:", error);
    return res.status(500).json({ error: "Erreur lors du chargement des ordonnances", details: error.message });
  } finally {
    connection.release();
  }
};

export const getMyDocuments = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const userId = Number(req.user?.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: "Token utilisateur invalide" });
    }

    const [rows] = await connection.execute(
      `SELECT id, patient_user_id, doctor_id, title, description, file_url, created_at
       FROM patient_documents
       WHERE patient_user_id = ?
       ORDER BY created_at DESC`,
      [userId],
    );

    return res.json({ success: true, count: rows.length, documents: rows });
  } catch (error) {
    console.error("Error loading patient documents:", error);
    return res.status(500).json({ error: "Erreur lors du chargement des documents", details: error.message });
  } finally {
    connection.release();
  }
};

export default {
  registerPatientPortalAccount,
  getMyPatientPortalProfile,
  updateMyPatientPortalProfile,
  getProviderPublicProfile,
  updateProviderPublicProfile,
  searchPublicDoctors,
  getPublicDoctorAvailability,
  bookAppointmentOnline,
  getMyBookedAppointments,
  getMyOrdonnances,
  getMyDocuments,
};
