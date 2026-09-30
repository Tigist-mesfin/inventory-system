// src/shared/upload/fileCleanup.helper.js
const fs = require("fs");
const path = require("path");

const deleteUploadedFile = (relativePath) => {
  if (!relativePath || typeof relativePath !== "string") return;

  const absolutePath = path.join(process.cwd(), relativePath.replace(/^\//, ""));

  fs.unlink(absolutePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error(`Failed to delete file ${absolutePath}:`, err.message);
    }
  });
};

const deleteUploadedFiles = (relativePaths) => {
  if (!Array.isArray(relativePaths)) return;
  relativePaths.forEach(deleteUploadedFile);
};

const deleteFileByAbsolutePath = (absolutePath) => {
  if (!absolutePath) return;
  fs.unlink(absolutePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.error(`Failed to delete file ${absolutePath}:`, err.message);
    }
  });
};

// Deletes any files multer already wrote to disk for this request (used to
// roll back orphaned uploads when the create/update request fails downstream).
const deleteReqFiles = (req) => {
  if (req.file) deleteFileByAbsolutePath(req.file.path);

  if (Array.isArray(req.files)) {
    req.files.forEach((file) => deleteFileByAbsolutePath(file.path));
  } else if (req.files && typeof req.files === "object") {
    Object.values(req.files)
      .flat()
      .forEach((file) => deleteFileByAbsolutePath(file.path));
  }
};

module.exports = {
  deleteUploadedFile,
  deleteUploadedFiles,
  deleteReqFiles,
  deleteFileByAbsolutePath,
};
