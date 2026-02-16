const http = require("http");
const https = require("https");
const url = require("url");

const PORT = process.env.PORT || 3001;
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";

const categories = {
  action: { name: "Acción", genreId: 28 },
  drama: { name: "Drama", genreId: 18 },
  comedy: { name: "Comedia", genreId: 35 },
  thriller: { name: "Thriller", genreId: 53 },
  scifi: { name: "Ciencia ficción", genreId: 878 },
  horror: { name: "Terror", genreId: 27 },
};

function fetchMoviesByGenre(genreId, callback) {
  if (!TMDB_API_KEY) {
    callback(null, []);
    return;
  }

  const query = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc&language=es-ES&page=1`;

  https
    .get(query, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          const movies = (result.results || []).map((movie) => ({
            id: movie.id,
            title: movie.title,
            originalTitle: movie.original_title || movie.title,
            year: movie.release_date ? movie.release_date.slice(0, 4) : "N/D",
            releaseDate: movie.release_date || "N/D",
            overview: movie.overview || "Sin descripción disponible",
            poster: movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : null,
            rating: typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "-",
            voteCount: typeof movie.vote_count === "number" ? movie.vote_count : 0,
            popularity: typeof movie.popularity === "number" ? movie.popularity.toFixed(1) : "-",
            language: movie.original_language ? movie.original_language.toUpperCase() : "N/D",
          }));
          callback(null, movies);
        } catch (e) {
          callback(null, []);
        }
      });
    })
    .on("error", () => {
      callback(null, []);
    });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  if (pathname === "/api/movies") {
    const category = query.category || "action";
    const selected = categories[category] || categories.action;

    fetchMoviesByGenre(selected.genreId, (err, movies) => {
      if (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Error fetching movies" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ category: selected.name, movies }));
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Cine TMDB</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: linear-gradient(160deg, #0b1020 0%, #151f3b 55%, #2b1858 100%);
            color: #eef2ff;
            min-height: 100vh;
            padding: 20px;
          }
          .container { max-width: 1240px; margin: 0 auto; }
          .header {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 20px;
            padding: 24px;
            margin-bottom: 20px;
            backdrop-filter: blur(8px);
          }
          h1 { font-size: clamp(30px, 5vw, 52px); margin-bottom: 8px; letter-spacing: -0.02em; }
          .subtitle { color: rgba(238, 242, 255, 0.78); font-size: 15px; margin-bottom: 14px; }
          .categories { display: flex; flex-wrap: wrap; gap: 10px; }
          .category-btn {
            border: 1px solid rgba(255, 255, 255, 0.28);
            background: rgba(255, 255, 255, 0.08);
            color: #eef2ff;
            padding: 10px 16px;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s ease;
          }
          .category-btn.active {
            background: linear-gradient(135deg, #4f8cff 0%, #a855f7 100%);
            border-color: transparent;
          }
          .category-btn:hover { transform: translateY(-1px); background: rgba(255, 255, 255, 0.14); }
          .movies {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 16px;
          }
          .movie-card {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.32);
            transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
            cursor: pointer;
          }
          .movie-card:hover {
            transform: translateY(-3px);
            border-color: rgba(255, 255, 255, 0.32);
            box-shadow: 0 18px 35px rgba(0, 0, 0, 0.42);
          }
          .poster {
            width: 100%;
            height: 330px;
            background: #1f2a44;
            position: relative;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(238, 242, 255, 0.75);
            font-size: 13px;
          }
          .poster img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .poster-fallback {
            display: none;
            position: absolute;
            inset: 0;
            align-items: center;
            justify-content: center;
            padding: 10px;
            text-align: center;
            font-weight: 600;
            color: rgba(238, 242, 255, 0.8);
          }
          .poster.no-image .poster-fallback {
            display: flex;
          }
          .info { padding: 12px 12px 14px; }
          .title { font-size: 14px; font-weight: 700; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .meta { color: rgba(238, 242, 255, 0.75); font-size: 12px; display: flex; justify-content: space-between; gap: 10px; }
          .badges {
            margin-top: 8px;
            display: flex;
            gap: 6px;
            flex-wrap: wrap;
          }
          .badge {
            font-size: 11px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            background: rgba(255, 255, 255, 0.08);
            border-radius: 999px;
            padding: 3px 8px;
            color: rgba(238, 242, 255, 0.86);
          }
          .overview {
            margin-top: 10px;
            color: rgba(238, 242, 255, 0.82);
            font-size: 12px;
            line-height: 1.45;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .state {
            grid-column: 1 / -1;
            text-align: center;
            border: 1px dashed rgba(255, 255, 255, 0.28);
            border-radius: 14px;
            padding: 34px;
            color: rgba(238, 242, 255, 0.9);
          }
          .warning {
            margin-top: 12px;
            display: inline-block;
            background: rgba(255, 132, 71, 0.2);
            border: 1px solid rgba(255, 132, 71, 0.45);
            border-radius: 999px;
            padding: 6px 12px;
            font-size: 12px;
            color: #ffd8c2;
          }
          .modal {
            position: fixed;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 60;
            padding: 18px;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
          }
          .modal.open {
            display: flex;
          }
          .modal-card {
            width: min(900px, 100%);
            max-height: 90vh;
            overflow: auto;
            background: linear-gradient(160deg, rgba(31,42,68,0.95) 0%, rgba(24, 32, 58, 0.95) 100%);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5);
            display: grid;
            grid-template-columns: minmax(220px, 280px) 1fr;
          }
          .modal-poster {
            min-height: 100%;
            background: #1f2a44;
          }
          .modal-poster img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
          }
          .modal-body {
            padding: 20px;
          }
          .modal-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 14px;
          }
          .modal-title {
            font-size: 28px;
            line-height: 1.15;
            margin-bottom: 6px;
          }
          .modal-subtitle {
            color: rgba(238, 242, 255, 0.72);
            font-size: 14px;
          }
          .close-btn {
            border: 1px solid rgba(255, 255, 255, 0.28);
            background: rgba(255, 255, 255, 0.08);
            color: #eef2ff;
            width: 34px;
            height: 34px;
            border-radius: 10px;
            font-size: 18px;
            cursor: pointer;
          }
          .close-btn:hover { background: rgba(255, 255, 255, 0.16); }
          .detail-grid {
            margin-top: 14px;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          .detail-item {
            background: rgba(255, 255, 255, 0.07);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 10px;
            padding: 10px;
          }
          .detail-item span {
            display: block;
            font-size: 11px;
            color: rgba(238, 242, 255, 0.65);
            margin-bottom: 4px;
          }
          .detail-item strong {
            font-size: 13px;
          }
          .modal-overview {
            margin-top: 14px;
            color: rgba(238, 242, 255, 0.9);
            line-height: 1.6;
            font-size: 14px;
          }
          .tmdb-link {
            margin-top: 16px;
            display: inline-block;
            border-radius: 999px;
            padding: 10px 14px;
            color: #eef2ff;
            text-decoration: none;
            font-weight: 600;
            border: 1px solid rgba(255, 255, 255, 0.22);
            background: rgba(255, 255, 255, 0.08);
          }
          .tmdb-link:hover {
            background: rgba(255, 255, 255, 0.16);
          }
          @media (max-width: 760px) {
            .modal-card { grid-template-columns: 1fr; }
            .modal-poster { height: 360px; }
            .detail-grid { grid-template-columns: 1fr; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🍿 Cine TMDB</h1>
            <p class="subtitle">Descubre películas populares por género desde The Movie Database.</p>
            <div class="categories">
              <button class="category-btn active" data-category="action" onclick="loadMovies('action')">Acción</button>
              <button class="category-btn" data-category="drama" onclick="loadMovies('drama')">Drama</button>
              <button class="category-btn" data-category="comedy" onclick="loadMovies('comedy')">Comedia</button>
              <button class="category-btn" data-category="thriller" onclick="loadMovies('thriller')">Thriller</button>
              <button class="category-btn" data-category="scifi" onclick="loadMovies('scifi')">Ciencia Ficción</button>
              <button class="category-btn" data-category="horror" onclick="loadMovies('horror')">Terror</button>
            </div>
            ${TMDB_API_KEY ? "" : '<div class="warning">TMDB_API_KEY no está configurada</div>'}
          </div>

          <div id="content" class="movies"></div>
        </div>

        <div id="movieModal" class="modal" onclick="closeMovieDetails(event)">
          <div class="modal-card" onclick="event.stopPropagation()">
            <div class="modal-poster" id="modalPoster"></div>
            <div class="modal-body">
              <div class="modal-head">
                <div>
                  <h2 class="modal-title" id="modalTitle">Película</h2>
                  <div class="modal-subtitle" id="modalSubtitle"></div>
                </div>
                <button class="close-btn" onclick="closeMovieDetails()" aria-label="Cerrar">×</button>
              </div>
              <div class="detail-grid">
                <div class="detail-item"><span>Calificación</span><strong id="modalRating">-</strong></div>
                <div class="detail-item"><span>Votos</span><strong id="modalVotes">-</strong></div>
                <div class="detail-item"><span>Popularidad</span><strong id="modalPopularity">-</strong></div>
                <div class="detail-item"><span>Idioma original</span><strong id="modalLanguage">-</strong></div>
              </div>
              <p class="modal-overview" id="modalOverview"></p>
              <a class="tmdb-link" id="modalTmdbLink" href="#" target="_blank" rel="noopener noreferrer">Ver en TMDB</a>
            </div>
          </div>
        </div>

        <script>
          let currentMovies = [];

          function escapeHtml(value) {
            return String(value || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          }

          function closeMovieDetails(event) {
            if (event && event.target && event.target.className && String(event.target.className).indexOf('modal') === -1) {
              return;
            }
            const modal = document.getElementById('movieModal');
            modal.classList.remove('open');
            document.body.style.overflow = '';
          }

          function openMovieDetails(index) {
            const movie = currentMovies[index];
            if (!movie) return;

            const posterHtml = movie.poster
              ? '<img src="' + movie.poster + '" alt="Póster de ' + escapeHtml(movie.title) + '" referrerpolicy="no-referrer">'
              : '<div class="poster-fallback" style="display:flex;position:static;height:100%;">Sin póster</div>';

            document.getElementById('modalPoster').innerHTML = posterHtml;
            document.getElementById('modalTitle').textContent = movie.title;
            document.getElementById('modalSubtitle').textContent = movie.originalTitle + ' • ' + movie.releaseDate;
            document.getElementById('modalRating').textContent = '⭐ ' + movie.rating;
            document.getElementById('modalVotes').textContent = String(movie.voteCount);
            document.getElementById('modalPopularity').textContent = String(movie.popularity);
            document.getElementById('modalLanguage').textContent = movie.language;
            document.getElementById('modalOverview').textContent = movie.overview;
            document.getElementById('modalTmdbLink').href = 'https://www.themoviedb.org/movie/' + movie.id;

            const modal = document.getElementById('movieModal');
            modal.classList.add('open');
            document.body.style.overflow = 'hidden';
          }

          async function loadMovies(category) {
            const content = document.getElementById('content');
            content.innerHTML = '<div class="state">Cargando películas...</div>';

            document.querySelectorAll('.category-btn').forEach((btn) => btn.classList.remove('active'));
            const active = document.querySelector('.category-btn[data-category="' + category + '"]');
            if (active) active.classList.add('active');

            try {
              const response = await fetch('/api/movies?category=' + category);
              const payload = await response.json();
              const movies = payload.movies || [];
              currentMovies = movies;

              if (!movies.length) {
                content.innerHTML = '<div class="state">No se encontraron resultados para esta categoría.</div>';
                return;
              }

              const html = movies.map((movie, index) => {
                const posterClass = movie.poster ? 'poster' : 'poster no-image';
                const posterImage = movie.poster
                  ? '<img src="' + movie.poster + '" alt="Póster de ' + escapeHtml(movie.title) + '" loading="lazy" referrerpolicy="no-referrer">'
                  : '';

                return '<article class="movie-card" data-index="' + index + '">'
                  + '<div class="' + posterClass + '">'
                  + posterImage
                  + '<span class="poster-fallback">Sin póster</span>'
                  + '</div>'
                  + '<div class="info">'
                  + '<div class="title">' + escapeHtml(movie.title) + '</div>'
                  + '<div class="meta"><span>' + movie.year + '</span><span>⭐ ' + movie.rating + '</span></div>'
                  + '<div class="badges"><span class="badge">🗳️ ' + movie.voteCount + ' votos</span><span class="badge">🌐 ' + movie.language + '</span></div>'
                  + '<p class="overview">' + escapeHtml(movie.overview) + '</p>'
                  + '</div>'
                  + '</article>';
              }).join('');

              content.innerHTML = html;
              document.querySelectorAll('.movie-card').forEach((card) => {
                card.addEventListener('click', () => {
                  const index = Number(card.getAttribute('data-index'));
                  openMovieDetails(index);
                });
              });
              document.querySelectorAll('.poster img').forEach((img) => {
                img.addEventListener('error', () => {
                  const posterContainer = img.closest('.poster');
                  if (posterContainer) {
                    posterContainer.classList.add('no-image');
                  }
                  img.remove();
                });
              });
            } catch (error) {
              content.innerHTML = '<div class="state">Error al consultar TMDB.</div>';
            }
          }

          document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
              closeMovieDetails();
            }
          });

          loadMovies('action');
        </script>
      </body>
    </html>
  `);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cine TMDB app running on port ${PORT}`);
  console.log(`TMDB API Key: ${TMDB_API_KEY ? "Configured" : "Missing"}`);
});
