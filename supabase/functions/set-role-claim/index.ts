import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { initializeApp, cert, getApps } from "npm:firebase-admin/app";
import { getAuth } from "npm:firebase-admin/auth";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: Deno.env.get("FIREBASE_PROJECT_ID")!,
      clientEmail: Deno.env.get("FIREBASE_CLIENT_EMAIL")!,
      privateKey: Deno.env.get("FIREBASE_PRIVATE_KEY")!.replace(/\\n/g, "\n"),
    }),
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Browser sends this automatically before the real POST — must answer it directly
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { uid } = await req.json();
    if (!uid) {
      return new Response("Missing uid", { status: 400, headers: corsHeaders });
    }

    await getAuth().setCustomUserClaims(uid, { role: "authenticated" });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("set-role-claim failed:", err);
    return new Response("Failed to set role claim", { status: 500, headers: corsHeaders });
  }
});