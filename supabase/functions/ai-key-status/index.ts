import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const key = Deno.env.get("LOVABLE_API_KEY");
  const configured = typeof key === "string" && key.trim().length > 0;

  // NEVER return the key itself — only a boolean confirming presence.
  return new Response(
    JSON.stringify({
      configured,
      provider: "Lovable AI Gateway",
      model: "google/gemini-3-flash-preview",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
