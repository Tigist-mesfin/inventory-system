// src/shared/upload/verifyImageFile.helper.js
//
// Multer's fileFilter (createUploader.js) only sees the client-supplied
// filename/mimetype — the file is still streaming at that point, so there's
// nothing to sniff yet. A request with Content-Type: image/png and arbitrary
// bytes sails through fileFilter unchecked. This runs *after* multer has
// written the file to disk, checking its real magic bytes against the
// formats createUploader.js's mimeTypes.js IMAGES list actually allows
// (jpeg/jpg/png/webp) — so a mislabeled file gets caught before it's ever
// referenced by a DB row or served back out under /uploads.
const fs = require("fs");

const startsWith = (buffer, bytes) => bytes.every((byte, i) => buffer[i] === byte);

const isJpeg = (buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]);
const isPng = (buffer) =>
  startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isWebp = (buffer) =>
  buffer.slice(0, 4).toString("ascii") === "RIFF" &&
  buffer.slice(8, 12).toString("ascii") === "WEBP";

exports.isValidImageFile = (filePath) => {
  const buffer = Buffer.alloc(12);
  const fd = fs.openSync(filePath, "r");
  try {
    fs.readSync(fd, buffer, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }
  return isJpeg(buffer) || isPng(buffer) || isWebp(buffer);
};
