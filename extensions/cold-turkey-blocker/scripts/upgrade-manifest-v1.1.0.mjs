import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "package.json");
if (!fs.existsSync(packagePath)) {
  console.error("package.json was not found. Run this script from the extension folder.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const existingAuthor = manifest.author;
manifest.version = "1.1.0";

for (const command of manifest.commands ?? []) {
  if (command.name === "manage-blocks") {
    command.description = "List typed blocks and verify start, stop, toggle, lock, edit, or break actions.";
  }
  if (command.name === "cli-diagnostics") {
    command.description = "Run safe, read-only CLI help, block-list, and sequential status diagnostics.";
  }
}

for (const preference of manifest.preferences ?? []) {
  if (preference.name === "confirmLockingActions" && !preference.description) {
    preference.description =
      "Ask for confirmation before commands that may lock a block or immediately activate a device block.";
  }
}

manifest.author = existingAuthor;
fs.writeFileSync(packagePath, `${JSON.stringify(manifest, null, 2)}\n`);

const lockPath = path.join(root, "package-lock.json");
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
  lock.version = "1.1.0";
  if (lock.packages?.[""]) lock.packages[""].version = "1.1.0";
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

console.log(`Updated to 1.1.0 and preserved author: ${existingAuthor ?? "(not set)"}`);
