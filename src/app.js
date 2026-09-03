// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const fs = require("fs");
const path = require("path");
const AppError = require("./shared/errors/AppError");
const env = require("./config/env");
const { sequelize } = require("./database");
const packageJson = require("../package.json");

const modules = require("./modules");
const errorHandler = require("./shared/middlewares/error.middleware");

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apache/LiteSpeed on cPanel often drops Authorization; mobile sends X-Access-Token too.
app.use((req, _res, next) => {
  if (!req.headers.authorization && req.headers["x-access-token"]) {
    const token = String(req.headers["x-access-token"]).trim();
    if (token) req.headers.authorization = `Bearer ${token}`;
  }
  next();
});

const allowedOrigins = env.ALLOWED_ORIGINS.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (env.FRONTEND_URL && !allowedOrigins.includes(env.FRONTEND_URL)) {
  allowedOrigins.push(env.FRONTEND_URL);
}
if (env.NODE_ENV === "production" && allowedOrigins.includes("*")) {
  console.warn(
    "ALLOWED_ORIGINS is * in production. Set it to your frontend origin(s) if cookies fail.",
  );
}

const originHostname = (value) => {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
};

const isDevLoopbackOrigin = (origin) => {
  if (env.NODE_ENV === "production") return false;
  const hostname = originHostname(origin);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
};

const isSameSiteFamily = (origin) => {
  const host = originHostname(origin);
  const apiHost =
    originHostname(env.APP_URL || "") || originHostname(env.FRONTEND_URL || "");
  if (!host || !apiHost) return false;
  const root = apiHost.split(".").slice(-2).join(".");
  if (!root || !root.includes(".")) return host === apiHost;
  return host === apiHost || host.endsWith(`.${root}`) || apiHost.endsWith(`.${root}`);
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(origin) ||
        isDevLoopbackOrigin(origin) ||
        isSameSiteFamily(origin)
      ) {
        return callback(null, origin);
      }
      return callback(AppError.forbidden("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);
app.use(morgan("dev"));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const clientDist = path.join(process.cwd(), "client", "dist");
const clientIndex = path.join(clientDist, "index.html");
const hasClientBuild = fs.existsSync(clientIndex);

app.get("/", (req, res, next) => {
  if (hasClientBuild) return next();
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
      appName: env.APP_NAME,
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

if (hasClientBuild) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (
      req.path.startsWith("/api") ||
      req.path.startsWith("/uploads") ||
      req.path === "/health"
    ) {
      return next();
    }
    res.sendFile(clientIndex, (err) => {
      if (err) next(err);
    });
  });
}

app.use((req, res, next) => {
  next(AppError.notFound(`Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

module.exports = app;
