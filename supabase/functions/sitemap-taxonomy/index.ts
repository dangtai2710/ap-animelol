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
    const now = new Date().toISOString().split('T')[0];

    let urls: string[] = [];

    // Fetch movie categories
    const { data: categories } = await supabase
      .from('movie_categories')
      .select('slug, created_at')
      .is('deleted_at', null);

    if (categories) {
      categories.forEach(cat => {
        const lastmod = cat.created_at 
          ? new Date(cat.created_at).toISOString().split('T')[0]
          : now;
        urls.push(`
  <url>
    <loc>${siteUrl}/danh-muc/${cat.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
      });
    }

    // Fetch genres
    const { data: genres } = await supabase
      .from('genres')
      .select('slug, created_at')
      .is('deleted_at', null);

    if (genres) {
      genres.forEach(genre => {
        const lastmod = genre.created_at 
          ? new Date(genre.created_at).toISOString().split('T')[0]
          : now;
        urls.push(`
  <url>
    <loc>${siteUrl}/the-loai/${genre.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
      });
    }

    // Fetch countries
    const { data: countries } = await supabase
      .from('countries')
      .select('slug, created_at')
      .is('deleted_at', null);

    if (countries) {
      countries.forEach(country => {
        const lastmod = country.created_at 
          ? new Date(country.created_at).toISOString().split('T')[0]
          : now;
        urls.push(`
  <url>
    <loc>${siteUrl}/quoc-gia/${country.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
      });
    }

    // Fetch years
    const { data: years } = await supabase
      .from('years')
      .select('year, created_at')
      .is('deleted_at', null)
      .order('year', { ascending: false });

    if (years) {
      years.forEach(y => {
        const lastmod = y.created_at 
          ? new Date(y.created_at).toISOString().split('T')[0]
          : now;
        urls.push(`
  <url>
    <loc>${siteUrl}/nam/${y.year}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`);
      });
    }

    // Fetch actors
    const { data: actors } = await supabase
      .from('actors')
      .select('slug, created_at')
      .is('deleted_at', null);

    if (actors) {
      actors.forEach(actor => {
        const lastmod = actor.created_at 
          ? new Date(actor.created_at).toISOString().split('T')[0]
          : now;
        urls.push(`
  <url>
    <loc>${siteUrl}/dien-vien/${actor.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`);
      });
    }

    // Fetch directors
    const { data: directors } = await supabase
      .from('directors')
      .select('slug, created_at')
      .is('deleted_at', null);

    if (directors) {
      directors.forEach(director => {
        const lastmod = director.created_at 
          ? new Date(director.created_at).toISOString().split('T')[0]
          : now;
        urls.push(`
  <url>
    <loc>${siteUrl}/dao-dien/${director.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`);
      });
    }

    console.log(`Generated taxonomy sitemap with ${urls.length} URLs`);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`;

    return new Response(xml, { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error('Error generating taxonomy sitemap:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>`,
      { headers: corsHeaders, status: 500 }
    );
  }
});
