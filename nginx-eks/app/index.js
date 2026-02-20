'use strict';

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const OMDB_API_KEY = process.env.OMDB_API_KEY;

const CATEGORIES = [
  { id: 'action',    name: 'Acción',           query: 'avengers marvel' },
  { id: 'comedy',    name: 'Comedia',           query: 'comedy humor 2023' },
  { id: 'drama',     name: 'Drama',             query: 'drama award winning' },
  { id: 'horror',    name: 'Terror',            query: 'horror thriller 2023' },
  { id: 'scifi',     name: 'Ciencia Ficción',   query: 'science fiction space' },
  { id: 'animation', name: 'Animación',         query: 'pixar animation disney' },
];

async function fetchMovies(query) {
  try {
    const url = `https://www.omdbapi.com/?s=${encodeURIComponent(query)}&type=movie&apikey=${OMDB_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.Response === 'True' ? data.Search : [];
  } catch {
    return [];
  }
}

// ── HTML renderer ─────────────────────────────────────────────────────────────
function renderHTML(categories) {
  const tabButtons = categories
    .map((c, i) => `<button class="tab-btn${i === 0 ? ' active' : ''}" data-target="${c.id}">${c.name}</button>`)
    .join('\n');

  const tabPanels = categories.map((c, i) => {
    const cards = c.movies.length
      ? c.movies.map(m => {
          const poster = m.Poster && m.Poster !== 'N/A' ? m.Poster : 'https://via.placeholder.com/300x445/1a1a2e/e94560?text=Sin+Póster';
          return `
        <div class="card">
          <div class="card-poster">
            <img src="${poster}" alt="${m.Title}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x445/1a1a2e/e94560?text=Sin+Póster'"/>
          </div>
          <div class="card-info">
            <h3>${m.Title}</h3>
            <span class="year">${m.Year}</span>
          </div>
        </div>`;
        }).join('\n')
      : '<p class="no-results">No se encontraron películas.</p>';

    return `<div class="tab-panel${i === 0 ? ' active' : ''}" id="${c.id}">\n<div class="grid">${cards}</div>\n</div>`;
  }).join('\n');

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
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

app.get('/', async (_req, res) => {
  if (!OMDB_API_KEY) {
    return res.status(500).send('OMDB_API_KEY no configurada.');
  }
  const results = await Promise.all(
    CATEGORIES.map(async cat => ({ ...cat, movies: await fetchMovies(cat.query) }))
  );
  res.send(renderHTML(results));
});

app.listen(port, '0.0.0.0', () => console.log(`cine escuchando en puerto ${port}`));
