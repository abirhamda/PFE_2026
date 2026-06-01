import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const connectionConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "application_medicale",
  port: Number(process.env.DB_PORT) || 3306,
};

const DEFAULT_WORKING_HOURS = JSON.stringify({
  0: { enabled: false, start: "09:00", end: "17:00" },
  1: { enabled: true, start: "09:00", end: "17:00" },
  2: { enabled: true, start: "09:00", end: "17:00" },
  3: { enabled: true, start: "09:00", end: "17:00" },
  4: { enabled: true, start: "09:00", end: "17:00" },
  5: { enabled: true, start: "09:00", end: "17:00" },
  6: { enabled: true, start: "09:00", end: "13:00" },
});

const CITY_PRESETS = [
  { city: "Sousse", lat: 35.8332, lng: 10.5944, address: "Sahloul 1" },
  { city: "Sousse", lat: 35.8361, lng: 10.6155, address: "Khezama Est" },
  { city: "Sousse", lat: 35.8309, lng: 10.6415, address: "Boujaafar" },
  { city: "Hammam Sousse", lat: 35.8608, lng: 10.6010, address: "Avenue de la Republique" },
  { city: "Sousse", lat: 35.8248, lng: 10.6349, address: "Medina de Sousse" },
];

const pickPreset = (index) => CITY_PRESETS[index % CITY_PRESETS.length];

const buildPublicPhone = (doctorId) => `73${String(300000 + doctorId).padStart(6, "0")}`;

const fillDoctorPublicProfiles = async (connection) => {
  const [doctors] = await connection.execute(
    "SELECT id, nom, prenom, specialty FROM doctors WHERE is_active = 1 ORDER BY id ASC",
  );

  let upserts = 0;
  for (let i = 0; i < doctors.length; i += 1) {
    const doctor = doctors[i];
    const preset = pickPreset(i);
    const displayName = `${doctor.prenom || ""} ${doctor.nom || ""}`.trim() || `Doctor ${doctor.id}`;
    const consultationFee = 180 + i * 20;
    const bookingEnabled = doctor.id % 2 === 1 ? 1 : 0;
    const visibilityEnabled = 1;

    await connection.execute(
      `INSERT INTO doctor_public_profiles
       (doctor_id, display_name, public_phone, address_line, city, latitude, longitude,
        consultation_fee, consultation_duration_min, working_hours_json, bio,
        online_visibility, online_booking_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         display_name = COALESCE(NULLIF(display_name, ''), VALUES(display_name)),
         public_phone = COALESCE(NULLIF(public_phone, ''), VALUES(public_phone)),
         address_line = COALESCE(NULLIF(address_line, ''), VALUES(address_line)),
         city = COALESCE(NULLIF(city, ''), VALUES(city)),
         latitude = COALESCE(latitude, VALUES(latitude)),
         longitude = COALESCE(longitude, VALUES(longitude)),
         consultation_fee = COALESCE(consultation_fee, VALUES(consultation_fee)),
         consultation_duration_min = CASE
           WHEN consultation_duration_min IS NULL OR consultation_duration_min < 5 THEN VALUES(consultation_duration_min)
           ELSE consultation_duration_min
         END,
         working_hours_json = COALESCE(NULLIF(working_hours_json, ''), VALUES(working_hours_json)),
         bio = COALESCE(NULLIF(bio, ''), VALUES(bio)),
         online_visibility = CASE
           WHEN online_visibility IS NULL THEN VALUES(online_visibility)
           ELSE online_visibility
         END,
         online_booking_enabled = CASE
           WHEN online_booking_enabled IS NULL THEN VALUES(online_booking_enabled)
           ELSE online_booking_enabled
         END,
         updated_at = NOW()`,
      [
        doctor.id,
        displayName,
        buildPublicPhone(doctor.id),
        `${preset.address}, ${preset.city}`,
        preset.city,
        preset.lat,
        preset.lng,
        consultationFee,
        20,
        DEFAULT_WORKING_HOURS,
        `${doctor.specialty || "Medecine generale"} - Consultation et suivi clinique.`,
        visibilityEnabled,
        bookingEnabled,
      ],
    );
    upserts += 1;
  }

  return upserts;
};

const fillPatientPortalProfiles = async (connection) => {
  const [profiles] = await connection.execute(
    `SELECT id, user_id, nom, prenom, email, telephone, cin, date_naissance, city, latitude, longitude
     FROM patient_portal_profiles
     ORDER BY id ASC`,
  );

  let updates = 0;
  for (let i = 0; i < profiles.length; i += 1) {
    const profile = profiles[i];
    const preset = pickPreset(i + 1);
    const phone =
      profile.telephone && String(profile.telephone).trim()
        ? profile.telephone
        : `28${String(170000 + profile.id).padStart(6, "0")}`;
    const cin = profile.cin && String(profile.cin).trim() ? profile.cin : `PP${String(profile.id).padStart(7, "0")}`;
    const dateNaissance = profile.date_naissance || "1995-01-01";
    const city = profile.city && String(profile.city).trim() ? profile.city : preset.city;
    const latitude = profile.latitude ?? preset.lat;
    const longitude = profile.longitude ?? preset.lng;

    await connection.execute(
      `UPDATE patient_portal_profiles
       SET telephone = ?, cin = ?, date_naissance = ?, city = ?, latitude = ?, longitude = ?, updated_at = NOW()
       WHERE id = ?`,
      [phone, cin, dateNaissance, city, latitude, longitude, profile.id],
    );
    updates += 1;
  }

  return updates;
};

const fillAppointmentsEmptyColumns = async (connection) => {
  await connection.execute(
    `UPDATE appointments a
     LEFT JOIN doctor_patients p ON p.id = a.patient_id
     SET
       a.patient_phone = CASE
         WHEN (a.patient_phone IS NULL OR a.patient_phone = '') AND p.telephone IS NOT NULL AND p.telephone <> '' THEN p.telephone
         WHEN (a.patient_phone IS NULL OR a.patient_phone = '') THEN '28000000'
         ELSE a.patient_phone
       END,
       a.patient_date_naissance = CASE
         WHEN a.patient_date_naissance IS NULL AND p.date_naissance IS NOT NULL THEN p.date_naissance
         WHEN a.patient_date_naissance IS NULL THEN '1990-01-01'
         ELSE a.patient_date_naissance
       END,
       a.doctor_notes = CASE
         WHEN a.doctor_notes IS NULL OR a.doctor_notes = '' THEN 'Observation clinique stable.'
         ELSE a.doctor_notes
       END,
       a.payment_doctor_comment = CASE
         WHEN a.payment_doctor_comment IS NULL OR a.payment_doctor_comment = '' THEN 'Verifier le mode de reglement a la prochaine visite.'
         ELSE a.payment_doctor_comment
       END,
       a.updated_at = NOW()`,
  );
};

const generateMatriculeForDoctor = async (connection, doctorId) => {
  const prefix = `PAT-${doctorId}-`;
  const [rows] = await connection.execute(
    `SELECT MAX(CAST(SUBSTRING_INDEX(matricule, '-', -1) AS UNSIGNED)) AS max_seq
     FROM doctor_patients
     WHERE doctor_id = ?
       AND matricule LIKE ?`,
    [doctorId, `${prefix}%`],
  );
  const maxSeq = Number(rows[0]?.max_seq || 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
};

const resolveOrCreatePatientForAppointment = async (connection, appointment) => {
  if (appointment.patient_id) {
    const [rows] = await connection.execute(
      "SELECT id, matricule, nom, prenom, cin, telephone, date_naissance FROM doctor_patients WHERE id = ? LIMIT 1",
      [appointment.patient_id],
    );
    if (rows.length > 0) return rows[0];
  }

  if (appointment.patient_cin) {
    const [rows] = await connection.execute(
      `SELECT id, matricule, nom, prenom, cin, telephone, date_naissance
       FROM doctor_patients
       WHERE doctor_id = ? AND cin = ?
       LIMIT 1`,
      [appointment.doctor_id, appointment.patient_cin],
    );
    if (rows.length > 0) return rows[0];
  }

  const [rowsByIdentity] = await connection.execute(
    `SELECT id, matricule, nom, prenom, cin, telephone, date_naissance
     FROM doctor_patients
     WHERE doctor_id = ?
       AND nom = ?
       AND prenom = ?
       AND IFNULL(telephone, '') = IFNULL(?, '')
     LIMIT 1`,
    [appointment.doctor_id, appointment.patient_nom, appointment.patient_prenom, appointment.patient_phone || ""],
  );
  if (rowsByIdentity.length > 0) return rowsByIdentity[0];

  const matricule = await generateMatriculeForDoctor(connection, appointment.doctor_id);
  const [insertResult] = await connection.execute(
    `INSERT INTO doctor_patients
     (doctor_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      appointment.doctor_id,
      matricule,
      appointment.patient_nom,
      appointment.patient_prenom,
      appointment.patient_cin || null,
      appointment.patient_phone || null,
      appointment.patient_date_naissance || "1990-01-01",
    ],
  );

  const [createdRows] = await connection.execute(
    `SELECT id, matricule, nom, prenom, cin, telephone, date_naissance
     FROM doctor_patients
     WHERE id = ?
     LIMIT 1`,
    [insertResult.insertId],
  );
  return createdRows[0];
};

const backfillAppointmentPatientLinks = async (connection) => {
  const [appointments] = await connection.execute(
    `SELECT id, doctor_id, patient_id, patient_matricule, patient_nom, patient_prenom, patient_cin, patient_phone, patient_date_naissance
     FROM appointments
     WHERE patient_id IS NULL OR patient_matricule IS NULL OR patient_matricule = ''`,
  );

  let updates = 0;
  for (const appointment of appointments) {
    if (!appointment.doctor_id || !appointment.patient_nom || !appointment.patient_prenom) {
      continue;
    }
    const patient = await resolveOrCreatePatientForAppointment(connection, appointment);
    if (!patient) continue;

    await connection.execute(
      `UPDATE appointments
       SET patient_id = ?, patient_matricule = ?, patient_nom = ?, patient_prenom = ?,
           patient_cin = ?, patient_phone = ?, patient_date_naissance = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        patient.id,
        patient.matricule,
        patient.nom,
        patient.prenom,
        patient.cin || null,
        patient.telephone || null,
        patient.date_naissance || "1990-01-01",
        appointment.id,
      ],
    );
    updates += 1;
  }

  return updates;
};

const fillPatientDocuments = async (connection) => {
  const [profiles] = await connection.execute(
    `SELECT user_id, nom, prenom
     FROM patient_portal_profiles
     ORDER BY id ASC`,
  );

  let inserts = 0;
  for (const profile of profiles) {
    const [existing] = await connection.execute(
      "SELECT COUNT(*) AS total FROM patient_documents WHERE patient_user_id = ?",
      [profile.user_id],
    );
    if (Number(existing[0]?.total || 0) > 0) continue;

    const fullName = `${profile.prenom || ""} ${profile.nom || ""}`.trim();
    await connection.execute(
      `INSERT INTO patient_documents
       (patient_user_id, doctor_id, title, description, file_url, created_at)
       VALUES
       (?, 5, 'Compte rendu consultation', ?, NULL, NOW()),
       (?, 5, 'Bilan biologique', ?, NULL, NOW())`,
      [
        profile.user_id,
        `Compte rendu initial pour ${fullName || "patient"}.`,
        profile.user_id,
        `Resultats de bilan de suivi pour ${fullName || "patient"}.`,
      ],
    );
    inserts += 2;
  }

  return inserts;
};

const fillWaitingRoomCounters = async (connection) => {
  const [doctors] = await connection.execute(
    "SELECT id FROM doctors WHERE is_active = 1 ORDER BY id ASC",
  );
  const date = new Date().toISOString().slice(0, 10);

  let upserts = 0;
  for (let i = 0; i < doctors.length; i += 1) {
    const waitingCount = 2 + (i % 6);
    await connection.execute(
      `INSERT INTO waiting_room_counters (doctor_id, counter_date, waiting_count)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE waiting_count = VALUES(waiting_count), updated_at = NOW()`,
      [doctors[i].id, date, waitingCount],
    );
    upserts += 1;
  }
  return upserts;
};

const run = async () => {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    await connection.beginTransaction();

    const doctorProfiles = await fillDoctorPublicProfiles(connection);
    const patientProfiles = await fillPatientPortalProfiles(connection);
    await fillAppointmentsEmptyColumns(connection);
    const backfilledAppointmentPatients = await backfillAppointmentPatientLinks(connection);
    const patientDocs = await fillPatientDocuments(connection);
    const waitingCounters = await fillWaitingRoomCounters(connection);

    await connection.commit();
    console.log("[ok] Remplissage des colonnes vides termine.");
    console.log(`[ok] Doctor public profiles assures: ${doctorProfiles}`);
    console.log(`[ok] Patient portal profiles updated: ${patientProfiles}`);
    console.log(`[ok] Appointment patient links backfilled: ${backfilledAppointmentPatients}`);
    console.log(`[ok] Patient documents inserted: ${patientDocs}`);
    console.log(`[ok] Waiting room counters upserted: ${waitingCounters}`);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("[error] Remplissage complementaire echoue:", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

run();
