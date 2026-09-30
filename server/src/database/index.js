// src/database/index.js
const sequelize = require("../config/db");
const connectDB = require("./connection");
const env = require("../config/env");
const models = require("./models");

const initDB = async () => {
  try {
    await connectDB();

    if (env.NODE_ENV === "development") {
      const modelEntries = Object.entries(sequelize.models);
      const total = modelEntries.length;

      await sequelize.query("SET FOREIGN_KEY_CHECKS=0");
      for (const [index, [name, model]] of modelEntries.entries()) {
        await model.sync({ alter: false });
        console.log(`✅ ${index + 1}/${total} ${name}`);
      }
      await sequelize.query("SET FOREIGN_KEY_CHECKS=1");

      console.log(
        `\n🌟━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🌟
          ✅ Database Sync Complete
          📦 Synced Tables : ${total}
          🚀 Status        : READY
🌟━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🌟\n`,
      );
    }

    console.log("🚀 Database ready");
  } catch (error) {
    console.error("❌ Database initialisation failed:", error);
    process.exit(1);
  }
};

module.exports = {
  sequelize,
  models,
  initDB,
};
