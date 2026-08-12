import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function replaceOrThrow(text, pattern, replacement, label) {
  if (!pattern.test(text)) {
    throw new Error(`No se pudo localizar ${label}`);
  }
  const updated = text.replace(pattern, replacement);
  return updated;
}

const { appVersion } = readJson(join(ROOT, "version.json"));
if (!appVersion || typeof appVersion !== "string") {
  throw new Error("version.json debe incluir appVersion como string");
}

const packageJsonPath = join(ROOT, "package.json");
const packageJson = readJson(packageJsonPath);
packageJson.version = appVersion;
writeJson(packageJsonPath, packageJson);

const packageLockPath = join(ROOT, "package-lock.json");
const packageLock = readJson(packageLockPath);
packageLock.version = appVersion;
if (packageLock.packages?.[""]) {
  packageLock.packages[""].version = appVersion;
}
writeJson(packageLockPath, packageLock);

const contentManifestPath = join(ROOT, "content", "manifest.json");
const contentManifest = readJson(contentManifestPath);
contentManifest.version = appVersion;
writeJson(contentManifestPath, contentManifest);

const indexPath = join(ROOT, "index.html");
let indexHtml = readFileSync(indexPath, "utf8");
indexHtml = replaceOrThrow(
  indexHtml,
  /(<meta name="app-version" content=")([^"]+)(")/,
  (_match, start, _current, end) => `${start}${appVersion}${end}`,
  "meta app-version de index.html"
);
writeFileSync(indexPath, indexHtml, "utf8");

const readmePath = join(ROOT, "README.md");
let readme = readFileSync(readmePath, "utf8");
readme = replaceOrThrow(
  readme,
  /(## Mundos disponibles \(v)([^)]+)(\))/,
  (_match, start, _current, end) => `${start}${appVersion}${end}`,
  "versión de README.md"
);
writeFileSync(readmePath, readme, "utf8");

console.log(`Versión sincronizada a ${appVersion}`);
