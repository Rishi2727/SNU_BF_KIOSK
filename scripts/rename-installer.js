import { readFileSync, readdirSync, renameSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf8"));

const { version, releaseDate } = pkg;
if (!version || !releaseDate) {
  console.error('Missing "version" or "releaseDate" in package.json');
  process.exit(1);
}

const bundleDir = join(__dirname, "../src-tauri/target/release/bundle");
const nsisDir = join(bundleDir, "nsis");
const msiDir = join(bundleDir, "msi");

let renamed = 0;

function renameInDir(dir, matchFn, renameFn) {
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir)) {
    if (matchFn(file)) {
      const newName = renameFn(file);
      renameSync(join(dir, file), join(dir, newName));
      console.log(`✓ Renamed: ${file}`);
      console.log(`       → ${newName}`);
      renamed++;
    }
  }
}

// NSIS: CNU BF KIOSK_2.1.0_x64-setup.exe → CNU BF KIOSK_2.1.0_2026-03-11_x64-setup.exe
renameInDir(
  nsisDir,
  (f) => f.endsWith("-setup.exe") && f.includes(`_${version}_`) && !f.includes(releaseDate),
  (f) => f.replace(`_${version}_`, `_${version}_${releaseDate}_`)
);

// MSI: CNU BF KIOSK_2.1.0_x64_en-US.msi → CNU BF KIOSK_2.1.0_2026-03-11_x64_en-US.msi
renameInDir(
  msiDir,
  (f) => f.endsWith(".msi") && f.includes(`_${version}_`) && !f.includes(releaseDate),
  (f) => f.replace(`_${version}_`, `_${version}_${releaseDate}_`)
);

if (renamed === 0) {
  console.log("No installer files found to rename (already renamed or not built yet).");
}
