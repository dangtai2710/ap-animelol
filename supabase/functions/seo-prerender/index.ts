import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch movie data from API
async function fetchMovieData(slug: string): Promise<any> {
  try {
    const response = await fetch(`https://phimapi.com/phim/${slug}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.movie || null;
  } catch (error) {
    console.error("Error fetching movie:", error);
    return null;
  }
}

// Get site settings from database
async function getSiteSettings(supabaseUrl: string, supabaseKey: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/site_settings?select=setting_key,setting_value`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
    });
    if (!response.ok) return {};
    const data = await response.json();
    const settings: Record<string, string> = {};
    data.forEach((item: any) => {
      if (item.setting_key && item.setting_value) {
        settings[item.setting_key] = item.setting_value;
      }
    });
    return settings;
  } catch (error) {
    console.error("Error fetching site settings:", error);
    return {};
  }
}

// Get SEO settings from database
async function getSeoSettings(supabaseUrl: string, supabaseKey: string): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/seo_settings?select=setting_key,setting_value`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
    });
    if (!response.ok) return {};
    const data = await response.json();
    const settings: Record<string, string> = {};
    data.forEach((item: any) => {
      if (item.setting_key && item.setting_value) {
        settings[item.setting_key] = item.setting_value;
      }
    });
    return settings;
  } catch (error) {
    console.error("Error fetching seo settings:", error);
    return {};
  }
}

// Strip HTML tags from content
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

// Truncate text to max length
function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  const stripped = stripHtml(text);
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength - 3) + "...";
}

// Replace SEO variables
function replaceSeoVariables(template: string, variables: Record<string, string | number | undefined>): string {
  if (!template) return "";
  let result = template;
  
  result = result.replace(/%sitename%/gi, String(variables.sitename || ""));
  result = result.replace(/%phim%/gi, String(variables.phim || ""));
  result = result.replace(/%phimgoc%/gi, String(variables.phimgoc || ""));
  result = result.replace(/%theloai%/gi, String(variables.theloai || ""));
  result = result.replace(/%quocgia%/gi, String(variables.quocgia || ""));
  result = result.replace(/%nam%/gi, variables.nam ? String(variables.nam) : "");
  result = result.replace(/%tap%/gi, String(variables.tap || ""));
  result = result.replace(/%chatluong%/gi, String(variables.chatluong || ""));
  result = result.replace(/%ngonngu%/gi, String(variables.ngonngu || ""));
  result = result.replace(/%noidung%/gi, stripHtml(String(variables.noidung || "")));
  result = result.replace(/%dienvien%/gi, String(variables.dienvien || ""));
  result = result.replace(/%daodien%/gi, String(variables.daodien || ""));
  
  // Clean up multiple spaces
  result = result.replace(/\s+/g, " ").trim();
  
  return result;
}

// Get full image URL
function getImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  return `https://phimimg.com/${imageUrl}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const pageType = url.searchParams.get("type") || "movie";

    if (!slug) {
      return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Fetch data in parallel
    const [movie, siteSettings, seoSettings] = await Promise.all([
      fetchMovieData(slug),
      getSiteSettings(supabaseUrl, supabaseKey),
      getSeoSettings(supabaseUrl, supabaseKey),
    ]);

    if (!movie) {
      return new Response(JSON.stringify({ error: "Movie not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteName = seoSettings.site_name || siteSettings.site_name || "PhimHD";
    const siteUrl = siteSettings.site_url || "";

    // Build SEO variables
    const seoVariables = {
      sitename: siteName,
      phim: movie.name || "",
      phimgoc: movie.origin_name || "",
      theloai: movie.category?.map((c: any) => c.name).join(", ") || "",
      quocgia: movie.country?.map((c: any) => c.name).join(", ") || "",
      nam: movie.year,
      tap: movie.episode_current || "",
      chatluong: movie.quality || "",
      ngonngu: movie.lang || "",
      noidung: movie.content || "",
      dienvien: movie.actor?.slice(0, 5).map((a: any) => typeof a === "string" ? a : a.name).join(", ") || "",
      daodien: movie.director?.map((d: any) => typeof d === "string" ? d : d.name).join(", ") || "",
    };

    // Generate SEO content using templates
    const titleTemplate = seoSettings.movie_seo_title || seoSettings.movie_title || "%phim% %tap% %chatluong%";
    const descTemplate = seoSettings.movie_seo_description || seoSettings.movie_description || "Xem phim %phim% %tap% %chatluong% vietsub, thuyết minh. %noidung%";
    const keywordsTemplate = seoSettings.movie_seo_keywords || "%phim%, %phimgoc%, %theloai%, xem phim %phim%";

    let title = replaceSeoVariables(titleTemplate, seoVariables);
    if (!title.includes(siteName)) {
      title = `${title} - ${siteName}`;
    }

    const description = truncateText(replaceSeoVariables(descTemplate, seoVariables), 160);
    const keywords = replaceSeoVariables(keywordsTemplate, seoVariables);
    const image = getImageUrl(movie.thumb_url || movie.poster_url);
    const canonicalUrl = `${siteUrl}/phim/${slug}`;

    const result = {
      title,
      description,
      keywords,
      image,
      canonicalUrl,
      siteName,
      type: "video.movie",
      movie: {
        name: movie.name,
        origin_name: movie.origin_name,
        year: movie.year,
        quality: movie.quality,
        episode_current: movie.episode_current,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
