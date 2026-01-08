import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/plain; charset=utf-8',
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
    const functionsUrl = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1');

    const robotsTxt = `# Robots.txt for ${siteUrl}
# Generated dynamically

User-agent: *

# Allow SEO pages
Allow: /
Allow: /phim/
Allow: /danh-muc/
Allow: /the-loai/
Allow: /quoc-gia/
Allow: /nam/
Allow: /dien-vien/
Allow: /dao-dien/
Allow: /danh-sach/
Allow: /bai-viet/
Allow: /tv

# Disallow admin and internal routes
Disallow: /admin
Disallow: /admin/
Disallow: /auth
Disallow: /auth/

# Disallow API and internal paths
Disallow: /api/
Disallow: /_next/
Disallow: /static/

# Disallow search with query params (optional - prevents crawling search results)
Disallow: /tim-kiem?*

# Crawl delay (be nice to servers)
Crawl-delay: 1

# Sitemap location
Sitemap: ${functionsUrl}/sitemap-index

# Host directive
Host: ${siteUrl}
`;

    return new Response(robotsTxt, { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error('Error generating robots.txt:', error);
    return new Response(
      `User-agent: *\nAllow: /`,
      { headers: corsHeaders, status: 500 }
    );
  }
});
