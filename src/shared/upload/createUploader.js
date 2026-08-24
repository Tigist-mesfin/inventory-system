// src/shared/upload/createUploader.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

function decodeOriginalName(originalname) {
  try {
    return Buffer.from(originalname, "latin1").toString("utf8");
  } catch {
    return originalname;
  }
}

// Keep the original name recognizable: strip path separators and unsafe
// characters instead of replacing the whole name with a random id.
function uniqueSafeFilename(originalname) {
  const decoded = decodeOriginalName(originalname || "");
  const ext = path.extname(decoded).toLowerCase().replace(/[^\w.]/g, "");
  const base = path
    .basename(decoded, path.extname(decoded))
    .replace(/[^\w.-]+/g, "")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 80);

  return `${base || "file"}-${Date.now()}${ext}`;
}

module.exports = function createUploader({
  destination,
  allowedMimeTypes,
  maxSize = 5 * 1024 * 1024,
  filename,
}) {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      const folder = path.join(UPLOAD_ROOT, destination);
      fs.mkdirSync(folder, { recursive: true });
      cb(null, folder);
    },

    filename(req, file, cb) {
      if (filename) {
        return cb(null, filename(req, file));
      }
      cb(null, uniqueSafeFilename(file.originalname));
    },
  });

  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter(req, file, cb) {
      if (allowedMimeTypes && !allowedMimeTypes.includes(file.mimetype)) {
        return cb(new Error(`Only ${allowedMimeTypes.join(", ")} are allowed`));
      }
      cb(null, true);
    },
  });
};
