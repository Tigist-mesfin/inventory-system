/**
 * Mark all existing migration files as already applied without running them.
 *
 * Use when the DB was created/updated via Sequelize model.sync() (or an older
 * process) so SequelizeMeta is empty/behind, and `npm run migrate` fails with
 * duplicate table/index errors.
 *
 * Usage: node scripts/baseline-migrations.js
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

(async () => {
  const migDir = path.join(__dirname, "../src/database/migrations");
  const files = fs
    .readdirSync(migDir)
    .filter((f) => f.endsWith(".js"))
    .sort();

  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || undefined,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  await c.query(`
    CREATE TABLE IF NOT EXISTS SequelizeMeta (
      name VARCHAR(255) NOT NULL PRIMARY KEY
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [existing] = await c.query("SELECT name FROM SequelizeMeta");
  const have = new Set(existing.map((r) => r.name));
  let inserted = 0;
  for (const name of files) {
    if (have.has(name)) continue;
    await c.query("INSERT INTO SequelizeMeta (name) VALUES (?)", [name]);
    inserted += 1;
    console.log("baselined:", name);
  }

  console.log(`Done. Inserted ${inserted}, already present ${have.size}.`);
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
