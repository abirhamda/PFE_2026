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
};
const REQUIRED_COLUMNS = {
  password_reset_codes: [
    "user_id",
    "code_hash",
    "expires_at",
    "attempts",
    "used_at",
    "request_ip",
    "user_agent",
    "created_at",
  ],
  pharmacie: ["is_active", "created_at", "address_line", "city"],
  notifications: ["demande_id", "created_at"],
  ordonnances: ["doctor_id", "pation_id", "created_at"],
  medicaments_stock: ["created_at"],
  patient_portal_profiles: [
    "user_id",
    "nom",
    "prenom",
    "email",
    "city",
    "latitude",
    "longitude",
    "updated_at",
  ],
  doctor_public_profiles: [
    "doctor_id",
    "city",
    "latitude",
    "longitude",
    "consultation_duration_min",
    "online_visibility",
    "online_booking_enabled",
    "updated_at",
  ],
  doctor_patients: ["doctor_id", "matricule", "date_naissance", "updated_at"],
  appointments: [
    "patient_id",
    "booked_by_patient_user_id",
    "patient_matricule",
    "patient_date_naissance",
    "payment_amount",
    "payment_doctor_comment",
    "doctor_notes",
    "created_by_role",
  ],
  waiting_room_counters: ["doctor_id", "counter_date", "waiting_count", "updated_at"],
};

const readExpectedTables = () => {
  const schemaPath = path.join(process.cwd(), "sql", "pharmaconnect_schema.sql");
  const raw = fs.readFileSync(schemaPath, "utf8");

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^CREATE TABLE\b/i.test(line))
    .map((line) => {
      const match = line.match(/^CREATE TABLE\s+`?([a-zA-Z0-9_]+)`?/i);
      return match?.[1];
    })
    .filter(Boolean);
};

const checkSchema = async () => {
  let connection;
  try {
    connection = await mysql.createConnection(connectionConfig);

    const [dbRows] = await connection.query("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?", [DB_NAME]);
    if (dbRows.length === 0) {
      console.log(`[error] Database '${DB_NAME}' does not exist.`);
      process.exitCode = 1;
      return;
    }

    await connection.query(`USE \`${DB_NAME}\``);

    const expectedTables = readExpectedTables();
    const [existingRows] = await connection.query("SHOW TABLES");
    const key = `Tables_in_${DB_NAME}`;
    const existingTables = new Set(existingRows.map((row) => row[key]));

    const missingTables = expectedTables.filter((tableName) => !existingTables.has(tableName));

    console.log(`[info] Database: ${DB_NAME}`);
    console.log(`[info] Tables found: ${existingTables.size}`);
    console.log(`[info] Tables expected by schema: ${expectedTables.length}`);

    if (missingTables.length > 0) {
      console.log("[warn] Missing tables:");
      for (const tableName of missingTables) {
        console.log(`  - ${tableName}`);
      }
      process.exitCode = 1;
      return;
    }

    const missingColumns = [];
    for (const [tableName, columns] of Object.entries(REQUIRED_COLUMNS)) {
      for (const columnName of columns) {
        const [columnRows] = await connection.query(
          `SELECT COUNT(*) AS count
           FROM information_schema.columns
           WHERE table_schema = ?
             AND table_name = ?
             AND column_name = ?`,
          [DB_NAME, tableName, columnName],
        );

        if (columnRows[0].count === 0) {
          missingColumns.push(`${tableName}.${columnName}`);
        }
      }
    }

    if (missingColumns.length > 0) {
      console.log("[warn] Missing required columns:");
      for (const columnRef of missingColumns) {
        console.log(`  - ${columnRef}`);
      }
      process.exitCode = 1;
      return;
    }

    const [roleColumn] = await connection.query(
      `SELECT COLUMN_TYPE
       FROM information_schema.columns
       WHERE table_schema = ?
         AND table_name = 'users'
         AND column_name = 'role'
       LIMIT 1`,
      [DB_NAME],
    );
    const roleType = String(roleColumn?.[0]?.COLUMN_TYPE || "").toLowerCase();
    if (!roleType.includes("'pation'") || !roleType.includes("'secretaire'")) {
      console.log("[warn] users.role enum must include both 'pation' and 'secretaire'");
      process.exitCode = 1;
      return;
    }

    console.log("[ok] All schema tables and required columns are present.");
    process.exitCode = 0;
  } catch (error) {
    console.log("[error] Schema check failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

checkSchema();
