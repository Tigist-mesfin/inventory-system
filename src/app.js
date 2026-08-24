// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
const AppError = require("./shared/errors/AppError");
const env = require("./config/env");
const { sequelize } = require("./database");
const packageJson = require("../package.json");

const modules = require("./modules");
const errorHandler = require("./shared/middlewares/error.middleware");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim());
if (env.NODE_ENV === "production" && allowedOrigins.includes("*")) {
  console.error(
    "❌ ALLOWED_ORIGINS must be an explicit origin list in production — cookie-based auth cannot use credentials with a wildcard origin.",
  );
  process.exit(1);
}
app.use(
  cors({
    origin: allowedOrigins.includes("*") ? "*" : allowedOrigins,
    credentials: true,
  }),
);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running 🚀",
    app: packageJson.name,
    version: packageJson.version,
    node: process.version,
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", modules);

app.get("/health", async (req, res) => {
  try {
    await sequelize.query("SELECT 1");

    res.status(200).json({
      status: "OK",
      server: "running",
      db: "connected",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Health check failed:", err.message);

    res.status(503).json({
      status: "ERROR",
      server: "running",
      db: "disconnected",
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

app.use((req, res, next) => {
  next(AppError.notFound(`Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

module.exports = app;
