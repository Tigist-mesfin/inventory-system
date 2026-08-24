// src/database/connection.js
const sequelize = require("../config/db");
const bootstrapDatabase = require("./bootstrap");

/**
 * Main DB initializer
 */
const connectDB = async () => {
  try {
    // 1. Ensure DB exists
    await bootstrapDatabase();

    // 2. Authenticate Sequelize
    await sequelize.authenticate();

    console.log("✅ MySQL connected successfully");

    return sequelize;
  } catch (err) {
    console.error("❌ DB connection failed:");
    console.error(err.message);

    process.exit(1);
  }
};

module.exports = connectDB;
