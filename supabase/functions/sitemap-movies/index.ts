import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get site URL from settings
    const { data: siteSettings } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', 'site_url')
      .maybeSingle();

    const siteUrl = (siteSettings?.setting_value || 'https://example.com').replace(/\/$/, '');

    // Fetch all movies (paginated to handle large datasets)
    let allMovies: any[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: movies, error } = await supabase
        .from('movies')
        .select('slug, updated_at')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching movies:', error);
        break;
      }

      if (!movies || movies.length === 0) break;
      
      allMovies = [...allMovies, ...movies];
      
      if (movies.length < pageSize) break;
      page++;
    }

    console.log(`Generating sitemap for ${allMovies.length} movies`);

    let urls = allMovies.map(movie => {
      const lastmod = movie.updated_at 
        ? new Date(movie.updated_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      return `
  <url>
    <loc>${siteUrl}/phim/${movie.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new Response(xml, { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error('Error generating movies sitemap:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>`,
      { headers: corsHeaders, status: 500 }
    );
  }
});
