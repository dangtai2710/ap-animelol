import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This function serves the IndexNow verification file
// URL: /indexnow-verify?key=your-key
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const requestedKey = url.searchParams.get("key");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the stored IndexNow key
    const { data: settings, error } = await supabase
      .from("site_settings")
      .select("setting_value")
      .eq("setting_key", "indexnow_key")
      .single();

    if (error || !settings?.setting_value) {
      return new Response("IndexNow key not configured", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    const storedKey = settings.setting_value;

    // If a specific key is requested, verify it matches
    if (requestedKey && requestedKey !== storedKey) {
      return new Response("Key not found", {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Return the key as plain text (this is what IndexNow expects)
    return new Response(storedKey, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("IndexNow verify error:", error);
    return new Response("Internal server error", {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }
});
