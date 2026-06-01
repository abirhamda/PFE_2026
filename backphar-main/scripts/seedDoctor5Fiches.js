import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DOCTOR_ID = 5;
const SEED_DOCTOR_EMAIL = "doctor5.sousse@pharmaconnect.tn";
const SEED_DOCTOR_PASSWORD_HASH = "$2b$10$ifAVhPPmpVFTeoBcwRIJN.KcgMIVpLKu3Z2kYNURLdPVBzgG.U2kO"; // Sousse2026!

const connectionConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "application_medicale",
  port: Number(process.env.DB_PORT) || 3306,
};

const pad2 = (value) => String(value).padStart(2, "0");
const toSqlDateTime = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(
    date.getMinutes(),
  )}:00`;

const makeDate = (daysOffset, hours, minutes = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, 0, 0);
  if (date.getDay() === 0) {
    date.setDate(date.getDate() + 1);
  }
  return date;
};

const defaultWorkingHours = {
  0: { enabled: false, start: "09:00", end: "17:00" },
  1: { enabled: true, start: "09:00", end: "17:00" },
  2: { enabled: true, start: "09:00", end: "17:00" },
  3: { enabled: true, start: "09:00", end: "17:00" },
  4: { enabled: true, start: "09:00", end: "17:00" },
  5: { enabled: true, start: "09:00", end: "17:00" },
  6: { enabled: true, start: "09:00", end: "13:00" },
};

const seedPatients = [
  {
    nom: "Ben Salem",
    prenom: "Imene",
    cin: "13050001",
    telephone: "28150001",
    date_naissance: "1989-06-18",
  },
  {
    nom: "Jallouli",
    prenom: "Youssef",
    cin: "13050002",
    telephone: "28150002",
    date_naissance: "1978-02-03",
  },
  {
    nom: "Trabelsi",
    prenom: "Sara",
    cin: "13050003",
    telephone: "28150003",
    date_naissance: "1996-09-27",
  },
];

const buildAppointmentPlan = (patientByCin) => [
  {
    patient: patientByCin[13050001],
    appointment_at: makeDate(-120, 9, 0),
    doctor_notes: "Conseil hygiene de vie et examens biologiques.",
    payment_doctor_comment: "Verifier la prise en charge a la prochaine consultation.",
  },
  {
    patient: patientByCin[13050001],
    appointment_at: makeDate(-65, 10, 0),
    doctor_notes: "Amelioration clinique, poursuivre traitement 3 mois.",
    payment_doctor_comment: "Paiement partiel acceptable, confirmer solde.",
  },
  {
    patient: patientByCin[13050001],
    appointment_at: makeDate(-10, 11, 30),
    doctor_notes: "Continuer surveillance mensuelle.",
    payment_doctor_comment: "Aucun ajustement de tarif pour le moment.",
  },
  {
    patient: patientByCin[13050002],
    appointment_at: makeDate(-95, 14, 0),
    doctor_notes: "Demande radiographie et test fonctionnel respiratoire.",
    payment_doctor_comment: "Prevoir pack examens lors du prochain passage.",
  },
  {
    patient: patientByCin[13050002],
    appointment_at: makeDate(-35, 15, 0),
    doctor_notes: "Stabilisation correcte, suivi trimestriel.",
    payment_doctor_comment: "Secretaire: rappeler au patient le mode de reglement.",
  },
  {
    patient: patientByCin[13050003],
    appointment_at: makeDate(-45, 16, 0),
    doctor_notes: "Suspicion trouble fonctionnel, traitement symptomatique.",
    payment_doctor_comment: "Tarif standard applique.",
  },
  {
    patient: patientByCin[13050003],
    appointment_at: makeDate(4, 9, 30),
    doctor_notes: "A completer lors de la prochaine consultation.",
    payment_doctor_comment: "Confirmer la modalite de paiement avant la consultation.",
  },
];

const generateMatricule = async (connection) => {
  const prefix = `PAT-${DOCTOR_ID}-`;
  const [rows] = await connection.execute(
    `SELECT MAX(CAST(SUBSTRING_INDEX(matricule, '-', -1) AS UNSIGNED)) AS max_seq
     FROM doctor_patients
     WHERE doctor_id = ?
       AND matricule LIKE ?`,
    [DOCTOR_ID, `${prefix}%`],
  );
  const maxSeq = Number(rows[0]?.max_seq || 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
};

const ensureDoctorExists = async (connection) => {
  const [rows] = await connection.execute("SELECT id, nom, prenom FROM doctors WHERE id = ? LIMIT 1", [DOCTOR_ID]);
  if (rows.length > 0) {
    return rows[0];
  }

  await connection.execute(
    `INSERT INTO users (email, password, role)
     VALUES (?, ?, 'doctor')
     ON DUPLICATE KEY UPDATE password = VALUES(password), role = VALUES(role)`,
    [SEED_DOCTOR_EMAIL, SEED_DOCTOR_PASSWORD_HASH],
  );

  await connection.execute(
    `INSERT INTO doctors (id, nom, prenom, email, password, cin, specialty, is_active)
     VALUES (?, 'Ghannouchi', 'Walid', ?, ?, '11000005', 'Medecine generale', 1)`,
    [DOCTOR_ID, SEED_DOCTOR_EMAIL, SEED_DOCTOR_PASSWORD_HASH],
  );

  const [createdRows] = await connection.execute(
    "SELECT id, nom, prenom FROM doctors WHERE id = ? LIMIT 1",
    [DOCTOR_ID],
  );
  if (createdRows.length === 0) {
    throw new Error(`Impossible de creer automatiquement le medecin id=${DOCTOR_ID}`);
  }
  return createdRows[0];
};

const ensurePublicProfile = async (connection, doctor) => {
  const displayName = `${doctor.prenom || ""} ${doctor.nom || ""}`.trim() || `Doctor ${DOCTOR_ID}`;
  const [rows] = await connection.execute(
    "SELECT doctor_id FROM doctor_public_profiles WHERE doctor_id = ? LIMIT 1",
    [DOCTOR_ID],
  );

  if (rows.length === 0) {
    await connection.execute(
      `INSERT INTO doctor_public_profiles
       (doctor_id, display_name, public_phone, address_line, city, latitude, longitude,
        consultation_fee, consultation_duration_min, working_hours_json, bio,
        online_visibility, online_booking_enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      [
        DOCTOR_ID,
        displayName,
        "73330505",
        "Rue Ibn El Jazzar, Medina de Sousse",
        "Sousse",
        35.8248,
        10.6349,
        45.0,
        20,
        JSON.stringify(defaultWorkingHours),
        "Cabinet de medecine generale et suivi clinique.",
      ],
    );
    return;
  }

  await connection.execute(
    `UPDATE doctor_public_profiles
     SET display_name = ?, public_phone = ?, address_line = ?, city = ?, latitude = ?, longitude = ?,
         consultation_fee = ?, consultation_duration_min = ?, working_hours_json = ?, bio = ?,
         online_visibility = 1, online_booking_enabled = 1, updated_at = NOW()
     WHERE doctor_id = ?`,
    [
      displayName,
      "73330505",
      "Rue Ibn El Jazzar, Medina de Sousse",
      "Sousse",
      35.8248,
      10.6349,
      45.0,
      20,
      JSON.stringify(defaultWorkingHours),
      "Cabinet de medecine generale et suivi clinique.",
      DOCTOR_ID,
    ],
  );
};

const ensurePatient = async (connection, payload) => {
  const [existingRows] = await connection.execute(
    `SELECT id, matricule, nom, prenom, cin, telephone, date_naissance
     FROM doctor_patients
     WHERE doctor_id = ? AND cin = ?
     LIMIT 1`,
    [DOCTOR_ID, payload.cin],
  );

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    await connection.execute(
      `UPDATE doctor_patients
       SET nom = ?, prenom = ?, telephone = ?, date_naissance = ?, updated_at = NOW()
       WHERE id = ?`,
      [payload.nom, payload.prenom, payload.telephone, payload.date_naissance, existing.id],
    );
    return {
      ...existing,
      nom: payload.nom,
      prenom: payload.prenom,
      telephone: payload.telephone,
      date_naissance: payload.date_naissance,
    };
  }

  const matricule = await generateMatricule(connection);
  const [insertResult] = await connection.execute(
    `INSERT INTO doctor_patients
     (doctor_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [DOCTOR_ID, matricule, payload.nom, payload.prenom, payload.cin, payload.telephone, payload.date_naissance],
  );

  const [rows] = await connection.execute(
    `SELECT id, matricule, nom, prenom, cin, telephone, date_naissance
     FROM doctor_patients
     WHERE id = ?
     LIMIT 1`,
    [insertResult.insertId],
  );

  return rows[0];
};

const ensureAppointment = async (connection, item) => {
  const appointmentAtSql = toSqlDateTime(item.appointment_at);
  const [existingRows] = await connection.execute(
    `SELECT id
     FROM appointments
     WHERE doctor_id = ? AND patient_id = ? AND appointment_at = ?
     LIMIT 1`,
    [DOCTOR_ID, item.patient.id, appointmentAtSql],
  );

  if (existingRows.length > 0) {
    await connection.execute(
      `UPDATE appointments
       SET doctor_notes = ?, payment_doctor_comment = ?, updated_at = NOW()
       WHERE id = ?`,
      [item.doctor_notes, item.payment_doctor_comment, existingRows[0].id],
    );
    return false;
  }

  await connection.execute(
    `INSERT INTO appointments
     (doctor_id, secretary_id, patient_id, patient_matricule, patient_nom, patient_prenom,
      patient_cin, patient_phone, patient_date_naissance,
      appointment_at, payment_amount, payment_doctor_comment, doctor_notes, created_by_role, created_at, updated_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, 'doctor', NOW(), NOW())`,
    [
      DOCTOR_ID,
      item.patient.id,
      item.patient.matricule,
      item.patient.nom,
      item.patient.prenom,
      item.patient.cin,
      item.patient.telephone,
      item.patient.date_naissance,
      appointmentAtSql,
      item.payment_doctor_comment,
      item.doctor_notes,
    ],
  );
  return true;
};

const run = async () => {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);
    await connection.beginTransaction();

    const doctor = await ensureDoctorExists(connection);
    await ensurePublicProfile(connection, doctor);

    const patients = [];
    for (const payload of seedPatients) {
      const patient = await ensurePatient(connection, payload);
      patients.push(patient);
    }

    const patientByCin = patients.reduce((acc, patient) => {
      acc[patient.cin] = patient;
      return acc;
    }, {});

    const appointmentPlan = buildAppointmentPlan(patientByCin);
    let createdAppointments = 0;
    for (const item of appointmentPlan) {
      if (!item.patient) continue;
      const created = await ensureAppointment(connection, item);
      if (created) createdAppointments += 1;
    }

    await connection.commit();
    console.log(`[ok] Doctor ${DOCTOR_ID} seed termine.`);
    console.log(`[ok] Patients assures: ${patients.length}`);
    console.log(`[ok] Appointments crees cette execution: ${createdAppointments}`);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("[error] Seed doctor 5 echoue:", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

run();
