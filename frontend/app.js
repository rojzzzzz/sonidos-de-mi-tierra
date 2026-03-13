const API_BASE = "https://sonidos-de-mi-tierra.onrender.com/api";
console.log("APP.JS VERSION: 2026-03-03 vNIC");

function el(id){ return document.getElementById(id); }

function coverFallback(){
  const div = document.createElement("div");
  div.className = "cover cover--img";
  return div;
}

function namesOrND(items, key = "name"){
  if (!Array.isArray(items) || items.length === 0) return "N/D";
  const values = items.map(x => x?.[key]).filter(Boolean);
  return values.length ? values.join(", ") : "N/D";
}

async function fetchJSON(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function apiGet(path){
  return fetchJSON(`${API_BASE}${path}`);
}

function debounce(fn, wait){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// ---------- thumbs ----------
function pickThumb(songId){
  const thumbs = [
    "assets/thumbs/thumb1.jpg",
    "assets/thumbs/thumb2.jpeg",
    "assets/thumbs/thumb3.jpeg",
    "assets/thumbs/thumb4.jpg",
    "assets/thumbs/thumb5.jpg",
    "assets/thumbs/thumb6.jpeg",
    "assets/thumbs/thumb7.jpeg",
    "assets/thumbs/thumb8.jpeg",
    "assets/thumbs/marimba.jpeg"
  ];
  const n = thumbs.length;
  return thumbs[(Number(songId) || 0) % n];
}

// ---------- card renderer ----------

function buildCoverNode(song){
  if (song.cover_url){
    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = "";
    img.src = song.cover_url;
    img.onerror = () => img.replaceWith(coverFallback());
    return img;
  }

  const img = document.createElement("img");
  img.className = "thumb";
  img.alt = "";
  img.src = pickThumb(song.id);
  img.onerror = () => img.replaceWith(coverFallback());
  return img;
}

function songCardHTML(song){
  const cover = song.cover_url
    ? `<img alt="" class="thumb" src="${song.cover_url}">`
    : `<img alt="" class="thumb" src="${pickThumb(song.id)}" onerror="this.outerHTML=\`${coverFallback(song.title)}\`;">`;

  const genres = namesOrND(song.genres, "name");
  const regions = namesOrND(song.regions, "name");
  const artistName = song.artist?.name || song.artist_name || "N/D";

  const hasGenres = Array.isArray(song.genres) && song.genres.length > 0;
  const hasRegions = Array.isArray(song.regions) && song.regions.length > 0;

  const meta = (hasGenres || hasRegions)
    ? `${artistName} • ${song.year || "N/D"} • ${genres} • ${regions}`
    : `${artistName} • ${song.year || "N/D"}`;

  return `
    <a href="./song.html?id=${song.id}">
      ${cover}
      <div class="card-body">
        <div class="card-title">${song.title}</div>
        <div class="meta">${meta}</div>
      </div>
    </a>
  `;
}

// ---------- youtube helper ----------
function extractYouTubeId(url){
  if (!url) return null;
  const u = url.trim();
  const m1 = u.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (m1) return m1[1];
  const m2 = u.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (m2) return m2[1];
  return null;
}

// ===================================================
// INDEX / CATALOGO
// ===================================================
async function initCatalog(){
  const grid = el("songsGrid");
  const totalLbl = el("totalLbl");

  const [regions, tags, artists] = await Promise.all([
    fetchJSON(`${API_BASE}/regions`),
    fetchJSON(`${API_BASE}/tags`),
    fetchJSON(`${API_BASE}/artists`),
  ]);

  const regionSelect = el("region");
  const tagSelect = el("tag");
  const artistSelect = el("artist");

  // llenar selects
  regions.forEach(r => {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name;
    regionSelect.appendChild(opt);
  });

  tags.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    tagSelect.appendChild(opt);
  });

  artists.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.name;
    artistSelect.appendChild(opt);
  });

  async function load(){
    const params = new URLSearchParams();

    const qVal = el("q").value.trim();
    const yearVal = el("year").value.trim();
    const genreVal = el("genre").value.trim();

    if (qVal) params.set("q", qVal);
    if (yearVal) params.set("year", yearVal);
    if (regionSelect.value) params.set("region", regionSelect.value);
    if (tagSelect.value) params.set("tag_id", tagSelect.value);
    if (artistSelect.value) params.set("artist_id", artistSelect.value);
    if (genreVal) params.set("genre", genreVal);

    params.set("limit", "60");
    params.set("sort", "title");
    params.set("order", "asc");

    const data = await fetchJSON(`${API_BASE}/songs?${params.toString()}`);

    totalLbl.textContent = `${data.total} canciones encontradas`;
    grid.innerHTML = "";

    (data.items || []).forEach(song => {
      const card = document.createElement("div");
      card.className = "card";

      const coverNode = buildCoverNode(song);
      card.appendChild(coverNode);

      const body = document.createElement("div");
      body.className = "card-body";
      body.innerHTML = `
        <a class="card-title" href="./song.html?id=${song.id}">${song.title}</a>
        <div class="meta">${song.artist?.name || "N/D"} • ${song.year || "N/D"}</div>
      `;
      card.appendChild(body);

      grid.appendChild(card);
    });
  }

  ["q","year","genre"].forEach(id => el(id).addEventListener("input", debounce(load, 250)));
  [regionSelect, tagSelect, artistSelect].forEach(s => s.addEventListener("change", load));

  el("clearBtn").addEventListener("click", () => {
    el("q").value = "";
    el("year").value = "";
    el("genre").value = "";
    regionSelect.value = "";
    tagSelect.value = "";
    artistSelect.value = "";
    load();
  });

  await load();
}

// ===================================================
// SONG PAGE
// ===================================================
async function initSongPage(){
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) return;

  const song = await fetchJSON(`${API_BASE}/songs/${id}`);
  const genres = namesOrND(song.genres, "name");
  const regions = namesOrND(song.regions, "name");

  el("songTitle").textContent = song.title || "Canción";
  el("songMeta").textContent = `${song.artist?.name || "N/D"} • ${song.year || "N/D"} • ${genres} • ${regions}`;

  // tags
  const tagsWrap = el("songTags");
  if (tagsWrap){
    tagsWrap.innerHTML = "";
    (song.tags || []).forEach(t => {
      const span = document.createElement("span");
      span.className = "badge";
      span.textContent = t.name;
      tagsWrap.appendChild(span);
    });
  }

  // regiones (chips clickeables)
  const regWrap = el("songRegions");
  if (regWrap) {
    regWrap.innerHTML = "";
    (song.regions || []).forEach((r) => {
      const a = document.createElement("a");
      a.className = "badge";
      a.href = `./region.html?id=${encodeURIComponent(r.id)}`;
      a.textContent = r.name;
      regWrap.appendChild(a);
    });
  }

  // descripción
  const contextText = el("contextText");
  if (contextText){
    const description = (song.description || "").trim();
    if (description) {
      contextText.textContent = description;
      contextText.style.display = "";
    } else {
      contextText.style.display = "none";
    }
  }

  // artista
  if (song.artist?.id){
    const a = await fetchJSON(`${API_BASE}/artists/${song.artist.id}`);
    if (el("artistName")) el("artistName").textContent = a.name || "N/D";

    // compatibilidad: active_era vs era
    const eraEl = el("artistEra");
  if (eraEl){
  const era = a.active_era || a.era;
  if (era) { eraEl.textContent = era; eraEl.style.display=""; }
  else { eraEl.style.display="none"; }
}

    // compatibilidad: cultural_contributions vs cultural_contribuitions
    if (el("artistBio")) el("artistBio").textContent = a.bio || "";
    if (el("artistContrib")) el("artistContrib").textContent = a.cultural_contributions || a.cultural_contribuitions || "";

    const artistLink = el("artistLink");
    if (artistLink) artistLink.href = `./artist.html?id=${a.id}`;

    const img = el("artistPhoto");
    if (img){
      img.src = a.photo_url || "assets/ui/artist-default.png";
      img.alt = a.name || "Artista";
    }
  }

  // reproductor / link
  const url = (song.link || "").trim();
  const embed = el("embed");
  const link = el("audioLink");

  const ytId = extractYouTubeId(url);
  if (ytId){
    if (embed){
      embed.src = `https://www.youtube.com/embed/${ytId}`;
      embed.style.display = "";
    }
    if (link) link.style.display = "none";
  } else if (url){
    if (embed) embed.style.display = "none";
    if (link){
      link.href = url;
      link.textContent = "Abrir enlace";
      link.style.display = "inline-block";
    }
  } else {
    if (embed) embed.style.display = "none";
    if (link) link.style.display = "none";
  }

  // recomendaciones
  const rel = el("related");
  if (rel){
    rel.innerHTML = "";
    const rec = await fetchJSON(`${API_BASE}/songs/${song.id}/recommendations?limit=5`);
    (rec.items || []).forEach(x => {
      const li = document.createElement("li");
      const score = Number.isFinite(x.score) ? ` (${x.score.toFixed(2)})` : "";
      li.innerHTML = `<a href="./song.html?id=${x.id}">${x.title}</a> — ${x.artist_name || "N/D"}${score}`;
      rel.appendChild(li);
    });
  }
}

// ===================================================
// ARTIST PAGE
// ===================================================
async function initArtistPage(){
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  if (!id) return;

  const a = await fetchJSON(`${API_BASE}/artists/${id}`);
  const heroImg = el("artistHeroPhoto");

if (heroImg) {
  heroImg.src = a.photo_url || "assets/ui/artist-default.png";
  heroImg.alt = a.name;

  heroImg.onerror = () => {
    heroImg.src = "assets/ui/artist-default.png";
  };
}

  if (el("artistTitle")) el("artistTitle").textContent = a.name || "Artista";
  if (el("artistBio2")) el("artistBio2").textContent = a.bio || "";
  if (el("artistContrib2")) el("artistContrib2").textContent = a.cultural_contributions || a.cultural_contribuitions || "";

  const grid = el("artistSongs");
  if (grid){
    grid.innerHTML = "";
    (a.songs || []).forEach(song => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = songCardHTML(song);
      grid.appendChild(card);
    });
  }
}

// ===================================================
// REGION PAGE
// ===================================================
async function initRegionPage() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return;

  const data = await apiGet(`/regions/${encodeURIComponent(id)}`);

  const hero = el("hero");
  if (hero){
    const rid = String(data.id || "").toLowerCase();
    const banner = `assets/regions/${rid}.jpg`;
    hero.style.backgroundImage = `url(${banner}), url(assets/ui/hero-default.jpg)`;
  }

  if (el("regionTitle")) el("regionTitle").textContent = data.name || "Región";
  if (el("regionMeta")) el("regionMeta").textContent = data.parent ? `Nicaragua • ${data.parent}` : "Nicaragua";
  if (el("regionDesc")) el("regionDesc").textContent = data.description || "";

  const grid = el("regionSongs");
  if (grid){
    grid.innerHTML = "";
    (data.songs || []).forEach((s) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = songCardHTML(s);
      grid.appendChild(card);
    });
  }
}

// ===================================================
// ROUTER
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body?.dataset?.page;

  if (page === "catalog") initCatalog().catch(console.error);
  if (page === "song") initSongPage().catch(console.error);
  if (page === "artist") initArtistPage().catch(console.error);
  if (page === "region") initRegionPage().catch(console.error);
});

// -------- playlists --------
async function initPlaylists(){
  const data = await fetchJSON(`${API_BASE}/educational/playlists`);
  const wrap = el("playlistsWrap");
  wrap.innerHTML = "";

  data.forEach(p => {
    const box = document.createElement("div");
    box.className = "reader";
    const items = (p.items || []).slice(0, 10).map(s => `<li><a href="./song.html?id=${s.id}">${s.title}</a> — ${s.artist?.name || ""}</li>`).join("");
    box.innerHTML = `<h2>${p.title}</h2><ul>${items || "<li>No hay resultados aún.</li>"}</ul>`;
    wrap.appendChild(box);
  });
}

// -------- timeline --------
async function initTimeline(){
  const data = await fetchJSON(`${API_BASE}/educational/timeline`);
  const wrap = el("timelineWrap");
  wrap.innerHTML = "";

  data.forEach(row => {
    const box = document.createElement("div");
    box.className = "reader";
    const items = (row.songs || []).map(s => `<li><a href="./song.html?id=${s.id}">${s.title}</a> — ${s.artist?.name || ""}</li>`).join("");
    box.innerHTML = `<h2>${row.year} <span class="small">(${row.count} canciones)</span></h2><ul>${items}</ul>`;
    wrap.appendChild(box);
  });
}

// Router simple por página
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.getAttribute("data-page");
  if (page === "catalog") initCatalog().catch(console.error);
  if (page === "song") initSongPage().catch(console.error);
  if (page === "region") initRegionPage();
  if (page === "artist") initArtistPage().catch(console.error);
  if (page === "playlists") initPlaylists().catch(console.error);
  if (page === "timeline") initTimeline().catch(console.error);
});
