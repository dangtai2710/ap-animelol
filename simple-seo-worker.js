// Simplified SEO Worker
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";
    
    // Only process bot requests
    if (!ua.includes("facebookexternalhit") && !ua.includes("twitterbot") && !ua.includes("googlebot")) {
      // Forward to Pages
      return fetch(request);
    }
    
    console.log(`SEO Worker: ${request.method} ${url.pathname} ua=${ua}`);
    
    // Movie detail route: /phim/:slug
    const movieMatch = url.pathname.match(/^\/phim\/([^\/]+)(?:\/)?$/i);
    if (movieMatch) {
      const slug = movieMatch[1];
      console.log(`Movie SEO: slug=${slug}`);
      
      // Return simple SEO HTML for testing
      return new Response(`
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xem Thu Hút Mạnh Liệt Tập 8 FHD - AnimeLoL</title>
  <meta name="description" content="Xem phim Thu Hút Mạnh Liệt Tập 8 FHD vietsub">
  <meta property="og:title" content="Xem Thu Hút Mạnh Liệt Tập 8 FHD - AnimeLoL">
  <meta property="og:description" content="Xem phim Thu Hút Mạnh Liệt Tập 8 FHD vietsub">
  <meta property="og:url" content="${url.href}">
  <meta property="og:type" content="video.movie">
</head>
<body>
  <h1>SEO Worker Working!</h1>
  <p>Slug: ${slug}</p>
  <p>User-Agent: ${ua}</p>
</body>
</html>`, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Forward to Pages for non-movie routes
    return fetch(request);
  },
};
