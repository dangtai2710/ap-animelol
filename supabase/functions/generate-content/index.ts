import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, movieTitle, movieDescription, apiKey, model, temperature } = await req.json();

    console.log("Generate content request:", { movieTitle, model, hasApiKey: !!apiKey });

    // Validate required fields
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API Key chưa được cấu hình. Vui lòng nhập API Key trong trang Content AI." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Replace variables in prompt
    let processedPrompt = prompt
      .replace(/{post_title}/g, movieTitle || "")
      .replace(/{post_content}/g, movieDescription || "");

    console.log("Processed prompt:", processedPrompt.slice(0, 200));

    // Call OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an assistant that writes SEO-optimized movie descriptions in Vietnamese. Use HTML tags like H2, H3, H4 for structure. Do not include links or images.",
          },
          {
            role: "user",
            content: processedPrompt,
          },
        ],
        temperature: parseFloat(temperature) || 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "API Key không hợp lệ. Vui lòng kiểm tra lại." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Đã vượt quá giới hạn API. Vui lòng thử lại sau." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `Lỗi từ OpenAI: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      console.error("No content in response:", data);
      return new Response(
        JSON.stringify({ error: "Không nhận được nội dung từ AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Remove markdown code block wrappers if present
    generatedContent = generatedContent
      .replace(/^```html\s*/i, '')
      .replace(/^```\s*/gm, '')
      .replace(/\s*```$/g, '')
      .trim();

    console.log("Content generated successfully, length:", generatedContent.length);

    return new Response(
      JSON.stringify({ 
        content: generatedContent,
        usage: data.usage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in generate-content:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
