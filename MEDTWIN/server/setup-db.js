import "dotenv/config";
import mysql from "mysql2/promise";
import fs from "node:fs/promises";
const database = process.env.MYSQL_DATABASE || "swasthyasetu";
if (!/^[A-Za-z0-9_]+$/.test(database))
  throw Error(
    "MYSQL_DATABASE may only contain letters, numbers and underscores.",
  );
const conn = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database,
  multipleStatements: true,
  ssl: process.env.MYSQL_SSL === "true" ? {} : undefined,
});
try {
  await conn.query(
    await fs.readFile(
      new URL("../database/schema.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log(
    `Schema ready in ${database}. Set STORAGE_MODE=mysql, then start the API. SEED_DEMO=true seeds only an empty database.`,
  );
} finally {
  await conn.end();
}
