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

    // Fetch post categories
    const { data: categories } = await supabase
      .from('post_categories')
      .select('slug, updated_at')
      .is('deleted_at', null);

    if (categories) {
      categories.forEach(cat => {
        const lastmod = cat.updated_at 
          ? new Date(cat.updated_at).toISOString().split('T')[0]
          : now;
        urls.push(`
  <url>
    <loc>${siteUrl}/bai-viet/danh-muc/${cat.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
      });
    }

    // Fetch published posts
    const { data: posts } = await supabase
      .from('posts')
      .select('slug, updated_at')
      .is('deleted_at', null)
      .eq('status', 'published')
      .order('updated_at', { ascending: false });

    if (posts) {
      posts.forEach(post => {
        const lastmod = post.updated_at 
          ? new Date(post.updated_at).toISOString().split('T')[0]
          : now;
        urls.push(`
  <url>
    <loc>${siteUrl}/bai-viet/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`);
      });
    }

    console.log(`Generated posts sitemap with ${urls.length} URLs`);

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`;

    return new Response(xml, { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error('Error generating posts sitemap:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>`,
      { headers: corsHeaders, status: 500 }
    );
  }
});
