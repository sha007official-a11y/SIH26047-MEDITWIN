import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";
import { seed } from "./seed.js";
export const dataDir = path.resolve(process.env.DATA_DIR || "data");
export const mode = process.env.STORAGE_MODE || "demo";
const maps = {
  users: "users",
  patients: "patients",
  doctors: "doctors",
  assessments: "health_assessments",
  timeline: "health_timeline",
  documents: "documents",
  medications: "medications",
  appointments: "appointments",
  ayush: "ayush_profiles",
  notes: "doctor_notes",
  consultations: "consultations",
};
let state,
  pool,
  queue = Promise.resolve();
export async function initStore() {
  await fs.mkdir(dataDir, { recursive: true });
  if (mode === "mysql") {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE || "swasthyasetu",
      connectionLimit: 5,
      ssl: process.env.MYSQL_SSL === "true" ? {} : undefined,
    });
    state = {};
    for (const [key, table] of Object.entries(maps)) {
      const [rows] = await pool.query(`SELECT data FROM ${table}`);
      state[key] = rows.map((r) =>
        typeof r.data === "string" ? JSON.parse(r.data) : r.data,
      );
    }
    if (!state.users.length && process.env.SEED_DEMO === "true") {
      state = await seed();
      await persist(state);
    }
  } else if (mode === "demo") {
    try {
      state = JSON.parse(
        await fs.readFile(path.join(dataDir, "demo.json"), "utf8"),
      );
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      state = await seed();
      await persist(state);
    }
  } else throw new Error("STORAGE_MODE must be demo or mysql");
}
function rowFields(key, r) {
  let cols = ["id", "data"],
    values = [r.id, JSON.stringify(r)];
  if (key === "users") {
    cols.push("email", "mobile", "role", "password_hash");
    values.push(r.email, r.mobile || null, r.role, r.passwordHash);
  }
  if (["patients", "doctors"].includes(key)) {
    cols.push("user_id");
    values.push(r.userId);
  }
  if (!["users", "patients", "doctors"].includes(key)) {
    cols.push("patient_id");
    values.push(r.patientId);
  }
  return { cols, values };
}
async function persist(next) {
  if (pool) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const [key, table] of Object.entries(maps)) {
        for (const r of next[key]) {
          const { cols, values } = rowFields(key, r);
          await conn.execute(
            `INSERT INTO ${table} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")}) ON DUPLICATE KEY UPDATE ${cols
              .slice(1)
              .map((c) => `${c}=VALUES(${c})`)
              .join(",")}`,
            values,
          );
        }
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } else {
    const tmp = path.join(dataDir, "demo.json.tmp");
    await fs.writeFile(tmp, JSON.stringify(next, null, 2));
    await fs.rename(tmp, path.join(dataDir, "demo.json"));
  }
}
export const read = () => structuredClone(state);
export function mutate(fn) {
  const run = queue.then(async () => {
    const next = structuredClone(state);
    const result = await fn(next);
    await persist(next);
    state = next;
    return result;
  });
  queue = run.catch(() => {});
  return run;
}
export async function closeStore() {
  await queue;
  if (pool) await pool.end();
}
