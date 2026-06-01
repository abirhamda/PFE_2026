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

const ensureIndex = async (connection, tableName, indexName, definition) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.statistics
     WHERE table_schema = ?
       AND table_name = ?
       AND index_name = ?`,
    [DB_NAME, tableName, indexName],
  );

  if (rows[0].count > 0) {
    console.log(`[skip] Index ${tableName}.${indexName} already exists`);
    return;
  }

  await connection.query(`ALTER TABLE \`${tableName}\` ADD ${definition}`);
  console.log(`[ok] Added index ${tableName}.${indexName}`);
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

const normalizeNullableCinColumn = async (connection, tableName, columnName) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = ?
       AND table_name = ?
       AND column_name = ?`,
    [DB_NAME, tableName, columnName],
  );

  if (rows[0].count === 0) {
    console.log(`[skip] ${tableName}.${columnName} not found for normalization`);
    return;
  }

  await connection.query(
    `UPDATE \`${tableName}\`
     SET \`${columnName}\` = NULLIF(TRIM(\`${columnName}\`), '')
     WHERE \`${columnName}\` IS NOT NULL`,
  );
  console.log(`[ok] Normalized ${tableName}.${columnName}`);
};

const normalizeRequiredCinColumn = async (connection, tableName, columnName) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = ?
       AND table_name = ?
       AND column_name = ?`,
    [DB_NAME, tableName, columnName],
  );

  if (rows[0].count === 0) {
    console.log(`[skip] ${tableName}.${columnName} not found for normalization`);
    return;
  }

  await connection.query(
    `UPDATE \`${tableName}\`
     SET \`${columnName}\` = TRIM(\`${columnName}\`)
     WHERE \`${columnName}\` IS NOT NULL`,
  );
  console.log(`[ok] Trimmed ${tableName}.${columnName}`);
};

const throwIfDuplicateRows = async (connection, query, label) => {
  const [rows] = await connection.query(query);
  if (rows.length === 0) {
    console.log(`[ok] No duplicates found for ${label}`);
    return;
  }

  const sample = rows
    .slice(0, 5)
    .map((row) => Object.entries(row).map(([key, value]) => `${key}=${value}`).join(", "))
    .join(" | ");

  throw new Error(`Duplicate ${label} detected. Resolve these rows before retrying migration: ${sample}`);
};

const ensureCinUniquenessGuards = async (connection) => {
  await ensureColumn(connection, "users", "cin", "VARCHAR(30) NULL");

  await normalizeRequiredCinColumn(connection, "doctors", "cin");
  await normalizeNullableCinColumn(connection, "users", "cin");
  await normalizeNullableCinColumn(connection, "patient_portal_profiles", "cin");
  await normalizeNullableCinColumn(connection, "patients", "cin");
  await normalizeNullableCinColumn(connection, "doctor_patients", "cin");

  await connection.query(
    `UPDATE users u
     INNER JOIN doctors d
       ON d.email = u.email
      AND u.role = 'doctor'
     SET u.cin = TRIM(d.cin)
     WHERE d.cin IS NOT NULL
       AND TRIM(d.cin) <> ''
       AND (u.cin IS NULL OR TRIM(u.cin) = '')`,
  );
  console.log("[ok] Backfilled users.cin from doctors");

  await connection.query(
    `UPDATE users u
     INNER JOIN patient_portal_profiles p
       ON p.user_id = u.id
     SET u.cin = TRIM(p.cin)
     WHERE p.cin IS NOT NULL
       AND TRIM(p.cin) <> ''
       AND (u.cin IS NULL OR TRIM(u.cin) = '')`,
  );
  console.log("[ok] Backfilled users.cin from patient portal profiles");

  await throwIfDuplicateRows(
    connection,
    `SELECT TRIM(cin) AS cin_value,
            COUNT(*) AS total,
            GROUP_CONCAT(CONCAT(role, ':', email) ORDER BY id SEPARATOR ', ') AS accounts
     FROM users
     WHERE cin IS NOT NULL
       AND TRIM(cin) <> ''
     GROUP BY TRIM(cin)
     HAVING COUNT(*) > 1
     LIMIT 10`,
    "users.cin",
  );

  await throwIfDuplicateRows(
    connection,
    `SELECT TRIM(cin) AS cin_value,
            COUNT(*) AS total,
            GROUP_CONCAT(CONCAT('user_id:', user_id, ' email:', email) ORDER BY id SEPARATOR ', ') AS profiles
     FROM patient_portal_profiles
     WHERE cin IS NOT NULL
       AND TRIM(cin) <> ''
     GROUP BY TRIM(cin)
     HAVING COUNT(*) > 1
     LIMIT 10`,
    "patient_portal_profiles.cin",
  );

  await throwIfDuplicateRows(
    connection,
    `SELECT doctor_id,
            TRIM(cin) AS cin_value,
            COUNT(*) AS total,
            GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') AS patient_ids
     FROM doctor_patients
     WHERE cin IS NOT NULL
       AND TRIM(cin) <> ''
     GROUP BY doctor_id, TRIM(cin)
     HAVING COUNT(*) > 1
     LIMIT 10`,
    "doctor_patients(doctor_id, cin)",
  );

  await ensureIndex(connection, "users", "uq_users_cin", "UNIQUE KEY `uq_users_cin` (`cin`)");
  await ensureIndex(
    connection,
    "patient_portal_profiles",
    "uq_patient_portal_profiles_cin",
    "UNIQUE KEY `uq_patient_portal_profiles_cin` (`cin`)",
  );
  await ensureIndex(
    connection,
    "doctor_patients",
    "uq_doctor_patients_doctor_cin",
    "UNIQUE KEY `uq_doctor_patients_doctor_cin` (`doctor_id`, `cin`)",
  );
};

const ensureSupplierExtensions = async (connection) => {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS supplier_products (
       id INT AUTO_INCREMENT PRIMARY KEY,
       supplier_id INT NOT NULL,
       nom VARCHAR(140) NOT NULL,
       description TEXT NULL,
       prix DECIMAL(10,2) NULL,
       quantite_disponible INT NOT NULL DEFAULT 0,
       unite VARCHAR(40) NULL,
       is_active TINYINT(1) NOT NULL DEFAULT 1,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       CONSTRAINT fk_supplier_products_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
       UNIQUE KEY uq_supplier_product_nom (supplier_id, nom),
       INDEX idx_supplier_products_supplier (supplier_id, is_active)
     ) ENGINE=InnoDB`,
  );
  console.log("[ok] Ensured table supplier_products exists");

  await connection.query(
    `CREATE TABLE IF NOT EXISTS supplier_partnership_requests (
       id INT AUTO_INCREMENT PRIMARY KEY,
       pharmacie_id INT NOT NULL,
       supplier_id INT NOT NULL,
       message TEXT NULL,
       status ENUM('en_attente', 'acceptee', 'refusee') NOT NULL DEFAULT 'en_attente',
       response_note TEXT NULL,
       created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       responded_at DATETIME NULL,
       CONSTRAINT fk_partnership_requests_pharmacie FOREIGN KEY (pharmacie_id) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE,
       CONSTRAINT fk_partnership_requests_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
       UNIQUE KEY uq_partnership_requests_pair (pharmacie_id, supplier_id),
       INDEX idx_partnership_requests_supplier_status (supplier_id, status),
       INDEX idx_partnership_requests_pharmacy_status (pharmacie_id, status)
     ) ENGINE=InnoDB`,
  );
  console.log("[ok] Ensured table supplier_partnership_requests exists");

  await connection.query(
    `CREATE TABLE IF NOT EXISTS pharmacy_ordonnance_views (
       id INT AUTO_INCREMENT PRIMARY KEY,
       pharmacie_id INT NOT NULL,
       ordonnance_id INT NOT NULL,
       view_count INT NOT NULL DEFAULT 1,
       first_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       last_viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       CONSTRAINT fk_pharmacy_ordonnance_views_pharmacy FOREIGN KEY (pharmacie_id) REFERENCES pharmacie(id_pharmacie) ON DELETE CASCADE,
       CONSTRAINT fk_pharmacy_ordonnance_views_ordonnance FOREIGN KEY (ordonnance_id) REFERENCES ordonnances(id) ON DELETE CASCADE,
       UNIQUE KEY uq_pharmacy_ordonnance_view (pharmacie_id, ordonnance_id),
       INDEX idx_pharmacy_ordonnance_views_pharmacy (pharmacie_id, last_viewed_at)
     ) ENGINE=InnoDB`,
  );
  console.log("[ok] Ensured table pharmacy_ordonnance_views exists");
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
    await ensureSupplierExtensions(connection);

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
    await ensureColumn(connection, "pharmacie", "address_line", "VARCHAR(255) NULL");
    await ensureColumn(connection, "pharmacie", "city", "VARCHAR(120) NULL");
    await ensureColumn(
      connection,
      "medicaments_stock",
      "created_at",
      "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP",
    );
    await ensureColumn(connection, "medicaments_stock", "seuil_alerte", "INT NOT NULL DEFAULT 10");
    await ensureColumn(
      connection,
      "medicaments_stock",
      "updated_at",
      "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    );
    await ensureColumn(connection, "ordonnances", "doctor_id", "INT NULL");
    await ensureColumn(connection, "ordonnances", "pation_id", "INT NULL");
    await ensureColumn(connection, "demandes", "response_note", "TEXT NULL");
    await ensureColumn(
      connection,
      "demandes",
      "updated_at",
      "TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    );
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
    await ensureCinUniquenessGuards(connection);
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
