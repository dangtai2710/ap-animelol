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

    // Fetch episodes with movie info (paginated)
    let allEpisodes: any[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: episodes, error } = await supabase
        .from('episodes')
        .select(`
          slug,
          created_at,
          movie_id,
          movies!inner(slug, deleted_at)
        `)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('Error fetching episodes:', error);
        break;
      }

      if (!episodes || episodes.length === 0) break;
      
      // Filter out episodes from deleted movies
      const validEpisodes = episodes.filter((ep: any) => 
        ep.movies && !ep.movies.deleted_at
      );
      
      allEpisodes = [...allEpisodes, ...validEpisodes];
      
      if (episodes.length < pageSize) break;
      page++;
    }

    console.log(`Generating sitemap for ${allEpisodes.length} episodes`);

    let urls = allEpisodes.map((episode: any) => {
      const lastmod = episode.created_at 
        ? new Date(episode.created_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      const movieSlug = episode.movies?.slug;
      if (!movieSlug) return '';
      
      return `
  <url>
    <loc>${siteUrl}/phim/${movieSlug}/${episode.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`;
    }).filter(Boolean).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new Response(xml, { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error('Error generating episodes sitemap:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>`,
      { headers: corsHeaders, status: 500 }
    );
  }
});
