// Service worker do app instalado no celular.
// - Tela: sempre tenta a versão nova da internet; sem sinal, abre a última que funcionou.
// - Arquivos do site (/assets/..., com hash no nome): guardados depois da 1ª vez, abrem na hora.
// - Chamadas à API (outro domínio) passam direto: agenda e horários nunca vêm de cache.
const CACHE = "barbearia-app-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put("/", copia));
          return r;
        })
        .catch(() => caches.match("/").then((r) => r || new Response(
          "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><body style='font-family:sans-serif;background:#0b0a09;color:#f4efe6;display:grid;place-items:center;height:100vh;text-align:center'><div><h2>Sem internet</h2><p>Conecte-se e tente de novo.</p></div>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } })))
    );
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(req).then((achado) => achado || fetch(req).then((r) => {
        if (r.ok) {
          const copia = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return r;
      }))
    );
  }
});
