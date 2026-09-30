import { existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "out");
const zipPath = join(root, "nigdstock-website-cpanel.zip");

if (!existsSync(outDir)) {
  console.error("Missing out/. Run `npm run build` first.");
  process.exit(1);
}

if (!existsSync(join(outDir, "index.html"))) {
  console.error("out/index.html missing. Build looks incomplete.");
  process.exit(1);
}

if (!existsSync(join(outDir, "site-assets"))) {
  console.error(
    "out/site-assets missing. Run `npm run build` (postbuild renames _next → site-assets for cPanel).",
  );
  process.exit(1);
}

if (existsSync(join(outDir, "_next"))) {
  console.warn(
    "Warning: out/_next still exists. CSS may break on cPanel. Re-run build.",
  );
}

if (!existsSync(join(outDir, ".htaccess"))) {
  console.warn(
    "Warning: out/.htaccess missing. public/.htaccess should copy on build.",
  );
}

if (existsSync(zipPath)) {
  rmSync(zipPath, { force: true });
}

// Use tar (Windows 10+ / macOS / Linux). Avoid PowerShell Compress-Archive —
// it stores backslash paths that break folder structure on cPanel/Linux unzip.
const result = spawnSync(
  "tar",
  ["-a", "-c", "-f", zipPath, "-C", outDir, "."],
  { stdio: "inherit", shell: false },
);

if (result.status !== 0) {
  console.error("Failed to create zip with tar. Is tar available?");
  process.exit(result.status ?? 1);
}

console.log(`Created ${zipPath}`);
console.log("Upload this zip to cPanel File Manager → Extract into public_html.");
console.log("After extract you MUST see a site-assets folder next to index.html.");
console.log("See CPANEL-DEPLOY.md for full steps.");
