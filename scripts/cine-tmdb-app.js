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
            year: movie.release_date ? movie.release_date.slice(0, 4) : "N/D",
            overview: movie.overview || "Sin descripción disponible",
            poster: movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : null,
            rating: typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "-",
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

        <script>
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

              if (!movies.length) {
                content.innerHTML = '<div class="state">No se encontraron resultados para esta categoría.</div>';
                return;
              }

              const html = movies.map((movie) => {
                const posterClass = movie.poster ? 'poster' : 'poster no-image';
                const posterImage = movie.poster
                  ? '<img src="' + movie.poster + '" alt="Póster de ' + movie.title.replace(/"/g, '&quot;') + '" loading="lazy" referrerpolicy="no-referrer">'
                  : '';

                return '<article class="movie-card">'
                  + '<div class="' + posterClass + '">'
                  + posterImage
                  + '<span class="poster-fallback">Sin póster</span>'
                  + '</div>'
                  + '<div class="info">'
                  + '<div class="title">' + movie.title + '</div>'
                  + '<div class="meta"><span>' + movie.year + '</span><span>⭐ ' + movie.rating + '</span></div>'
                  + '<p class="overview">' + movie.overview + '</p>'
                  + '</div>'
                  + '</article>';
              }).join('');

              content.innerHTML = html;
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
