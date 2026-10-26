// Service worker de Green H2FP.
// Permite instalar la app y, tras abrirla una vez con internet, abrirla también sin conexión.
// Con internet siempre va primero a la red, así que se ve siempre la última versión publicada.
const VERSION = "__VERSION__"; // lo rellena pwa/preparar-app.mjs en cada publicación
const CACHE = "green-h2fp-" + VERSION;
const ESENCIALES = ["./", "manifest.webmanifest", "iconos/icono-192.png", "iconos/icono-512.png"];
const COMPILADOS = []; // lo rellena pwa/preparar-app.mjs con el JS y el CSS principales de la app

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESENCIALES.concat(COMPILADOS))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith("green-h2fp-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const pet = e.request;
  if (pet.method !== "GET" || !pet.url.startsWith("http")) return;
  if (pet.cache === "only-if-cached" && pet.mode !== "same-origin") return;
  const url = new URL(pet.url);

  // Ficheros compilados (llevan una huella en el nombre y nunca cambian): primero lo guardado.
  if (url.origin === self.location.origin && url.pathname.includes("/assets/")) {
    e.respondWith(caches.match(pet).then((r) => r || descargarYGuardar(pet)));
    return;
  }

  // Todo lo demás (la página, modelos 3D, logos, fuentes): primero la red; sin red, lo guardado.
  e.respondWith(
    descargarYGuardar(pet).catch((error) =>
      caches.match(pet).then((r) => r || (pet.mode === "navigate" ? caches.match("./") : null)).then((r) => {
        if (r) return r;
        throw error;
      })
    )
  );
});

function descargarYGuardar(pet) {
  return fetch(pet).then((resp) => {
    if (resp.status === 200 || resp.type === "opaque") {
      const copia = resp.clone();
      caches.open(CACHE).then((c) => c.put(pet, copia)).catch(() => {});
    }
    return resp;
  });
}
