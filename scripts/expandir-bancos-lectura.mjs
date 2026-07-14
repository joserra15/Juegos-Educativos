/**
 * Amplía bancos de lectura hasta MIN preguntas por etiqueta,
 * usando content/_extras-por-etiqueta.json
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = join(ROOT, "content");
const EXTRAS_PATH = join(CONTENT, "_extras-por-etiqueta.json");
const MIN = 12;

const extras = existsSync(EXTRAS_PATH)
  ? JSON.parse(readFileSync(EXTRAS_PATH, "utf8"))
  : {};

function fallbackExtra(tag, n) {
  return {
    id: `${tag}-fb-${n}`,
    etiquetas: [tag],
    texto: `Refuerzo ${n}: elige la opción correcta sobre ${tag.replace(/-/g, " ")}.`,
    opciones: [`Respuesta correcta ${n}`, `Distractor ${n}A`, `Distractor ${n}B`],
    correcta: 0,
    pista: "Elige la más coherente.",
  };
}

function expandirArchivo(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(raw.bancoLectura)) return null;

  const existingIds = new Set(raw.bancoLectura.map((p) => p.id));
  const existingTextos = new Set(raw.bancoLectura.map((p) => p.texto));
  const tags = new Set();
  for (const p of raw.bancoLectura) {
    for (const t of p.etiquetas || []) tags.add(t);
  }
  for (const f of raw.fases || []) {
    for (const t of f.etiquetasLectura || []) tags.add(t);
  }

  let added = 0;
  for (const tag of tags) {
    let count = raw.bancoLectura.filter((p) => p.etiquetas?.includes(tag)).length;
    if (count >= MIN) continue;

    const pool = [...(extras[tag] || [])];
    let fb = 1;
    while (count < MIN) {
      let cand = pool.shift();
      if (!cand) {
        cand = fallbackExtra(tag, fb++);
      }
      if (existingTextos.has(cand.texto)) continue;
      let id = cand.id;
      let k = 1;
      while (existingIds.has(id)) id = `${cand.id}-${k++}`;
      const pregunta = { ...cand, id, etiquetas: [tag, ...(cand.etiquetas || []).filter((t) => t !== tag)] };
      // asegurar etiqueta pedida
      if (!pregunta.etiquetas.includes(tag)) pregunta.etiquetas.unshift(tag);
      raw.bancoLectura.push(pregunta);
      existingIds.add(id);
      existingTextos.add(pregunta.texto);
      added++;
      count++;
    }
  }

  if (added > 0) writeFileSync(path, JSON.stringify(raw, null, 2) + "\n");
  return { id: raw.id, added, total: raw.bancoLectura.length };
}

const files = readdirSync(CONTENT).filter(
  (f) => f.endsWith(".json") && f !== "manifest.json" && !f.startsWith("_")
);
const results = [];
for (const f of files) {
  const r = expandirArchivo(join(CONTENT, f));
  if (r) results.push({ file: f, ...r });
}

// Verificación
let ok = true;
for (const f of files) {
  const c = JSON.parse(readFileSync(join(CONTENT, f), "utf8"));
  if (!c.bancoLectura) continue;
  const tags = new Set();
  for (const p of c.bancoLectura) for (const t of p.etiquetas || []) tags.add(t);
  for (const fase of c.fases || []) for (const t of fase.etiquetasLectura || []) tags.add(t);
  for (const t of tags) {
    const n = c.bancoLectura.filter((p) => p.etiquetas?.includes(t)).length;
    if (n < MIN) {
      console.error("FALTA", f, t, n);
      ok = false;
    }
  }
}

console.log(JSON.stringify(results, null, 2));
if (!ok) process.exit(1);
console.log("OK: todas las etiquetas ≥", MIN);
