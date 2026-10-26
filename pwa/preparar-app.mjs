// Deja la web compilada (carpeta dist) lista para instalarse como app:
// copia el manifiesto, el service worker y los iconos, y añade sus etiquetas a dist/index.html.
// Lo ejecuta GitHub Actions justo después de compilar (ver .github/workflows/publicar-app.yml).
// Así no hace falta tocar index.html: aunque la app se vuelva a subir desde AI Studio, sigue siendo instalable.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PWA = dirname(fileURLToPath(import.meta.url));
const DIST = process.argv[2] || "dist";
const TITULO = "PORTABLE green H2FP · Gemelo digital";
const DESCRIPCION = "Gemelo digital educativo de una electrolizadora y estación de carga de hidrógeno (GreenH2FP).";
const COLOR = "#020617";
const VERSION = (process.env.GITHUB_SHA || "local").slice(0, 7) + "-" + Date.now().toString(36);

const indice = join(DIST, "index.html");
if (!existsSync(indice)) {
  console.error("No encuentro " + indice + ". ¿Se ha compilado la app?");
  process.exit(1);
}

let html = readFileSync(indice, "utf8");

// 1 · Manifiesto, iconos y service worker (que guarda desde el principio el JS y el CSS principales)
copyFileSync(join(PWA, "manifest.webmanifest"), join(DIST, "manifest.webmanifest"));
mkdirSync(join(DIST, "iconos"), { recursive: true });
for (const f of readdirSync(PWA)) if (f.endsWith(".png")) copyFileSync(join(PWA, f), join(DIST, "iconos", f));
const compilados = [...new Set([...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => m[1]))];
const sw = readFileSync(join(PWA, "sw.js"), "utf8")
  .replace("__VERSION__", VERSION)
  .replace("const COMPILADOS = [];", "const COMPILADOS = " + JSON.stringify(compilados) + ";");
writeFileSync(join(DIST, "sw.js"), sw);

// 2 · Etiquetas en index.html

const cabecera = [
  '<link rel="manifest" href="manifest.webmanifest" />',
  '<meta name="theme-color" content="' + COLOR + '" />',
  '<link rel="icon" type="image/png" sizes="32x32" href="iconos/icono-32.png" />',
  '<link rel="icon" type="image/png" sizes="192x192" href="iconos/icono-192.png" />',
  '<link rel="apple-touch-icon" href="iconos/icono-apple-180.png" />',
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-title" content="Green H2FP" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black" />',
];
if (!/<meta\s+name="description"/i.test(html)) cabecera.push('<meta name="description" content="' + DESCRIPCION + '" />');

const registro = [
  "<script>",
  '  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {',
  '    addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });',
  "  }",
  "</script>",
];

if (!/rel="manifest"/i.test(html)) html = html.replace(/\s*<\/head>/i, "\n" + cabecera.map((l) => "    " + l).join("\n") + "\n  </head>");
if (!/serviceWorker/.test(html)) html = html.replace(/\s*<\/body>/i, "\n" + registro.map((l) => "    " + l).join("\n") + "\n  </body>");

// Título y su idioma: solo si siguen los que pone AI Studio por defecto
html = html.replace(/<title>\s*(My Google AI Studio App)?\s*<\/title>/i, "<title>" + TITULO + "</title>");
html = html.replace('<html lang="en">', '<html lang="es">');

writeFileSync(indice, html);
console.log("App instalable lista (versión " + VERSION + ")");
