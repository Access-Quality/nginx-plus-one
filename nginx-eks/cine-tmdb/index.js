"use strict";

const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

const TMDB_BASE = "https://api.themoviedb.org/3";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";

// TMDB genre IDs: https://developer.themoviedb.org/reference/genre-movie-list
const CATEGORIES = [
  { id: "action", name: "Acción", genreId: 28 },
  { id: "comedy", name: "Comedia", genreId: 35 },
  { id: "drama", name: "Drama", genreId: 18 },
  { id: "horror", name: "Terror", genreId: 27 },
  { id: "scifi", name: "Ciencia Ficción", genreId: 878 },
  { id: "animation", name: "Animación", genreId: 16 },
];

/**
 * Busca películas populares por género en TMDB.
 * Devuelve hasta 20 resultados con poster_path definido.
 *
 * TMDB soporta dos formatos de autenticación:
 *   - API Key v3 (cadena hex ~32 chars):  ?api_key=KEY
 *   - Read Access Token (JWT largo):       Authorization: Bearer TOKEN
 * Esta función detecta el formato automáticamente por longitud/prefijo.
 * Incluye AbortController para timeout de 8 s — evita que el pod cuelgue.
 */
async function fetchMovies(genreId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // Si el token es un JWT (>100 chars o empieza con "eyJ"), usar Bearer.
    // Si es la API Key v3 corta (hex ~32 chars), usar ?api_key= en la URL.
    const isJWT = TMDB_API_KEY.length > 100 || TMDB_API_KEY.startsWith("eyJ");
    const queryParam = isJWT ? "" : `&api_key=${TMDB_API_KEY}`;
    const headers = {
      Accept: "application/json",
      ...(isJWT ? { Authorization: `Bearer ${TMDB_API_KEY}` } : {}),
    };

    const url =
      `${TMDB_BASE}/discover/movie` +
      `?with_genres=${genreId}` +
      `&sort_by=popularity.desc` +
      `&language=es-MX` +
      `&include_adult=false` +
      `&page=1` +
      queryParam;

    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `TMDB error: HTTP ${res.status} for genreId ${genreId} — ${body.slice(0, 200)}`,
      );
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data.results)) return [];
    return data.results
      .filter((m) => m.poster_path)
      .slice(0, 20)
      .map((m) => ({
        id: m.id,
        title: m.title,
        year: m.release_date ? m.release_date.slice(0, 4) : "—",
        posterUrl: POSTER_BASE + m.poster_path,
        rating: m.vote_average ? m.vote_average.toFixed(1) : null,
      }));
  } catch (err) {
    clearTimeout(timer);
    console.error(`fetchMovies error (genreId=${genreId}):`, err.message);
    return [];
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get("/healthz", (_req, res) => res.json({ status: "ok" }));

/**
 * API endpoint: el cliente llama esto al hacer click en un tab.
 * Nunca se invoca en paralelo — una categoría a la vez.
 */
app.get("/api/movies", async (req, res) => {
  if (!TMDB_API_KEY) {
    console.error("TMDB_API_KEY no está configurada");
    return res.status(500).json({ error: "TMDB_API_KEY no configurada" });
  }
  const catId = req.query.category || "action";
  const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[0];
  console.log(`Fetching TMDB category=${catId} genreId=${cat.genreId}`);
  const movies = await fetchMovies(cat.genreId);
  console.log(`TMDB returned ${movies.length} movies for category=${catId}`);
  res.json(movies);
});

/** Shell HTML — contraste visual con cine (oscuro/frío): aquí claro/cálido */
app.get("/", (_req, res) => {
  const tabBtns = CATEGORIES.map(
    (c, i) =>
      `<button class="tab-btn${i === 0 ? " active" : ""}" data-id="${c.id}">${c.name}</button>`,
  ).join("\n");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Cine TMDB</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:       #f5f7fa;
      --surface:  #ffffff;
      --border:   #e2e8f0;
      --accent:   #01b4e4;
      --accent2:  #90cea1;
      --dark:     #0d253f;
      --text:     #1e293b;
      --muted:    #64748b;
      --radius:   14px;
      --shadow:   0 4px 24px rgba(1,180,228,.10);
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Segoe UI', system-ui, sans-serif;
      min-height: 100vh;
    }

    /* ── Header ── */
    header {
      background: linear-gradient(135deg, #0d253f 0%, #01405e 60%, #01b4e4 100%);
      padding: 1.5rem 2rem;
      display: flex; align-items: center; justify-content: space-between;
    }
    .header-brand { display: flex; align-items: center; gap: .75rem; }
    .header-brand h1 { font-size: 1.75rem; letter-spacing: -0.02em; color: #fff; }
    .header-brand h1 span { color: var(--accent2); }
    .tmdb-badge {
      background: var(--accent2);
      color: var(--dark);
      font-size: .65rem; font-weight: 800; letter-spacing: .08em;
      padding: .2rem .5rem; border-radius: 4px;
    }
    .tagline { color: rgba(255,255,255,.7); font-size: .85rem; margin-top: .2rem; }

    /* ── Tabs ── */
    .tabs {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex; gap: .25rem;
      padding: 0 2rem;
      flex-wrap: wrap;
    }
    .tab-btn {
      background: transparent; color: var(--muted);
      border: none; border-bottom: 3px solid transparent;
      padding: .9rem 1.1rem; cursor: pointer;
      font-size: .875rem; font-weight: 600;
      transition: all .2s; white-space: nowrap;
    }
    .tab-btn:hover { color: var(--accent); border-bottom-color: var(--accent); }
    .tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }

    /* ── Content ── */
    .panel { padding: 2rem; max-width: 1400px; margin: 0 auto; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
      gap: 1.25rem;
    }

    /* ── Card ── */
    .card {
      background: var(--surface);
      border-radius: var(--radius);
      overflow: hidden;
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      transition: transform .2s, box-shadow .2s;
      cursor: pointer;
    }
    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 16px 40px rgba(1,180,228,.2);
      border-color: var(--accent);
    }
    .card-poster {
      aspect-ratio: 2/3;
      overflow: hidden;
      background: linear-gradient(160deg, #e2e8f0 0%, #f5f7fa 100%);
      position: relative;
    }
    .card-poster img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s; }
    .card:hover .card-poster img { transform: scale(1.04); }
    .card-info { padding: .75rem; }
    .card-info h3 {
      font-size: .82rem; font-weight: 700; line-height: 1.3;
      margin-bottom: .3rem; color: var(--text);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .card-meta { display: flex; justify-content: space-between; align-items: center; }
    .year { font-size: .72rem; color: var(--muted); }
    .rating {
      font-size: .7rem; font-weight: 700;
      background: var(--accent); color: #fff;
      padding: .1rem .35rem; border-radius: 4px;
    }
    .rating.good { background: var(--accent2); color: var(--dark); }

    /* ── Status ── */
    .status {
      text-align: center; padding: 4rem 0;
      color: var(--muted); font-size: .95rem;
    }
    .spinner {
      display: inline-block; width: 32px; height: 32px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin .7s linear infinite;
      margin-bottom: 1rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Footer ── */
    footer {
      margin-top: 2rem;
      text-align: center; padding: 1.5rem;
      color: var(--muted); font-size: .78rem;
      border-top: 1px solid var(--border);
    }
    footer a { color: var(--accent); text-decoration: none; }

    @media (max-width: 640px) {
      .panel { padding: 1rem; }
      .tabs { padding: 0 1rem; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-brand">
      <div>
        <h1>&#127916; <span>Cine</span> TMDB</h1>
        <p class="tagline">Películas populares por género · Powered by TMDB</p>
      </div>
      <span class="tmdb-badge">TMDB</span>
    </div>
  </header>

  <nav class="tabs">${tabBtns}</nav>

  <main>
    <div class="panel">
      <div id="grid" class="grid">
        <div class="status" style="grid-column:1/-1">
          <div class="spinner"></div><br>Cargando...
        </div>
      </div>
    </div>
  </main>

  <footer>
    Datos provistos por <a href="https://www.themoviedb.org" target="_blank">The Movie Database (TMDB)</a>
    &middot; cine-tmdb.example.com
  </footer>

  <script>
    var current = null;

    async function loadCategory(id) {
      if (id === current) return;
      current = id;

      document.querySelectorAll('.tab-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.id === id);
      });

      var grid = document.getElementById('grid');
      grid.innerHTML = '<div class="status" style="grid-column:1/-1"><div class="spinner"></div><br>Cargando...</div>';

      // Timeout de 12 s en el cliente para no quedar colgado indefinidamente
      var ctrl    = new AbortController();
      var timer   = setTimeout(function() { ctrl.abort(); }, 12000);

      try {
        var res = await fetch('/api/movies?category=' + id, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var movies = await res.json();

        if (!movies.length) {
          grid.innerHTML = '<div class="status" style="grid-column:1/-1">No se encontraron películas para esta categoría.</div>';
          return;
        }

        grid.innerHTML = movies.map(function(m) {
          var ratingClass = m.rating && parseFloat(m.rating) >= 7 ? 'rating good' : 'rating';
          var ratingHtml  = m.rating ? '<span class="' + ratingClass + '">' + m.rating + '</span>' : '';
          return '<div class="card">' +
            '<div class="card-poster">' +
              '<img src="' + m.posterUrl + '" alt="' + m.title.replace(/"/g, '&quot;') + '" loading="lazy" ' +
                'onerror="this.style.display=\'none\'">' +
            '</div>' +
            '<div class="card-info">' +
              '<h3 title="' + m.title.replace(/"/g, '&quot;') + '">' + m.title + '</h3>' +
              '<div class="card-meta">' +
                '<span class="year">' + m.year + '</span>' +
                ratingHtml +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      } catch(e) {
        clearTimeout(timer);
        var msg = e.name === 'AbortError'
          ? 'Tiempo de espera agotado. Verifica la conexión del servidor.'
          : 'Error al cargar (' + e.message + '). Intenta nuevamente.';
        grid.innerHTML = '<div class="status" style="grid-column:1/-1">' + msg + '</div>';
      }
    }

    document.querySelectorAll('.tab-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { loadCategory(btn.dataset.id); });
    });

    loadCategory('action');
  </script>
</body>
</html>`);
});

app.listen(port, "0.0.0.0", function () {
  console.log("cine-tmdb escuchando en puerto " + port);
});
