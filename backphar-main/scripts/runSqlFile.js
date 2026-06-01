import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const relativePath = process.argv[2];

if (!relativePath) {
  console.error("[error] Missing SQL file path. Example: node scripts/runSqlFile.js sql/tunisia_sousse_seed.sql");
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), relativePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`[error] SQL file not found: ${absolutePath}`);
  process.exit(1);
}

const run = async () => {
  let connection;

  try {
    const dbName = process.env.DB_NAME || "application_medicale";
    const sql = fs.readFileSync(absolutePath, "utf8").replace(/^\uFEFF/, "");

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      port: Number(process.env.DB_PORT) || 3306,
      multipleStatements: true,
    });

    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.query(`USE \`${dbName}\``);
    await connection.query(sql);
    console.log(`[ok] SQL file executed successfully: ${relativePath}`);
  } catch (error) {
    console.error("[error] SQL execution failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

run();
