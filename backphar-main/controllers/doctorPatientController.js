import db from "../db.js";

const normalizeRole = (role) => String(role || "").trim().toLowerCase();
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeMatricule = (matricule) =>
  String(matricule || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "-");

const DEMO_PATIENTS = [
  { nom: "Benali", prenom: "Yassine", cin: "BK123456", telephone: "0611111111", date_naissance: "1990-03-12" },
  { nom: "Alaoui", prenom: "Meriem", cin: "CD223344", telephone: "0622222222", date_naissance: "1987-07-21" },
  { nom: "Tazi", prenom: "Imane", cin: "EF556677", telephone: "0633333333", date_naissance: "1995-11-05" },
  { nom: "Chraibi", prenom: "Nabil", cin: "GH889900", telephone: "0644444444", date_naissance: "1982-01-30" },
  { nom: "Rami", prenom: "Sara", cin: "IJ112233", telephone: "0655555555", date_naissance: "1998-09-14" },
  { nom: "Kabbaj", prenom: "Hamza", cin: "KL445566", telephone: "0666666666", date_naissance: "1992-05-18" },
];

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
    return { role, doctorId: Number(rows[0].id), doctor: rows[0], secretaryId: null };
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

const validatePatientPayload = (payload) => {
  const nom = String(payload?.nom || "").trim();
  const prenom = String(payload?.prenom || "").trim();
  const cin = payload?.cin ? String(payload.cin).trim() : null;
  const telephone = payload?.telephone ? String(payload.telephone).trim() : null;
  const dateNaissance = payload?.date_naissance ? String(payload.date_naissance).trim() : null;

  if (!nom || !prenom) {
    return { valid: false, error: "nom et prenom sont obligatoires" };
  }

  if (dateNaissance && !/^\d{4}-\d{2}-\d{2}$/.test(dateNaissance)) {
    return { valid: false, error: "date_naissance invalide (YYYY-MM-DD)" };
  }

  return {
    valid: true,
    data: {
      nom,
      prenom,
      cin,
      telephone,
      dateNaissance,
    },
  };
};

const parseDecimalOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const toSqlDateTimeOrNull = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
    const normalized = raw.replace("T", " ");
    return normalized.length === 16 ? `${normalized}:00` : normalized;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const getSortValue = (value) => {
  const date = new Date(String(value || "").replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const safeRollback = async (connection) => {
  try {
    await connection.rollback();
  } catch (_error) {
    // no-op
  }
};

const buildGeneratedMatricule = async (connection, doctorId) => {
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

const resolveGlobalPatientId = async (connection, { nom, prenom, cin, telephone, dateNaissance }) => {
  try {
    if (cin) {
      const [rowsByCin] = await connection.execute("SELECT id FROM patients WHERE cin = ? LIMIT 1", [cin]);
      if (rowsByCin.length > 0) return Number(rowsByCin[0].id);
    }

    const [rowsByIdentity] = await connection.execute(
      `SELECT id
       FROM patients
       WHERE nom = ?
         AND prenom = ?
         AND IFNULL(telephone, '') = IFNULL(?, '')
         AND IFNULL(date_naissance, '1000-01-01') = IFNULL(?, '1000-01-01')
       LIMIT 1`,
      [nom, prenom, telephone, dateNaissance],
    );
    if (rowsByIdentity.length > 0) return Number(rowsByIdentity[0].id);

    const [insertResult] = await connection.execute(
      `INSERT INTO patients
       (nom, prenom, cin, telephone, date_naissance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      [nom, prenom, cin, telephone, dateNaissance],
    );

    return Number(insertResult.insertId);
  } catch (error) {
    // Keep compatibility if migration is not executed yet.
    if (error?.code === "ER_NO_SUCH_TABLE") {
      return null;
    }
    throw error;
  }
};

const seedDemoPatientsIfEmpty = async (connection, doctorId) => {
  const [rows] = await connection.execute(
    "SELECT COUNT(*) AS total FROM doctor_patients WHERE doctor_id = ?",
    [doctorId],
  );
  if (Number(rows[0]?.total || 0) > 0) return;

  for (const patient of DEMO_PATIENTS) {
    const matricule = await buildGeneratedMatricule(connection, doctorId);
    const patientGlobalId = await resolveGlobalPatientId(connection, {
      nom: patient.nom,
      prenom: patient.prenom,
      cin: patient.cin,
      telephone: patient.telephone,
      dateNaissance: patient.date_naissance,
    });
    await connection.execute(
      `INSERT INTO doctor_patients
       (doctor_id, patient_global_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        doctorId,
        patientGlobalId,
        matricule,
        patient.nom,
        patient.prenom,
        patient.cin,
        patient.telephone,
        patient.date_naissance,
      ],
    );
  }
};

const ensurePatientAccess = async (connection, doctorId, patientId) => {
  const [rows] = await connection.execute(
    `SELECT id, doctor_id, patient_global_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at
     FROM doctor_patients
     WHERE id = ?
     LIMIT 1`,
    [patientId],
  );

  if (rows.length === 0) {
    return { ok: false, status: 404, error: "Patient introuvable" };
  }

  const patient = rows[0];
  if (Number(patient.doctor_id) !== Number(doctorId)) {
    return { ok: false, status: 403, error: "Acces refuse a ce patient" };
  }

  return { ok: true, patient };
};

const getPatientConsultations = async (connection, doctorId, patientId, patientMatricule) => {
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
       AND (a.patient_id = ? OR (a.patient_matricule IS NOT NULL AND a.patient_matricule = ?))`,
    [doctorId, patientId, patientMatricule],
  );

  let freeNoteRows = [];
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

const linkUnknownAppointmentsToPatient = async (connection, doctorId, patient) => {
  const cin = patient?.cin ? String(patient.cin).trim() : null;
  const nom = String(patient?.nom || "").trim();
  const prenom = String(patient?.prenom || "").trim();
  const phone = patient?.telephone ? String(patient.telephone).trim() : "";

  if (!nom || !prenom) return;

  await connection.execute(
    `UPDATE appointments
     SET patient_id = ?, patient_matricule = ?, patient_nom = ?, patient_prenom = ?,
         patient_cin = ?, patient_phone = ?, patient_date_naissance = ?, updated_at = NOW()
     WHERE doctor_id = ?
       AND patient_id IS NULL
       AND (
         (? IS NOT NULL AND patient_cin = ?)
         OR (
           patient_nom = ?
           AND patient_prenom = ?
           AND IFNULL(patient_phone, '') = IFNULL(?, '')
         )
       )`,
    [
      patient.id,
      patient.matricule,
      patient.nom,
      patient.prenom,
      patient.cin || null,
      patient.telephone || null,
      patient.date_naissance || null,
      doctorId,
      cin,
      cin,
      nom,
      prenom,
      phone,
    ],
  );
};

export const listPatients = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour acceder aux patients" });
    }

    const searchRaw = String(req.query?.search || "").trim();
    const hasSearch = searchRaw.length > 0;
    const search = `%${searchRaw}%`;

    if (!hasSearch) {
      await seedDemoPatientsIfEmpty(connection, context.doctorId);
    }

    const [rows] = await connection.execute(
      `SELECT id, doctor_id, patient_global_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at
       FROM doctor_patients
       WHERE doctor_id = ?
         AND (
           ? = 0
           OR nom LIKE ?
           OR prenom LIKE ?
           OR matricule LIKE ?
           OR IFNULL(cin, '') LIKE ?
           OR IFNULL(telephone, '') LIKE ?
         )
       ORDER BY updated_at DESC, created_at DESC`,
      [context.doctorId, hasSearch ? 1 : 0, search, search, search, search, search],
    );

    return res.json({
      success: true,
      count: rows.length,
      patients: rows,
    });
  } catch (error) {
    console.error("Error listing doctor patients:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation des patients", details: error.message });
  } finally {
    connection.release();
  }
};

export const createPatient = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour creer un patient" });
    }

    const validation = validatePatientPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { nom, prenom, cin, telephone, dateNaissance } = validation.data;
    await connection.beginTransaction();

    const matricule = await buildGeneratedMatricule(connection, context.doctorId);
    const patientGlobalId = await resolveGlobalPatientId(connection, {
      nom,
      prenom,
      cin,
      telephone,
      dateNaissance,
    });

    const [existing] = await connection.execute(
      "SELECT id FROM doctor_patients WHERE doctor_id = ? AND matricule = ? LIMIT 1",
      [context.doctorId, matricule],
    );
    if (existing.length > 0) {
      await safeRollback(connection);
      return res.status(409).json({ error: "Ce matricule existe deja pour ce docteur" });
    }

    const [insertResult] = await connection.execute(
      `INSERT INTO doctor_patients
       (doctor_id, patient_global_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [context.doctorId, patientGlobalId, matricule, nom, prenom, cin, telephone, dateNaissance],
    );

    const [rows] = await connection.execute(
      `SELECT id, doctor_id, patient_global_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at
       FROM doctor_patients
       WHERE id = ?
       LIMIT 1`,
      [insertResult.insertId],
    );
    await linkUnknownAppointmentsToPatient(connection, context.doctorId, rows[0]);

    await connection.commit();
    return res.status(201).json({
      message: "Patient cree avec succes",
      patient: rows[0],
    });
  } catch (error) {
    await safeRollback(connection);
    console.error("Error creating doctor patient:", error);
    return res.status(500).json({ error: "Erreur lors de la creation du patient", details: error.message });
  } finally {
    connection.release();
  }
};

export const updatePatient = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour modifier un patient" });
    }

    const patientId = Number(req.params.id);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }

    const validation = validatePatientPayload(req.body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const access = await ensurePatientAccess(connection, context.doctorId, patientId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const { nom, prenom, cin, telephone, dateNaissance } = validation.data;
    const matricule = access.patient.matricule;
    const patientGlobalId = await resolveGlobalPatientId(connection, {
      nom,
      prenom,
      cin,
      telephone,
      dateNaissance,
    });

    await connection.execute(
      `UPDATE doctor_patients
       SET patient_global_id = ?, matricule = ?, nom = ?, prenom = ?, cin = ?, telephone = ?, date_naissance = ?, updated_at = NOW()
       WHERE id = ?`,
      [patientGlobalId, matricule, nom, prenom, cin, telephone, dateNaissance, patientId],
    );

    await connection.execute(
      `UPDATE appointments
       SET patient_matricule = ?, patient_nom = ?, patient_prenom = ?, patient_cin = ?, patient_phone = ?, patient_date_naissance = ?, updated_at = NOW()
       WHERE doctor_id = ? AND patient_id = ?`,
      [matricule, nom, prenom, cin, telephone, dateNaissance, context.doctorId, patientId],
    );

    const [rows] = await connection.execute(
      `SELECT id, doctor_id, patient_global_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at
       FROM doctor_patients
       WHERE id = ?
       LIMIT 1`,
      [patientId],
    );

    await linkUnknownAppointmentsToPatient(connection, context.doctorId, rows[0]);

    return res.json({
      message: "Patient mis a jour avec succes",
      patient: rows[0],
    });
  } catch (error) {
    console.error("Error updating doctor patient:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour du patient", details: error.message });
  } finally {
    connection.release();
  }
};

export const deletePatient = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour supprimer un patient" });
    }

    const patientId = Number(req.params.id);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }

    const access = await ensurePatientAccess(connection, context.doctorId, patientId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    await connection.execute("DELETE FROM doctor_patients WHERE id = ?", [patientId]);
    return res.json({ message: "Patient supprime avec succes" });
  } catch (error) {
    console.error("Error deleting doctor patient:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression du patient", details: error.message });
  } finally {
    connection.release();
  }
};

export const getPatientByMatricule = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide" });
    }

    const matricule = normalizeMatricule(req.params.matricule);
    if (!matricule) {
      return res.status(400).json({ error: "matricule invalide" });
    }

    const [rows] = await connection.execute(
      `SELECT id, doctor_id, patient_global_id, matricule, nom, prenom, cin, telephone, date_naissance, created_at, updated_at
       FROM doctor_patients
       WHERE doctor_id = ? AND matricule = ?
       LIMIT 1`,
      [context.doctorId, matricule],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Patient introuvable pour ce matricule" });
    }

    return res.json({ success: true, patient: rows[0] });
  } catch (error) {
    console.error("Error fetching patient by matricule:", error);
    return res.status(500).json({ error: "Erreur lors de la recherche du patient", details: error.message });
  } finally {
    connection.release();
  }
};

export const getPatientFiche = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour consulter la fiche" });
    }

    const patientId = Number(req.params.id);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }

    const access = await ensurePatientAccess(connection, context.doctorId, patientId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const consultations = await getPatientConsultations(
      connection,
      context.doctorId,
      patientId,
      access.patient.matricule,
    );

    return res.json({
      success: true,
      fiche: {
        fiche_id: `PAT-${access.patient.matricule || String(access.patient.id)}`,
        generated_at: new Date().toISOString(),
        patient: access.patient,
        doctor: {
          nom: context.doctor?.nom || null,
          prenom: context.doctor?.prenom || null,
          specialty: context.doctor?.specialty || null,
        },
        consultations,
      },
    });
  } catch (error) {
    console.error("Error fetching patient fiche:", error);
    return res.status(500).json({ error: "Erreur lors de la recuperation de la fiche patient", details: error.message });
  } finally {
    connection.release();
  }
};

export const createPatientFicheNote = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour modifier la fiche" });
    }
    if (context.role !== "doctor") {
      return res.status(403).json({ error: "Seul le medecin peut ajouter des notes de fiche" });
    }

    const patientId = Number(req.params.id);
    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({ error: "id invalide" });
    }

    const access = await ensurePatientAccess(connection, context.doctorId, patientId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const doctorNotes = req.body?.doctor_notes ? String(req.body.doctor_notes).trim() : null;
    const paymentDoctorComment = req.body?.payment_doctor_comment
      ? String(req.body.payment_doctor_comment).trim()
      : null;
    const paymentAmount = parseDecimalOrNull(req.body?.payment_amount);

    if (Number.isNaN(paymentAmount) || (paymentAmount !== null && paymentAmount < 0)) {
      return res.status(400).json({ error: "payment_amount invalide" });
    }
    if (!doctorNotes && paymentAmount === null && !paymentDoctorComment) {
      return res.status(400).json({ error: "Veuillez saisir au moins une note ou un paiement" });
    }

    const entryAt = toSqlDateTimeOrNull(req.body?.entry_at) || toSqlDateTimeOrNull(new Date().toISOString());
    const [insertResult] = await connection.execute(
      `INSERT INTO patient_fiche_notes
       (doctor_id, patient_id, entry_at, doctor_notes, payment_amount, payment_doctor_comment, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [context.doctorId, patientId, entryAt, doctorNotes, paymentAmount, paymentDoctorComment],
    );

    const [rows] = await connection.execute(
      `SELECT id, entry_at, doctor_notes, payment_amount, payment_doctor_comment, created_at, updated_at
       FROM patient_fiche_notes
       WHERE id = ?
       LIMIT 1`,
      [insertResult.insertId],
    );

    const created = rows[0];
    return res.status(201).json({
      message: "Note de fiche ajoutee",
      consultation: {
        id: `free_note-${created.id}`,
        source_type: "free_note",
        source_id: Number(created.id),
        appointment_id: null,
        entry_at: created.entry_at,
        doctor_notes: created.doctor_notes,
        payment_amount: created.payment_amount,
        payment_doctor_comment: created.payment_doctor_comment,
        created_at: created.created_at,
        updated_at: created.updated_at,
      },
    });
  } catch (error) {
    console.error("Error creating patient fiche note:", error);
    return res.status(500).json({ error: "Erreur lors de l'ajout de note de fiche", details: error.message });
  } finally {
    connection.release();
  }
};

export const updatePatientFicheNote = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour modifier la fiche" });
    }
    if (context.role !== "doctor") {
      return res.status(403).json({ error: "Seul le medecin peut modifier les notes de fiche" });
    }

    const patientId = Number(req.params.id);
    const noteId = Number(req.params.noteId);
    if (!Number.isInteger(patientId) || patientId <= 0 || !Number.isInteger(noteId) || noteId <= 0) {
      return res.status(400).json({ error: "Identifiants invalides" });
    }

    const access = await ensurePatientAccess(connection, context.doctorId, patientId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const [existingRows] = await connection.execute(
      `SELECT id
       FROM patient_fiche_notes
       WHERE id = ? AND doctor_id = ? AND patient_id = ?
       LIMIT 1`,
      [noteId, context.doctorId, patientId],
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Note de fiche introuvable" });
    }

    const updates = [];
    const params = [];
    const addUpdate = (column, value) => {
      updates.push(`${column} = ?`);
      params.push(value);
    };

    if (req.body?.doctor_notes !== undefined) {
      addUpdate("doctor_notes", req.body.doctor_notes ? String(req.body.doctor_notes).trim() : null);
    }
    if (req.body?.payment_doctor_comment !== undefined) {
      addUpdate(
        "payment_doctor_comment",
        req.body.payment_doctor_comment ? String(req.body.payment_doctor_comment).trim() : null,
      );
    }
    if (req.body?.payment_amount !== undefined) {
      const paymentAmount = parseDecimalOrNull(req.body.payment_amount);
      if (Number.isNaN(paymentAmount) || (paymentAmount !== null && paymentAmount < 0)) {
        return res.status(400).json({ error: "payment_amount invalide" });
      }
      addUpdate("payment_amount", paymentAmount);
    }
    if (req.body?.entry_at !== undefined) {
      const entryAt = toSqlDateTimeOrNull(req.body.entry_at);
      if (!entryAt) {
        return res.status(400).json({ error: "entry_at invalide" });
      }
      addUpdate("entry_at", entryAt);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Aucune donnee a mettre a jour" });
    }

    params.push(noteId);
    await connection.execute(
      `UPDATE patient_fiche_notes
       SET ${updates.join(", ")}, updated_at = NOW()
       WHERE id = ?`,
      params,
    );

    const [rows] = await connection.execute(
      `SELECT id, entry_at, doctor_notes, payment_amount, payment_doctor_comment, created_at, updated_at
       FROM patient_fiche_notes
       WHERE id = ?
       LIMIT 1`,
      [noteId],
    );

    const updated = rows[0];
    return res.json({
      message: "Note de fiche mise a jour",
      consultation: {
        id: `free_note-${updated.id}`,
        source_type: "free_note",
        source_id: Number(updated.id),
        appointment_id: null,
        entry_at: updated.entry_at,
        doctor_notes: updated.doctor_notes,
        payment_amount: updated.payment_amount,
        payment_doctor_comment: updated.payment_doctor_comment,
        created_at: updated.created_at,
        updated_at: updated.updated_at,
      },
    });
  } catch (error) {
    console.error("Error updating patient fiche note:", error);
    return res.status(500).json({ error: "Erreur lors de la mise a jour de note de fiche", details: error.message });
  } finally {
    connection.release();
  }
};

export const deletePatientFicheNote = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const context = await resolveActorContext(connection, req.user);
    if (!context) {
      return res.status(403).json({ error: "Profil invalide pour modifier la fiche" });
    }
    if (context.role !== "doctor") {
      return res.status(403).json({ error: "Seul le medecin peut supprimer une note de fiche" });
    }

    const patientId = Number(req.params.id);
    const noteId = Number(req.params.noteId);
    if (!Number.isInteger(patientId) || patientId <= 0 || !Number.isInteger(noteId) || noteId <= 0) {
      return res.status(400).json({ error: "Identifiants invalides" });
    }

    const access = await ensurePatientAccess(connection, context.doctorId, patientId);
    if (!access.ok) {
      return res.status(access.status).json({ error: access.error });
    }

    const [existingRows] = await connection.execute(
      `SELECT id
       FROM patient_fiche_notes
       WHERE id = ? AND doctor_id = ? AND patient_id = ?
       LIMIT 1`,
      [noteId, context.doctorId, patientId],
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ error: "Note de fiche introuvable" });
    }

    await connection.execute("DELETE FROM patient_fiche_notes WHERE id = ?", [noteId]);
    return res.json({ message: "Note de fiche supprimee" });
  } catch (error) {
    console.error("Error deleting patient fiche note:", error);
    return res.status(500).json({ error: "Erreur lors de la suppression de note de fiche", details: error.message });
  } finally {
    connection.release();
  }
};

export default {
  listPatients,
  createPatient,
  updatePatient,
  deletePatient,
  getPatientByMatricule,
  getPatientFiche,
  createPatientFicheNote,
  updatePatientFicheNote,
  deletePatientFicheNote,
};
