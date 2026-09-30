/**
 * cPanel / Apache often block or hide folders that start with "_"
 * (Next.js exports CSS/JS into `/_next/`). Rename to `/assets/` and
 * rewrite all references inside the static export.
 */
import {
  existsSync,
  renameSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out");
const fromDir = join(outDir, "_next");
const toDir = join(outDir, "site-assets");
const fromPrefix = "/_next/";
const toPrefix = "/site-assets/";

const TEXT_EXTS = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".txt",
  ".xml",
  ".webmanifest",
  ".map",
  ".svg",
]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

if (!existsSync(outDir)) {
  console.error("Missing out/. Run `npm run build` first.");
  process.exit(1);
}

if (!existsSync(fromDir)) {
  if (existsSync(toDir)) {
    console.log("Already fixed: out/site-assets exists.");
    process.exit(0);
  }
  console.error("Missing out/_next. Build looks incomplete.");
  process.exit(1);
}

if (existsSync(toDir)) {
  console.error("out/site-assets already exists. Delete out/ and rebuild.");
  process.exit(1);
}

renameSync(fromDir, toDir);
console.log("Renamed out/_next → out/site-assets");

let changed = 0;
for (const file of walk(outDir)) {
  if (!TEXT_EXTS.has(extname(file).toLowerCase())) continue;
  const before = readFileSync(file, "utf8");
  if (!before.includes(fromPrefix) && !before.includes("/_next")) continue;
  const after = before
    .split(fromPrefix)
    .join(toPrefix)
    .split("/_next")
    .join("/assets");
  if (after !== before) {
    writeFileSync(file, after, "utf8");
    changed += 1;
  }
}

console.log(`Updated ${changed} file(s) to use /site-assets/ instead of /_next/`);
console.log("cPanel hosts that block underscore folders will now load CSS.");
