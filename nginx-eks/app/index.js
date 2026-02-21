"use strict";

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

const CATEGORIES = [
  { id: "action",    name: "Acción",          query: "mission impossible" },
  { id: "comedy",    name: "Comedia",          query: "superbad hangover" },
  { id: "drama",     name: "Drama",            query: "shawshank godfather" },
  { id: "horror",    name: "Terror",           query: "conjuring halloween" },
  { id: "scifi",     name: "Ciencia Ficción",  query: "interstellar matrix" },
  { id: "animation", name: "Animación",        query: "pixar toy story" },
];

// SVG inline placeholder (no depende de servicios externos)
const NO_POSTER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='445' viewBox='0 0 300 445'%3E%3Crect width='300' height='445' fill='%231a1a2e'/%3E%3Ctext x='50%25' y='48%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%23e94560'%3ESin+P%C3%B3ster%3C/text%3E%3C/svg%3E`;

const MIN_POSTERS = 8;
const MAX_PAGES   = 4;

/**
 * Obtiene películas con poster real.
 * Itera páginas de OMDB hasta MIN_POSTERS válidas o MAX_PAGES.
 * Se llama sólo desde /api/movies (una categoría a la vez, bajo demanda).
 */
async function fetchMovies(query) {
  const withPoster = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const url =
        `https://www.omdbapi.com/?s=${encodeURIComponent(query)}` +
        `&type=movie&page=${page}&apikey=${OMDB_API_KEY}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.Response !== "True" || !Array.isArray(data.Search)) break;
      withPoster.push(...data.Search.filter((m) => m.Poster && m.Poster !== "N/A"));
      const total = parseInt(data.totalResults, 10) || 0;
      if (withPoster.length >= MIN_POSTERS || page * 10 >= total) break;
    } catch {
      break;
    }
  }
  return withPoster.slice(0, 12);
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

/**
 * API endpoint: el cliente pide una categoría a la vez cuando el usuario
 * hace click en un tab. Nunca se solicitan en paralelo.
 */
app.get("/api/movies", async (req, res) => {
  if (!OMDB_API_KEY) {
    return res.status(500).json({ error: "OMDB_API_KEY no configurada" });
  }
  const catId = req.query.category || "action";
  const cat   = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
  const movies = await fetchMovies(cat.query);
  res.json(movies);
});

/** Sirve el shell HTML; todas las llamadas a OMDB las hace el propio browser */
app.get("/", (_req, res) => {
  // JSON.stringify garantiza escape correcto al embeberlo en el script del cliente
  const noPosterJson = JSON.stringify(NO_POSTER_SVG);

  const tabButtons = CATEGORIES
    .map((c, i) => `<button class="tab-btn${i === 0 ? " active" : ""}" data-id="${c.id}">${c.name}</button>`)
    .join("\n");

  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>🎬 Cine</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:      #0d0d1a; --surface: #13132b;
      --accent:  #e94560; --accent2: #f5a623;
      --text:    #e8e8f0; --muted:   #888;
      --radius:  12px;
    }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; min-height: 100vh; }
    header {
      background: linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 100%);
      border-bottom: 2px solid var(--accent);
      padding: 1.5rem 2rem; display: flex; align-items: center; gap: 1rem;
    }
    header h1 { font-size: 2rem; letter-spacing: 2px; }
    header h1 span { color: var(--accent); }
    .tagline { color: var(--muted); font-size: .9rem; margin-top: .25rem; }
    .tabs { display: flex; gap: .5rem; padding: 1.5rem 2rem .5rem; flex-wrap: wrap; }
    .tab-btn {
      background: var(--surface); color: var(--muted);
      border: 1px solid #2a2a4a; border-radius: 2rem;
      padding: .5rem 1.25rem; cursor: pointer; font-size: .9rem; transition: all .2s;
    }
    .tab-btn:hover { border-color: var(--accent); color: var(--text); }
    .tab-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); font-weight: 600; }
    .panel { padding: 1.5rem 2rem 3rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1.25rem; }
    .card {
      background: var(--surface); border-radius: var(--radius);
      overflow: hidden; border: 1px solid #2a2a4a;
      transition: transform .2s, box-shadow .2s; cursor: pointer;
    }
    .card:hover { transform: translateY(-6px); box-shadow: 0 12px 30px rgba(233,69,96,.3); border-color: var(--accent); }
    .card-poster { aspect-ratio: 2/3; overflow: hidden; background: #1a1a2e; }
    .card-poster img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
    .card:hover .card-poster img { transform: scale(1.05); }
    .card-info { padding: .75rem; }
    .card-info h3 { font-size: .85rem; line-height: 1.3; margin-bottom: .3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .year { font-size: .75rem; color: var(--accent2); font-weight: 600; }
    .status { color: var(--muted); padding: 3rem 0; text-align: center; font-size: .95rem; }
    footer { text-align: center; padding: 2rem; color: var(--muted); font-size: .8rem; border-top: 1px solid #2a2a4a; }
    footer span { color: var(--accent); }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>🎬 <span>Cine</span></h1>
      <p class="tagline">Explora películas por categoría · Powered by OMDb</p>
    </div>
  </header>
  <nav class="tabs">${tabButtons}</nav>
  <main>
    <div class="panel">
      <div id="grid" class="grid"><p class="status">Cargando...</p></div>
    </div>
  </main>
  <footer>Datos provistos por <span>OMDb API</span> · cine.example.com</footer>

  <script>
    const NO_POSTER = ${noPosterJson};
    let current = null;

    async function loadCategory(id) {
      if (id === current) return;
      current = id;

      document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.id === id));
      const grid = document.getElementById('grid');
      grid.innerHTML = '<p class="status">Cargando...</p>';

      try {
        const res   = await fetch('/api/movies?category=' + id);
        const movies = await res.json();
        if (!movies.length) {
          grid.innerHTML = '<p class="status">No se encontraron películas.</p>';
          return;
        }
        grid.innerHTML = movies.map(m => {
          const poster = (m.Poster && m.Poster !== 'N/A') ? m.Poster : NO_POSTER;
          return \`<div class="card">
            <div class="card-poster"><img src="\${poster}" alt="\${m.Title}" loading="lazy" onerror="this.src='\${NO_POSTER}'"/></div>
            <div class="card-info"><h3>\${m.Title}</h3><span class="year">\${m.Year}</span></div>
          </div>\`;
        }).join('');
      } catch {
        grid.innerHTML = '<p class="status">Error al cargar. Intenta nuevamente.</p>';
      }
    }

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => loadCategory(btn.dataset.id));
    });

    // Carga la primera categoría al iniciar
    loadCategory('${CATEGORIES[0].id}');  // server-side: 'action'
  </script>
</body>
</html>`);
});

app.listen(port, "0.0.0.0", () =>
  console.log(\`cine escuchando en puerto \${port}\`),
);

const CATEGORIES = [
  { id: "action", name: "Acción", query: "mission impossible" },
  { id: "comedy", name: "Comedia", query: "superbad hangover" },
  { id: "drama", name: "Drama", query: "shawshank godfather" },
  { id: "horror", name: "Terror", query: "conjuring halloween" },
  { id: "scifi", name: "Ciencia Ficción", query: "interstellar matrix" },
  { id: "animation", name: "Animación", query: "pixar toy story" },
];

// SVG inline placeholder: evita dependencia de servicios externos como via.placeholder.com (caído desde 2023)
const NO_POSTER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='445' viewBox='0 0 300 445'%3E%3Crect width='300' height='445' fill='%231a1a2e'/%3E%3Ctext x='50%25' y='48%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%23e94560'%3ESin P%C3%B3ster%3C/text%3E%3C/svg%3E`;

const MIN_POSTERS = 8; // mínimo de tarjetas con poster real
const MAX_PAGES = 4; // máximo de páginas a consultar en OMDB para conseguirlos

/**
 * Obtiene películas con poster real para un query dado.
 * Itera páginas de OMDB hasta reunir MIN_POSTERS resultados con poster válido
 * o alcanzar MAX_PAGES, lo que ocurra primero.
 */
async function fetchMovies(query) {
  const withPoster = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const url =
        `https://www.omdbapi.com/?s=${encodeURIComponent(query)}` +
        `&type=movie&page=${page}&apikey=${OMDB_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.Response !== "True" || !Array.isArray(data.Search)) break;

      // Sólo conservar entradas con poster real
      const valid = data.Search.filter((m) => m.Poster && m.Poster !== "N/A");
      withPoster.push(...valid);

      // Si ya tenemos suficientes o no hay más páginas disponibles, parar
      const totalResults = parseInt(data.totalResults, 10) || 0;
      if (withPoster.length >= MIN_POSTERS || page * 10 >= totalResults) break;
    } catch {
      break;
    }
  }

  return withPoster.slice(0, 12); // devolver como máximo 12 tarjetas
}

// ── HTML renderer ─────────────────────────────────────────────────────────────
function renderHTML(categories) {
  const tabButtons = categories
    .map(
      (c, i) =>
        `<button class="tab-btn${i === 0 ? " active" : ""}" data-target="${c.id}">${c.name}</button>`,
    )
    .join("\n");

  const tabPanels = categories
    .map((c, i) => {
      const cards = c.movies.length
        ? c.movies
            .map((m) => {
              const poster =
                m.Poster && m.Poster !== "N/A" ? m.Poster : NO_POSTER_SVG;
              return `
        <div class="card">
          <div class="card-poster">
            <img src="${poster}" alt="${m.Title}" loading="lazy" onerror="this.src='${NO_POSTER_SVG}'"/>
          </div>
          <div class="card-info">
            <h3>${m.Title}</h3>
            <span class="year">${m.Year}</span>
          </div>
        </div>`;
            })
            .join("\n")
        : '<p class="no-results">No se encontraron películas.</p>';

      return `<div class="tab-panel${i === 0 ? " active" : ""}" id="${c.id}">\n<div class="grid">${cards}</div>\n</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>🎬 Cine</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d0d1a;
      --surface:   #13132b;
      --accent:    #e94560;
      --accent2:   #f5a623;
      --text:      #e8e8f0;
      --muted:     #888;
      --radius:    12px;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Segoe UI', system-ui, sans-serif;
      min-height: 100vh;
    }

    /* ── Header ── */
    header {
      background: linear-gradient(135deg, #0d0d1a 0%, #1a0a2e 100%);
      border-bottom: 2px solid var(--accent);
      padding: 1.5rem 2rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    header h1 { font-size: 2rem; letter-spacing: 2px; }
    header h1 span { color: var(--accent); }
    .tagline { color: var(--muted); font-size: .9rem; margin-top: .25rem; }

    /* ── Tabs ── */
    .tabs {
      display: flex;
      gap: .5rem;
      padding: 1.5rem 2rem .5rem;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: var(--surface);
      color: var(--muted);
      border: 1px solid #2a2a4a;
      border-radius: 2rem;
      padding: .5rem 1.25rem;
      cursor: pointer;
      font-size: .9rem;
      transition: all .2s;
    }
    .tab-btn:hover { border-color: var(--accent); color: var(--text); }
    .tab-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
      font-weight: 600;
    }

    /* ── Panels ── */
    .tab-panel { display: none; padding: 1.5rem 2rem 3rem; }
    .tab-panel.active { display: block; }

    /* ── Grid ── */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 1.25rem;
    }

    /* ── Card ── */
    .card {
      background: var(--surface);
      border-radius: var(--radius);
      overflow: hidden;
      border: 1px solid #2a2a4a;
      transition: transform .2s, box-shadow .2s;
      cursor: pointer;
    }
    .card:hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 30px rgba(233,69,96,.3);
      border-color: var(--accent);
    }
    .card-poster { aspect-ratio: 2/3; overflow: hidden; background: #1a1a2e; }
    .card-poster img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
    .card:hover .card-poster img { transform: scale(1.05); }
    .card-info { padding: .75rem; }
    .card-info h3 { font-size: .85rem; line-height: 1.3; margin-bottom: .3rem; }
    .year { font-size: .75rem; color: var(--accent2); font-weight: 600; }
    .no-results { color: var(--muted); padding: 2rem 0; }

    /* ── Footer ── */
    footer {
      text-align: center;
      padding: 2rem;
      color: var(--muted);
      font-size: .8rem;
      border-top: 1px solid #2a2a4a;
    }
    footer span { color: var(--accent); }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>🎬 <span>Cine</span></h1>
      <p class="tagline">Explora películas por categoría · Powered by OMDb</p>
    </div>
  </header>

  <nav class="tabs">
    ${tabButtons}
  </nav>

  <main>
    ${tabPanels}
  </main>

  <footer>Datos provistos por <span>OMDb API</span> · cine.example.com</footer>

  <script>
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
      });
    });
  </script>
</body>
</html>`;
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

app.get("/", async (_req, res) => {
  if (!OMDB_API_KEY) {
    return res.status(500).send("OMDB_API_KEY no configurada.");
  }
  const results = await Promise.all(
    CATEGORIES.map(async (cat) => ({
      ...cat,
      movies: await fetchMovies(cat.query),
    })),
  );
  res.send(renderHTML(results));
});

app.listen(port, "0.0.0.0", () =>
  console.log(`cine escuchando en puerto ${port}`),
);
