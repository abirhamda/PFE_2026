import db from "../db.js";

const normalizeRole = (role) => String(role || "").trim().toLowerCase();
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeMatricule = (matricule) =>
  String(matricule || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");

const pad2 = (num) => String(num).padStart(2, "0");

const parseInteger = (value, fallback = null) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
};

const parseDecimalOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const formatDateTime = (date) =>
  [
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`,
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`,
  ].join(" ");

const parseDateOnlyString = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const raw = String(value).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
};

const toSqlDateTime = (value) => {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    const normalized = raw.replace("T", " ");
    return normalized.length === 16 ? `${normalized}:00` : normalized;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateTime(date);
};

const isSundaySqlDateTime = (sqlDateTime) => {
  const date = new Date(String(sqlDateTime).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return false;
  return date.getDay() === 0;
};

const parseDateOnly = (value) => {
  const raw = String(value || "").trim();
  const normalized = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

const getSortValue = (value) => {
  const date = new Date(String(value || "").replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const resolveActorContext = async (connection, user) => {
  const role = normalizeRole(user?.role);
  const email = normalizeEmail(user?.email);
  if (!email) return null;

  if (role === "doctor") {
    const [rows] = await connection.execute(
      "SELECT id, nom, prenom, specialty FROM doctors WHERE email = ? LIMIT 1",
      [email],
    );
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
        id: Number(rows[0].doctor_id),
        nom: rows[0].doctor_nom,
        prenom: rows[0].doctor_prenom,
        specialty: rows[0].specialty,
      },
      secretaryId: Number(rows[0].id),
    };
  }

  return null;
};

const getCalendarBounds = (query) => {
  const now = new Date();
  const from = query?.from ? parseDateOnly(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query?.to ? parseDateOnly(query.to) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return null;
  }

  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0);
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);

  return {
    from: formatDateTime(start),
    to: formatDateTime(end),
  };
};

const getPatientById = async (connection, doctorId, patientId) => {
  const [rows] = await connection.execute(
    `SELECT id, doctor_id, matricule, nom, prenom, cin, telephone, date_naissance
     FROM doctor_patients
     WHERE id = ? AND doctor_id = ?
     LIMIT 1`,
    [patientId, doctorId],
  );
  return rows[0] || null;
};

const getPatientByMatricule = async (connection, doctorId, matricule) => {
  const [rows] = await connection.execute(
    `SELECT id, doctor_id, matricule, nom, prenom, cin, telephone, date_naissance
     FROM doctor_patients
     WHERE doctor_id = ? AND matricule = ?
     LIMIT 1`,
    [doctorId, matricule],
  );
  return rows[0] || null;
};

const toNullableTrimmedString = (value) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildSnapshotFromDoctorPatient = (patient) => ({
  matricule: patient?.matricule || null,
  nom: patient?.nom || "",
  prenom: patient?.prenom || "",
  cin: patient?.cin || null,
  telephone: patient?.telephone || null,
  date_naissance: patient?.date_naissance || null,
});

const resolveAppointmentPatientFromPayload = async (connection, doctorId, payload) => {
  const patientIdInput = parseInteger(payload?.patient_id, null);
  const matriculeInput = payload?.patient_matricule ? normalizeMatricule(payload.patient_matricule) : null;
  const nomInput = toNullableTrimmedString(payload?.patient_nom) || "";
  const prenomInput = toNullableTrimmedString(payload?.patient_prenom) || "";
  const cinInput = toNullableTrimmedString(payload?.patient_cin);
  const phoneInput = toNullableTrimmedString(payload?.patient_phone);
  const dateNaissanceInput = parseDateOnlyString(payload?.patient_date_naissance);

  let matchedPatient = null;

  if (patientIdInput !== null) {
    if (!Number.isInteger(patientIdInput) || patientIdInput <= 0) {
      return { ok: false, status: 400, error: "patient_id invalide" };
    }
    matchedPatient = await getPatientById(connection, doctorId, patientIdInput);
    if (!matchedPatient) {
      return { ok: false, status: 404, error: "patient_id introuvable pour ce docteur" };
    }
  }

  if (!matchedPatient && matriculeInput) {
    matchedPatient = await getPatientByMatricule(connection, doctorId, matriculeInput);
  }

  if (matchedPatient) {
    return {
      ok: true,
      patient: matchedPatient,
      snapshot: buildSnapshotFromDoctorPatient(matchedPatient),
      isNewPatient: false,
    };
  }

  if (!nomInput || !prenomInput) {
    return {
      ok: false,
      status: 400,
      error: "patient_nom et patient_prenom sont obligatoires (ou utiliser un matricule existant)",
    };
  }

  return {
    ok: true,
    patient: null,
    snapshot: {
      matricule: matriculeInput || null,
      nom: nomInput,
      prenom: prenomInput,
      cin: cinInput,
      telephone: phoneInput,
      date_naissance: dateNaissanceInput,
    },
    isNewPatient: true,
  };
};

const getAppointmentById = async (connection, appointmentId) => {
  const [rows] = await connection.execute(
    `SELECT a.id, a.doctor_id, a.secretary_id, a.patient_id, a.booked_by_patient_user_id, a.patient_matricule, a.patient_nom, a.patient_prenom,
            a.patient_cin, a.patient_phone, a.patient_date_naissance,
            a.appointment_at,
            a.payment_amount, a.payment_doctor_comment, a.doctor_notes, a.created_by_role,
            a.created_at, a.updated_at,
            s.nom AS secretary_nom, s.prenom AS secretary_prenom
     FROM appointments a
     LEFT JOIN secretaries s ON s.id = a.secretary_id
     WHERE a.id = ?
     LIMIT 1`,
    [appointmentId],
  );
  return rows[0] || null;
};

const ensureAppointmentAccess = async (connection, context, appointmentId) => {
  const appointment = await getAppointmentById(connection, appointmentId);
  if (!appointment) {
    return { ok: false, status: 404, error: "Rendez-vous introuvable" };
  }
  if (Number(appointment.doctor_id) !== Number(context.doctorId)) {
    return { ok: false, status: 403, error: "Acces refuse a ce rendez-vous" };
  }
  return { ok: true, appointment };
};

const getPatientConsultations = async (
  connection,
  doctorId,
  patientId,
  patientMatricule,
  fallbackAppointmentId = null,
) => {
  const whereParts = [];
  const params = [doctorId];

  if (patientId !== null && patientId !== undefined) {
    whereParts.push("a.patient_id = ?");
    params.push(patientId);
  }
  if (patientMatricule) {
    whereParts.push("a.patient_matricule = ?");
    params.push(patientMatricule);
  }
  if (whereParts.length === 0 && fallbackAppointmentId) {
    whereParts.push("a.id = ?");
    params.push(fallbackAppointmentId);
  }
  if (whereParts.length === 0) {
    return [];
  }

  const [appointmentRows] = await connection.execute(
    `SELECT a.id AS source_id,
            'appointment' AS source_type,
            a.appointment_at AS entry_at,
            a.doctor_notes,
            a.payment_amount,
            a.payment_doctor_comment,
            a.created_at,
            a.updated_at
     FROM appointments a
     WHERE a.doctor_id = ?
       AND (${whereParts.join(" OR ")})`,
    params,
  );

  let freeNoteRows = [];
  if (patientId !== null && patientId !== undefined) {
    try {
      const [rows] = await connection.execute(
        `SELECT n.id AS source_id,
                'free_note' AS source_type,
                n.entry_at,
                n.doctor_notes,
                n.payment_amount,
                n.payment_doctor_comment,
                n.created_at,
                n.updated_at
         FROM patient_fiche_notes n
         WHERE n.doctor_id = ? AND n.patient_id = ?`,
        [doctorId, patientId],
      );
      freeNoteRows = rows;
    } catch (error) {
      if (error?.code !== "ER_NO_SUCH_TABLE") {
        throw error;
      }
    }
  }

  return [...appointmentRows, ...freeNoteRows]
    .map((row) => ({
      id: `${row.source_type}-${row.source_id}`,
      source_type: row.source_type,
      source_id: Number(row.source_id),
      appointment_id: row.source_type === "appointment" ? Number(row.source_id) : null,
      entry_at: row.entry_at,
      doctor_notes: row.doctor_notes || null,
      payment_amount: row.payment_amount,
      payment_doctor_comment: row.payment_doctor_comment || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
    .sort((left, right) => getSortValue(right.entry_at) - getSortValue(left.entry_at));
};

export const getCalendarAppointments = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour acceder aux rendez-vous" });
    }

    const bounds = getCalendarBounds(req.query);
    if (!bounds) {
      return res.status(400).json({ error: "Parametres de date invalides (from/to)" });
    }

    const [rows] = await connection.execute(
      `SELECT a.id, a.doctor_id, a.secretary_id, a.patient_id, a.booked_by_patient_user_id, a.patient_matricule, a.patient_nom, a.patient_prenom,
              a.patient_cin, a.patient_phone, a.patient_date_naissance,
              a.appointment_at,
              a.payment_amount, a.payment_doctor_comment, a.doctor_notes, a.created_by_role,
              a.created_at, a.updated_at,
              s.nom AS secretary_nom, s.prenom AS secretary_prenom
       FROM appointments a
       LEFT JOIN secretaries s ON s.id = a.secretary_id
       WHERE a.doctor_id = ? AND a.appointment_at BETWEEN ? AND ?
       ORDER BY a.appointment_at ASC`,
      [context.doctorId, bounds.from, bounds.to],
    );

    return res.json({
      success: true,
      doctor_id: context.doctorId,
      from: bounds.from,
      to: bounds.to,
      count: rows.length,
      appointments: rows,
    });
  } catch (error) {
    console.error("Error fetching appointments calendar:", error);
    return res.status(500).json({ error: "Erreur lors du chargement du calendrier", details: error.message });
  } finally {
    connection.release();
  }
};

export const createAppointment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour creer un rendez-vous" });
    }

    const appointmentAt = toSqlDateTime(req.body?.appointment_at);
    if (!appointmentAt) {
      return res.status(400).json({ error: "appointment_at invalide" });
    }
    if (isSundaySqlDateTime(appointmentAt)) {
      return res.status(400).json({ error: "Les rendez-vous du dimanche ne sont pas autorises" });
    }

    const patientResolve = await resolveAppointmentPatientFromPayload(connection, context.doctorId, req.body);
    if (!patientResolve.ok) {
      return res.status(patientResolve.status).json({ error: patientResolve.error });
    }

    const patient = patientResolve.patient;
    const patientSnapshot = patientResolve.snapshot;
    const createdByRole = context.role === "secretaire" ? "secretaire" : "doctor";
    const secretaryId = context.role === "secretaire" ? context.secretaryId : null;

    const rawPaymentAmount = parseDecimalOrNull(req.body?.payment_amount);
    if (Number.isNaN(rawPaymentAmount) || (rawPaymentAmount !== null && rawPaymentAmount < 0)) {
      return res.status(400).json({ error: "payment_amount invalide" });
    }
    const paymentAmount = context.role === "secretaire" ? rawPaymentAmount : null;

    const paymentDoctorComment =
      context.role === "doctor" && req.body?.payment_doctor_comment
        ? String(req.body.payment_doctor_comment).trim()
        : null;

    const doctorNotes =
      context.role === "doctor" && req.body?.doctor_notes
        ? String(req.body.doctor_notes).trim()
        : null;

    const [insertResult] = await connection.execute(
      `INSERT INTO appointments
       (doctor_id, secretary_id, patient_id, patient_matricule, patient_nom, patient_prenom,
        patient_cin, patient_phone, patient_date_naissance,
        appointment_at, payment_amount, payment_doctor_comment, doctor_notes, created_by_role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        context.doctorId,
        secretaryId,
        patient?.id || null,
        patientSnapshot.matricule,
        patientSnapshot.nom,
        patientSnapshot.prenom,
        patientSnapshot.cin,
        patientSnapshot.telephone,
        patientSnapshot.date_naissance,
        appointmentAt,
        paymentAmount,
        paymentDoctorComment,
        doctorNotes,
        createdByRole,
      ],
    );

    const appointment = await getAppointmentById(connection, insertResult.insertId);
    return res.status(201).json({
      message: "Rendez-vous cree avec succes",
      appointment,
      patient_created: false,
      patient_is_new: patientResolve.isNewPatient,
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return res.status(500).json({ error: "Erreur lors de la creation du rendez-vous", details: error.message });
  } finally {
    connection.release();
  }
};

export const updateAppointment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour modifier un rendez-vous" });
    }

    const appointmentId = Number(req.params.id);
    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }

    const access = await ensureAppointmentAccess(connection, context, appointmentId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const updates = [];
    const params = [];
    const addUpdate = (column, value) => {
      updates.push(`${column} = ?`);
      params.push(value);
    };

    const includesPatientFields =
      req.body?.patient_id !== undefined ||
      req.body?.patient_matricule !== undefined ||
      req.body?.patient_nom !== undefined ||
      req.body?.patient_prenom !== undefined ||
      req.body?.patient_cin !== undefined ||
      req.body?.patient_phone !== undefined ||
      req.body?.patient_date_naissance !== undefined;

    if (includesPatientFields) {
      const patientResolve = await resolveAppointmentPatientFromPayload(connection, context.doctorId, {
        patient_id: req.body?.patient_id ?? access.appointment.patient_id,
        patient_matricule: req.body?.patient_matricule ?? access.appointment.patient_matricule,
        patient_nom: req.body?.patient_nom ?? access.appointment.patient_nom,
        patient_prenom: req.body?.patient_prenom ?? access.appointment.patient_prenom,
        patient_cin: req.body?.patient_cin ?? access.appointment.patient_cin,
        patient_phone: req.body?.patient_phone ?? access.appointment.patient_phone,
        patient_date_naissance:
          req.body?.patient_date_naissance ?? access.appointment.patient_date_naissance,
      });
      if (!patientResolve.ok) {
        return res.status(patientResolve.status).json({ error: patientResolve.error });
      }

      const patient = patientResolve.patient;
      const patientSnapshot = patientResolve.snapshot;
      addUpdate("patient_id", patient?.id || null);
      addUpdate("patient_matricule", patientSnapshot.matricule);
      addUpdate("patient_nom", patientSnapshot.nom);
      addUpdate("patient_prenom", patientSnapshot.prenom);
      addUpdate("patient_cin", patientSnapshot.cin);
      addUpdate("patient_phone", patientSnapshot.telephone);
      addUpdate("patient_date_naissance", patientSnapshot.date_naissance);
    }

    if (req.body?.appointment_at !== undefined) {
      const appointmentAt = toSqlDateTime(req.body.appointment_at);
      if (!appointmentAt) {
        return res.status(400).json({ error: "appointment_at invalide" });
      }
      if (isSundaySqlDateTime(appointmentAt)) {
        return res.status(400).json({ error: "Les rendez-vous du dimanche ne sont pas autorises" });
      }
      addUpdate("appointment_at", appointmentAt);
    }

    if (req.body?.payment_amount !== undefined) {
      if (context.role !== "secretaire") {
        return res.status(403).json({ error: "Seule la secretaire peut modifier le paiement" });
      }
      const paymentAmount = parseDecimalOrNull(req.body.payment_amount);
      if (Number.isNaN(paymentAmount) || (paymentAmount !== null && paymentAmount < 0)) {
        return res.status(400).json({ error: "payment_amount invalide" });
      }
      addUpdate("payment_amount", paymentAmount);
    }

    if (req.body?.payment_doctor_comment !== undefined) {
      if (context.role !== "doctor") {
        return res.status(403).json({ error: "Seul le medecin peut modifier le commentaire de paiement" });
      }
      addUpdate(
        "payment_doctor_comment",
        req.body.payment_doctor_comment ? String(req.body.payment_doctor_comment).trim() : null,
      );
    }

    if (req.body?.doctor_notes !== undefined) {
      if (context.role !== "doctor") {
        return res.status(403).json({ error: "Seul le medecin peut modifier les notes medicales" });
      }
      addUpdate("doctor_notes", req.body.doctor_notes ? String(req.body.doctor_notes).trim() : null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Aucune donnee a mettre a jour" });
    }

    params.push(appointmentId);
    await connection.execute(
      `UPDATE appointments
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = ?`,
      params,
    );

    const appointment = await getAppointmentById(connection, appointmentId);
    return res.json({
      message: "Rendez-vous mis a jour avec succes",
      appointment,
    });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour", details: error.message });
  } finally {
    connection.release();
  }
};

export const deleteAppointment = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour supprimer un rendez-vous" });
    }

    const appointmentId = Number(req.params.id);
    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }

    const access = await ensureAppointmentAccess(connection, context, appointmentId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    await connection.execute("DELETE FROM appointments WHERE id = ?", [appointmentId]);
    return res.json({ message: "Rendez-vous supprime avec succes" });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression", details: error.message });
  } finally {
    connection.release();
  }
};

export const getWaitingRoomCounter = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour la salle d'attente" });
    }

    const date = parseDateOnlyString(req.query?.date || new Date().toISOString().slice(0, 10));
    if (!date) {
      return res.status(400).json({ error: "date invalide (YYYY-MM-DD)" });
    }

    const [rows] = await connection.execute(
      `SELECT waiting_count
       FROM waiting_room_counters
       WHERE doctor_id = ? AND counter_date = ?
       LIMIT 1`,
      [context.doctorId, date],
    );

    return res.json({
      success: true,
      doctor_id: context.doctorId,
      date,
      waiting_count: Number(rows[0]?.waiting_count || 0),
    });
  } catch (error) {
    console.error("Error getting waiting room counter:", error);
    return res.status(500).json({ error: "Erreur lors de la lecture du compteur", details: error.message });
  } finally {
    connection.release();
  }
};

export const setWaitingRoomCounter = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour la salle d'attente" });
    }

    const date = parseDateOnlyString(req.body?.date || new Date().toISOString().slice(0, 10));
    if (!date) {
      return res.status(400).json({ error: "date invalide (YYYY-MM-DD)" });
    }

    const waitingCount = parseInteger(req.body?.waiting_count, null);
    if (!Number.isInteger(waitingCount) || waitingCount < 0 || waitingCount > 5000) {
      return res.status(400).json({ error: "waiting_count doit etre un entier entre 0 et 5000" });
    }

    await connection.execute(
      `INSERT INTO waiting_room_counters (doctor_id, counter_date, waiting_count)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE waiting_count = VALUES(waiting_count), updated_at = CURRENT_TIMESTAMP`,
      [context.doctorId, date, waitingCount],
    );

    return res.json({
      message: "Compteur salle d'attente mis a jour",
      doctor_id: context.doctorId,
      date,
      waiting_count: waitingCount,
    });
  } catch (error) {
    console.error("Error setting waiting room counter:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour du compteur", details: error.message });
  } finally {
    connection.release();
  }
};

export const adjustWaitingRoomCounter = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour la salle d'attente" });
    }

    const date = parseDateOnlyString(req.body?.date || new Date().toISOString().slice(0, 10));
    if (!date) {
      return res.status(400).json({ error: "date invalide (YYYY-MM-DD)" });
    }

    const delta = parseInteger(req.body?.delta, null);
    if (!Number.isInteger(delta) || delta < -100 || delta > 100) {
      return res.status(400).json({ error: "delta invalide" });
    }

    const [rows] = await connection.execute(
      `SELECT waiting_count
       FROM waiting_room_counters
       WHERE doctor_id = ? AND counter_date = ?
       LIMIT 1`,
      [context.doctorId, date],
    );
    const current = Number(rows[0]?.waiting_count || 0);
    const next = Math.max(0, current + delta);

    await connection.execute(
      `INSERT INTO waiting_room_counters (doctor_id, counter_date, waiting_count)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE waiting_count = VALUES(waiting_count), updated_at = CURRENT_TIMESTAMP`,
      [context.doctorId, date, next],
    );

    return res.json({
      message: "Compteur salle d'attente ajuste",
      doctor_id: context.doctorId,
      date,
      waiting_count: next,
    });
  } catch (error) {
    console.error("Error adjusting waiting room counter:", error);
    return res.status(500).json({ error: "Erreur lors de l'ajustement du compteur", details: error.message });
  } finally {
    connection.release();
  }
};

export const getAppointmentFiche = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour generer une fiche" });
    }

    const appointmentId = Number(req.params.id);
    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }

    const [rows] = await connection.execute(
      `SELECT a.id, a.doctor_id, a.secretary_id, a.patient_id, a.booked_by_patient_user_id, a.patient_matricule, a.patient_nom, a.patient_prenom,
              a.patient_cin, a.patient_phone, a.patient_date_naissance,
              a.appointment_at,
              a.payment_amount, a.payment_doctor_comment, a.doctor_notes,
              d.nom AS doctor_nom, d.prenom AS doctor_prenom, d.specialty AS doctor_specialty,
              s.nom AS secretary_nom, s.prenom AS secretary_prenom
       FROM appointments a
       INNER JOIN doctors d ON d.id = a.doctor_id
       LEFT JOIN secretaries s ON s.id = a.secretary_id
       WHERE a.id = ?
       LIMIT 1`,
      [appointmentId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Rendez-vous introuvable" });
    }

    const appointment = rows[0];
    if (Number(appointment.doctor_id) !== Number(context.doctorId)) {
      return res.status(403).json({ error: "Acces refuse a cette fiche" });
    }

    const consultations = await getPatientConsultations(
      connection,
      context.doctorId,
      appointment.patient_id ?? null,
      appointment.patient_matricule || null,
      appointment.id,
    );

    return res.json({
      success: true,
      fiche: {
        fiche_id: `PAT-${appointment.patient_matricule || String(appointment.patient_id || appointment.id)}`,
        generated_at: new Date().toISOString(),
        patient: {
          id: appointment.patient_id,
          patient_id: appointment.patient_id,
          matricule: appointment.patient_matricule,
          nom: appointment.patient_nom,
          prenom: appointment.patient_prenom,
          cin: appointment.patient_cin,
          telephone: appointment.patient_phone,
          date_naissance: appointment.patient_date_naissance,
        },
        doctor: {
          nom: appointment.doctor_nom,
          prenom: appointment.doctor_prenom,
          specialty: appointment.doctor_specialty,
        },
        consultations,
      },
    });
  } catch (error) {
    console.error("Error generating appointment fiche:", error);
    return res.status(500).json({ error: "Erreur lors de la generation de fiche", details: error.message });
  } finally {
    connection.release();
  }
};

export default {
  getCalendarAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getWaitingRoomCounter,
  setWaitingRoomCounter,
  adjustWaitingRoomCounter,
  getAppointmentFiche,
};
