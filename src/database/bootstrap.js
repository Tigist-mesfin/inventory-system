// src/database/bootstrap.js
const mysql = require("mysql2/promise");
const env = require("../config/env");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Create DB if not exists
 */
const bootstrapDatabase = async (maxRetries = 5, delayMs = 2000) => {
  let connection;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      connection = await mysql.createConnection({
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
      });

      await connection.query(`
        CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\`
        CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci;
      `);

      console.log(`🗄️ Database ensured: ${env.DB_NAME}`);
      return;
    } catch (err) {
      console.log(
        `⏳ DB bootstrap attempt ${attempt}/${maxRetries} failed: ${err.message}`,
      );

      if (attempt === maxRetries) {
        throw new Error("❌ Failed to bootstrap database after retries");
      }

      await sleep(delayMs);
    } finally {
      if (connection) {
        await connection.end().catch(() => {});
      }
    }
  }
};

module.exports = bootstrapDatabase;
