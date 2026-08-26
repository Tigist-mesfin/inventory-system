require("dotenv").config();

const connectDB = require("../connection");
const seedAdmin = require("./seedAdmin");

(async () => {
  try {
    await connectDB();
    await seedAdmin();
    console.log("✅ Seed finished");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
})();
