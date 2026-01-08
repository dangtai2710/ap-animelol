import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IndexNowRequest {
  urls: string[];
  type?: "movie" | "post" | "taxonomy";
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get settings
    const { data: settings, error: settingsError } = await supabase
      .from("site_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["site_url", "indexnow_key"]);

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw new Error("Failed to fetch settings");
    }

    const settingsMap: Record<string, string> = {};
    settings?.forEach((s) => {
      settingsMap[s.setting_key] = s.setting_value || "";
    });

    const siteUrl = settingsMap.site_url;
    const indexNowKey = settingsMap.indexnow_key;

    if (!siteUrl) {
      return new Response(
        JSON.stringify({ error: "Site URL not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!indexNowKey) {
      return new Response(
        JSON.stringify({ error: "IndexNow key not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: IndexNowRequest = await req.json();
    const { urls } = body;

    if (!urls || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "No URLs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure URLs are absolute
    const absoluteUrls = urls.map((url) =>
      url.startsWith("http") ? url : `${siteUrl}${url.startsWith("/") ? url : "/" + url}`
    );

    const host = new URL(siteUrl).host;
    const keyLocation = `${siteUrl}/${indexNowKey}.txt`;

    console.log(`Pinging IndexNow for ${absoluteUrls.length} URLs`);
    console.log("URLs:", absoluteUrls);

    const results: { engine: string; success: boolean; status?: number; error?: string }[] = [];

    // Ping Bing IndexNow
    try {
      const bingResponse = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          key: indexNowKey,
          keyLocation,
          urlList: absoluteUrls,
        }),
      });

      results.push({
        engine: "Bing/IndexNow",
        success: bingResponse.ok,
        status: bingResponse.status,
      });
      console.log(`Bing IndexNow response: ${bingResponse.status}`);
    } catch (error: any) {
      console.error("Bing IndexNow error:", error);
      results.push({
        engine: "Bing/IndexNow",
        success: false,
        error: error.message,
      });
    }

    // Ping Yandex IndexNow
    try {
      const yandexResponse = await fetch("https://yandex.com/indexnow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          key: indexNowKey,
          keyLocation,
          urlList: absoluteUrls,
        }),
      });

      results.push({
        engine: "Yandex",
        success: yandexResponse.ok,
        status: yandexResponse.status,
      });
      console.log(`Yandex response: ${yandexResponse.status}`);
    } catch (error: any) {
      console.error("Yandex error:", error);
      results.push({
        engine: "Yandex",
        success: false,
        error: error.message,
      });
    }

    // Ping Google (sitemap ping - simpler than full Indexing API)
    try {
      const sitemapUrl = encodeURIComponent(`${siteUrl}/sitemap.xml`);
      const googlePingUrl = `https://www.google.com/ping?sitemap=${sitemapUrl}`;
      const googleResponse = await fetch(googlePingUrl);

      results.push({
        engine: "Google Sitemap Ping",
        success: googleResponse.ok,
        status: googleResponse.status,
      });
      console.log(`Google ping response: ${googleResponse.status}`);
    } catch (error: any) {
      console.error("Google ping error:", error);
      results.push({
        engine: "Google Sitemap Ping",
        success: false,
        error: error.message,
      });
    }

    // Log the ping to database for tracking (optional)
    await supabase.from("crawl_logs").insert({
      type: "indexnow_ping",
      status: results.every((r) => r.success) ? "success" : "partial",
      message: JSON.stringify({
        urls: absoluteUrls,
        results,
      }),
      movies_added: 0,
      movies_updated: absoluteUrls.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        urls: absoluteUrls,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("IndexNow ping error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
