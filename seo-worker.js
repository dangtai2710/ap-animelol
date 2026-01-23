// Cloudflare Worker for SEO middleware
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
      
      try {
        // Fetch SEO data from Supabase Edge Function
        const seoResponse = await fetch(`${env.SUPABASE_URL}/functions/v1/seo-prerender?slug=${encodeURIComponent(slug)}&type=movie`, {
          headers: {
            apikey: env.SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
          },
        });
        
        if (seoResponse.ok) {
          const seoData = await seoResponse.json();
          console.log(`SEO data:`, seoData);
          
          // Return custom HTML with SEO
          return new Response(`
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seoData.title || 'Xem phim online - AnimeLoL'}</title>
  <meta name="description" content="${seoData.description || 'Xem phim online chất lượng cao'}">
  <meta property="og:title" content="${seoData.title || 'Xem phim online - AnimeLoL'}">
  <meta property="og:description" content="${seoData.description || 'Xem phim online chất lượng cao'}">
  <meta property="og:url" content="${url.href}">
  <meta property="og:type" content="video.movie">
  <meta name="twitter:title" content="${seoData.title || 'Xem phim online - AnimeLoL'}">
  <meta name="twitter:description" content="${seoData.description || 'Xem phim online chất lượng cao'}">
</head>
<body>
  <h1>SEO Worker Working!</h1>
  <p>Slug: ${slug}</p>
  <p>Title: ${seoData.title || 'N/A'}</p>
  <p>Description: ${seoData.description || 'N/A'}</p>
</body>
</html>`, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      } catch (error) {
        console.error('SEO fetch error:', error);
      }
    }
    
    // Forward to Pages for non-movie routes or errors
    return fetch(request);
  },
};
