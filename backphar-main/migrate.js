import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const DB_NAME = process.env.DB_NAME || "application_medicale";
const connectionConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: Number(process.env.DB_PORT) || 3306,
  multipleStatements: false,
};

const readSchemaStatements = () => {
  const schemaPath = path.join(process.cwd(), "sql", "pharmaconnect_schema.sql");
  const raw = fs.readFileSync(schemaPath, "utf8");

  const withoutLineComments = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return withoutLineComments
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .filter((statement) => !/^(CREATE DATABASE|USE|SET|DROP TABLE)\b/i.test(statement))
    .map((statement) =>
      /^CREATE TABLE\b/i.test(statement)
        ? statement.replace(/^CREATE TABLE\b/i, "CREATE TABLE IF NOT EXISTS")
        : statement,
    );
};

const extractExpectedTableNames = (statements) =>
  statements
    .filter((statement) => /^CREATE TABLE IF NOT EXISTS\b/i.test(statement))
    .map((statement) => {
      const match = statement.match(/^CREATE TABLE IF NOT EXISTS\s+`?([a-zA-Z0-9_]+)`?/i);
      return match?.[1];
    })
    .filter(Boolean);

const ensureColumn = async (connection, tableName, columnName, definition) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = ?
       AND table_name = ?
       AND column_name = ?`,
    [DB_NAME, tableName, columnName],
  );

  if (rows[0].count > 0) {
    console.log(`[skip] ${tableName}.${columnName} already exists`);
    return;
  }

  await connection.query(
    `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`,
  );
  console.log(`[ok] Added column ${tableName}.${columnName}`);
};

const ensureColumnDropped = async (connection, tableName, columnName) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = ?
       AND table_name = ?
       AND column_name = ?`,
    [DB_NAME, tableName, columnName],
  );

  if (rows[0].count === 0) {
    console.log(`[skip] ${tableName}.${columnName} already absent`);
    return;
  }

  await connection.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
  console.log(`[ok] Dropped column ${tableName}.${columnName}`);
};

const dropForeignKeyIfExists = async (connection, tableName, constraintName) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.table_constraints
     WHERE table_schema = ?
       AND table_name = ?
       AND constraint_name = ?
       AND constraint_type = 'FOREIGN KEY'`,
    [DB_NAME, tableName, constraintName],
  );

  if (rows[0].count === 0) {
    console.log(`[skip] FK ${tableName}.${constraintName} already absent`);
    return;
  }

  await connection.query(`ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${constraintName}\``);
  console.log(`[ok] Dropped FK ${tableName}.${constraintName}`);
};

const dropIndexIfExists = async (connection, tableName, indexName) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.statistics
     WHERE table_schema = ?
       AND table_name = ?
       AND index_name = ?`,
    [DB_NAME, tableName, indexName],
  );

  if (rows[0].count === 0) {
    console.log(`[skip] Index ${tableName}.${indexName} already absent`);
    return;
  }

  await connection.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``);
  console.log(`[ok] Dropped index ${tableName}.${indexName}`);
};

const dropTableIfExists = async (connection, tableName) => {
  await connection.query(`DROP TABLE IF EXISTS \`${tableName}\``);
  console.log(`[ok] Ensured table ${tableName} is removed`);
};

const ensureUsersRoleEnumIncludesRequiredRoles = async (connection) => {
  const [rows] = await connection.query(
    `SELECT COLUMN_TYPE
     FROM information_schema.columns
     WHERE table_schema = ?
       AND table_name = 'users'
       AND column_name = 'role'
     LIMIT 1`,
    [DB_NAME],
  );

  if (rows.length === 0) {
    throw new Error("users.role column not found");
  }

  const columnType = String(rows[0].COLUMN_TYPE || "").toLowerCase();
  const hasPation = columnType.includes("'pation'");
  const hasSecretaire = columnType.includes("'secretaire'");
  if (hasPation && hasSecretaire) {
    console.log("[skip] users.role enum already includes 'pation' and 'secretaire'");
    return;
  }

  await connection.query(
    `ALTER TABLE users
     MODIFY COLUMN role ENUM('admin','pharmacist','doctor','supplier','pation','secretaire') NOT NULL`,
  );
  console.log("[ok] Updated users.role enum to include 'pation' and 'secretaire'");
};

const ensureOrdonnancesCinNullable = async (connection) => {
  await connection.query("ALTER TABLE ordonnances MODIFY COLUMN cin VARCHAR(30) NULL");
  console.log("[ok] Ensured ordonnances.cin is nullable");
};

const ensureGlobalPatientsManyToMany = async (connection) => {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS patients (
       id INT AUTO_INCREMENT PRIMARY KEY,
       nom VARCHAR(120) NOT NULL,
       prenom VARCHAR(120) NOT NULL,
       cin VARCHAR(30) NULL,
       telephone VARCHAR(30) NULL,
       date_naissance DATE NULL,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       UNIQUE KEY uq_patients_cin (cin),
       INDEX idx_patients_identity (nom, prenom, date_naissance)
     ) ENGINE=InnoDB`,
  );
  console.log("[ok] Ensured table patients exists");

  await ensureColumn(connection, "doctor_patients", "patient_global_id", "INT NULL");

  await connection.query(
    `INSERT INTO patients (nom, prenom, cin, telephone, date_naissance, created_at, updated_at)
     SELECT
       MAX(dp.nom) AS nom,
       MAX(dp.prenom) AS prenom,
       dp.cin,
       MAX(dp.telephone) AS telephone,
       MAX(dp.date_naissance) AS date_naissance,
       NOW(),
       NOW()
     FROM doctor_patients dp
     WHERE dp.cin IS NOT NULL
       AND TRIM(dp.cin) <> ''
     GROUP BY dp.cin
     ON DUPLICATE KEY UPDATE
       updated_at = VALUES(updated_at)`,
  );

  await connection.query(
    `INSERT INTO patients (nom, prenom, cin, telephone, date_naissance, created_at, updated_at)
     SELECT
       dp.nom,
       dp.prenom,
       NULL,
       dp.telephone,
       dp.date_naissance,
       NOW(),
       NOW()
     FROM doctor_patients dp
     WHERE dp.cin IS NULL OR TRIM(dp.cin) = ''
     GROUP BY
       dp.nom,
       dp.prenom,
       IFNULL(dp.telephone, ''),
       IFNULL(dp.date_naissance, '1000-01-01')
     HAVING NOT EXISTS (
       SELECT 1
       FROM patients p
       WHERE p.cin IS NULL
         AND p.nom = dp.nom
         AND p.prenom = dp.prenom
         AND IFNULL(p.telephone, '') = IFNULL(dp.telephone, '')
         AND IFNULL(p.date_naissance, '1000-01-01') = IFNULL(dp.date_naissance, '1000-01-01')
     )`,
  );
  console.log("[ok] Backfilled patients table from doctor_patients");

  await connection.query(
    `UPDATE doctor_patients dp
     SET dp.patient_global_id = (
       SELECT MIN(p.id)
       FROM patients p
       WHERE (
           dp.cin IS NOT NULL
           AND p.cin = dp.cin
         )
         OR (
           dp.cin IS NULL
           AND p.cin IS NULL
           AND p.nom = dp.nom
           AND p.prenom = dp.prenom
           AND IFNULL(p.telephone, '') = IFNULL(dp.telephone, '')
           AND IFNULL(p.date_naissance, '1000-01-01') = IFNULL(dp.date_naissance, '1000-01-01')
         )
     )
     WHERE dp.patient_global_id IS NULL`,
  );
  console.log("[ok] Linked doctor_patients to global patients");

  const [fkRows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.table_constraints
     WHERE table_schema = ?
       AND table_name = 'doctor_patients'
       AND constraint_name = 'fk_doctor_patients_global_patient'
       AND constraint_type = 'FOREIGN KEY'`,
    [DB_NAME],
  );
  if (fkRows[0].count === 0) {
    await connection.query(
      `ALTER TABLE doctor_patients
       ADD CONSTRAINT fk_doctor_patients_global_patient
       FOREIGN KEY (patient_global_id) REFERENCES patients(id) ON DELETE SET NULL`,
    );
    console.log("[ok] Added FK doctor_patients.patient_global_id -> patients.id");
  } else {
    console.log("[skip] FK doctor_patients.patient_global_id already exists");
  }
};

const runMigration = async () => {
  let connection;
  try {
    console.log(`[info] Starting migration on database "${DB_NAME}"...`);

    connection = await mysql.createConnection(connectionConfig);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.query(`USE \`${DB_NAME}\``);

    const statements = readSchemaStatements();
    const expectedTables = extractExpectedTableNames(statements);

    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log(`[ok] Schema sync executed (${expectedTables.length} tables declared).`);
    await ensureUsersRoleEnumIncludesRequiredRoles(connection);
    await ensureOrdonnancesCinNullable(connection);

    await ensureColumn(connection, "notifications", "demande_id", "INT NULL");
    await ensureColumn(
      connection,
      "notifications",
      "created_at",
      "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    );
    await ensureColumn(connection, "pharmacie", "is_active", "TINYINT(1) NOT NULL DEFAULT 1");
    await ensureColumn(
      connection,
      "pharmacie",
      "created_at",
      "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    );
    await ensureColumn(
      connection,
      "medicaments_stock",
      "created_at",
      "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    );
    await ensureColumn(connection, "ordonnances", "doctor_id", "INT NULL");
    await ensureColumn(connection, "ordonnances", "pation_id", "INT NULL");
    await ensureColumn(connection, "appointments", "patient_id", "INT NULL");
    await ensureColumn(connection, "appointments", "booked_by_patient_user_id", "INT NULL");
    await ensureColumn(connection, "appointments", "patient_matricule", "VARCHAR(30) NULL");
    await ensureColumn(connection, "appointments", "patient_date_naissance", "DATE NULL");
    await ensureColumn(connection, "appointments", "payment_amount", "DECIMAL(10,2) NULL");
    await ensureColumn(connection, "appointments", "payment_doctor_comment", "TEXT NULL");
    await ensureColumn(connection, "appointments", "doctor_notes", "TEXT NULL");
    await ensureColumn(
      connection,
      "appointments",
      "created_by_role",
      "ENUM('doctor','secretaire') NOT NULL DEFAULT 'doctor'",
    );
    await ensureColumn(connection, "patient_fiche_notes", "entry_at", "DATETIME NOT NULL");
    await ensureGlobalPatientsManyToMany(connection);
    await ensureColumnDropped(connection, "appointments", "notes");
    await ensureColumnDropped(connection, "appointments", "consultation_description");
    await ensureColumnDropped(connection, "appointments", "duration_minutes");
    await ensureColumnDropped(connection, "appointments", "waiting_room_count");
    await ensureColumnDropped(connection, "appointments", "status");
    await dropIndexIfExists(connection, "appointments", "idx_appointments_status");
    await dropForeignKeyIfExists(connection, "ordonnances", "fk_ordonnances_pation");
    await dropTableIfExists(connection, "pations");

    await connection.query(
      `UPDATE ordonnances
       SET doctor_id = id_doctor
       WHERE doctor_id IS NULL
         AND id_doctor IS NOT NULL`,
    );
    console.log("[ok] Backfilled ordonnances.doctor_id from id_doctor when possible.");

    const [existingRows] = await connection.query("SHOW TABLES");
    const key = `Tables_in_${DB_NAME}`;
    const existingTables = new Set(existingRows.map((row) => row[key]));
    const missingTables = expectedTables.filter((tableName) => !existingTables.has(tableName));

    if (missingTables.length > 0) {
      throw new Error(`Missing tables after migration: ${missingTables.join(", ")}`);
    }

    console.log("[ok] Migration finished successfully.");
    process.exitCode = 0;
  } catch (error) {
    console.error("[error] Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

runMigration();
