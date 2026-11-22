/* Public snapshots only; no session, weather, payment or account caching. */
(async function () {
  function read() { try { const data = JSON.parse(localStorage.getItem("ra-favorites-v1") || "[]"); return Array.isArray(data) ? data.filter(f => f && f.port && typeof f.port.id === "string") : []; } catch { return []; } }
  const favorites = read();
  const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const details = (p) => `<h2>${escape(p.name)}</h2><p>${escape(p.town)}</p><p>Fondale ${escape(p.depth)} m · massimo ${escape(p.maxLength)} × ${escape(p.maxBeam)} m</p><p>€${escape(p.rateLow)}–${escape(p.rateHigh)}/notte per 12 m</p><p>Servizi: ${escape((p.services || []).join(" · "))}</p><p>Disponibilità salvata: ${escape(p.availability)} · VHF ${escape(p.vhf)}</p><div class="actions"><a class="action" href="tel:${escape(String(p.phone || "").replace(/[^+\d]/g, ""))}">Chiama</a><a class="action" href="mailto:${escape(p.email)}">Email</a></div><p class="note">Copia non aggiornata · dati da verificare</p>`;
  const open = (p) => { document.getElementById("detail-body").innerHTML = details(p); document.getElementById("detail").showModal(); };
  document.getElementById("close").onclick = () => document.getElementById("detail").close();
  const list = document.getElementById("favorites");
  if (!favorites.length) list.textContent = "Nessun porto salvato su questo dispositivo.";
  favorites.forEach(f => {
    const article = document.createElement("article");
    const photo = String(f.photo || "");
    const safePhoto = photo.startsWith("/assets/") ? `<img src="${escape(photo)}" alt="${escape(f.port.name)}" loading="lazy">` : "";
    article.innerHTML = safePhoto + `<div class="content">${details(f.port)}<p class="note">Salvato il ${escape(new Date(f.savedAt).toLocaleDateString("it-IT"))}</p></div>`;
    list.append(article);
  });
  let view = { lat:45.3, lon:13.1, zoom:8 };
  try { const stored = JSON.parse(localStorage.getItem("ra-map-view-v1") || "null"); if (stored && [stored.lat, stored.lon, stored.zoom].every(Number.isFinite)) view = stored; } catch {}
  if (!window.L) return;
  const map = L.map("map", { zoomControl: true, preferCanvas:true }).setView([view.lat, view.lon], Math.min(18, Math.max(3, view.zoom)));
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom:18, attribution:"© OpenStreetMap contributors" }).addTo(map);
  const sea = L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", { maxZoom:18, attribution:"© OpenSeaMap" }).addTo(map);
  L.control.layers({}, { OpenSeaMap: sea }).addTo(map);
  let ports = [];
  try { ports = await fetch("/offline/ports.json").then(r => r.json()); } catch {}
  for (const p of Array.isArray(ports) ? ports : []) {
    const snapshot = favorites.find(f => f.port.id === p.id)?.port || p;
    L.marker([p.lat,p.lon], { title:p.name, icon:L.divIcon({className:"",html:`<div class="pin">${favorites.some(f=>f.port.id===p.id)?"♥":"P"}</div>`,iconSize:[32,32]}) }).addTo(map).on("click", () => open(snapshot));
  }
})();