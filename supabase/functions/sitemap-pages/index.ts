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

    // Static pages
    const staticPages = [
      { loc: '/', changefreq: 'daily', priority: '1.0' },
      { loc: '/danh-muc/phim', changefreq: 'daily', priority: '0.9' },
      { loc: '/danh-sach/phim-moi', changefreq: 'daily', priority: '0.8' },
      { loc: '/danh-sach/phim-bo', changefreq: 'daily', priority: '0.8' },
      { loc: '/danh-sach/phim-le', changefreq: 'daily', priority: '0.8' },
      { loc: '/danh-sach/hoat-hinh', changefreq: 'daily', priority: '0.8' },
      { loc: '/tv', changefreq: 'daily', priority: '0.8' },
      { loc: '/tim-kiem', changefreq: 'weekly', priority: '0.5' },
    ];

    let urls = staticPages.map(page => `
  <url>
    <loc>${siteUrl}${page.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    return new Response(xml, { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error('Error generating pages sitemap:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>`,
      { headers: corsHeaders, status: 500 }
    );
  }
});
