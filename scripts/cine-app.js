const http = require("http");
const https = require("https");
const url = require("url");

const PORT = process.env.PORT || 3000;
const OMDB_API_KEY = process.env.OMDB_API_KEY || "demo";

// Movie categories with OMDB search queries
const categories = {
  action: "action",
  drama: "drama",
  comedy: "comedy",
  thriller: "thriller",
  scifi: "science fiction",
  horror: "horror",
};

function fetchMovies(searchTerm, callback) {
  const query = `https://www.omdbapi.com/?s=${encodeURIComponent(searchTerm)}&type=movie&apikey=${OMDB_API_KEY}`;

  https
    .get(query, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.Response === "True") {
            callback(null, result.Search || []);
          } else {
            callback(null, []);
          }
        } catch (e) {
          callback(null, []);
        }
      });
    })
    .on("error", (err) => {
      callback(null, []);
    });
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  res.setHeader("Content-Type", "text/html; charset=utf-8");

  if (pathname === "/api/movies") {
    const category = query.category || "action";
    const searchTerm = categories[category] || "action";

    fetchMovies(searchTerm, (err, movies) => {
      if (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: "Error fetching movies" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(movies));
    });
  } else {
    res.writeHead(200);
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Cine - Películas</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              padding: 20px;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
            }
            h1 {
              color: white;
              text-align: center;
              margin-bottom: 30px;
              font-size: 48px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .categories {
              display: flex;
              gap: 10px;
              margin-bottom: 30px;
              flex-wrap: wrap;
              justify-content: center;
            }
            .category-btn {
              padding: 10px 20px;
              border: none;
              border-radius: 25px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.3s ease;
              background: rgba(255,255,255,0.2);
              color: white;
              border: 2px solid white;
            }
            .category-btn:hover {
              background: white;
              color: #667eea;
            }
            .category-btn.active {
              background: white;
              color: #667eea;
            }
            .movies {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 20px;
            }
            .movie-card {
              background: white;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 10px 25px rgba(0,0,0,0.2);
              transition: transform 0.3s ease;
              cursor: pointer;
            }
            .movie-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 15px 35px rgba(0,0,0,0.3);
            }
            .movie-poster {
              width: 100%;
              height: 300px;
              background: #ddd;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #999;
              font-size: 12px;
            }
            .movie-info {
              padding: 15px;
            }
            .movie-title {
              font-weight: 600;
              margin-bottom: 8px;
              font-size: 14px;
              color: #333;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .movie-year {
              color: #666;
              font-size: 12px;
            }
            .loading {
              text-align: center;
              color: white;
              padding: 40px;
              font-size: 18px;
            }
            .error {
              text-align: center;
              color: #ff6b6b;
              padding: 40px;
              font-size: 18px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎬 Cine</h1>
            
            <div class="categories">
              <button class="category-btn active" onclick="loadMovies('action')">Acción</button>
              <button class="category-btn" onclick="loadMovies('drama')">Drama</button>
              <button class="category-btn" onclick="loadMovies('comedy')">Comedia</button>
              <button class="category-btn" onclick="loadMovies('thriller')">Thriller</button>
              <button class="category-btn" onclick="loadMovies('scifi')">Ciencia Ficción</button>
              <button class="category-btn" onclick="loadMovies('horror')">Terror</button>
            </div>

            <div id="content" class="movies"></div>
          </div>

          <script>
            async function loadMovies(category) {
              const content = document.getElementById('content');
              content.innerHTML = '<div class="loading">Cargando películas...</div>';

              // Update active button
              document.querySelectorAll('.category-btn').forEach(btn => {
                btn.classList.remove('active');
              });
              event.target.classList.add('active');

              try {
                const response = await fetch('/api/movies?category=' + category);
                const movies = await response.json();
                
                if (movies.length === 0) {
                  content.innerHTML = '<div class="error">No se encontraron películas para esta categoría</div>';
                  return;
                }

                const html = movies.map(movie => {
                  return \`<div class="movie-card">
                    <div class="movie-poster" style="background-image: url('\${movie.Poster}'); background-size: cover; background-position: center;">
                      \${movie.Poster === 'N/A' ? 'No hay imagen' : ''}
                    </div>
                    <div class="movie-info">
                      <div class="movie-title">\${movie.Title}</div>
                      <div class="movie-year">\${movie.Year}</div>
                    </div>
                  </div>\`;
                }).join('');

                content.innerHTML = html;
              } catch (error) {
                content.innerHTML = '<div class="error">Error al cargar las películas</div>';
              }
            }

            // Load action movies on page load
            loadMovies('action');
          </script>
        </body>
      </html>
    `);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cine app running on port ${PORT}`);
  console.log(
    `OMDB API Key: ${OMDB_API_KEY === "demo" ? "Using demo key" : "Configured"}`,
  );
});
