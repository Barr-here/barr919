// ============================================================
// SUPABASE EDGE FUNCTION: admin-data
// Menangani CRUD (insert/update/delete) untuk products, banners,
// testimonials — hanya bisa dipakai oleh user dengan is_admin = true.
// Verifikasi admin lewat userId + sessionToken (sama seperti auth-user).
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ALLOWED_TABLES = ["products", "banners", "testimonials"];

async function isRequestFromAdmin(userId: string, sessionToken: string): Promise<boolean> {
  if (!userId || !sessionToken) return false;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("is_admin, session_token")
    .eq("id", userId)
    .maybeSingle();

  if (!user) return false;
  if (user.session_token !== sessionToken) return false;
  return user.is_admin === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, table, userId, sessionToken, payload, id } = body;

    if (!action || !table || !ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: "Tabel atau aksi tidak valid" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = await isRequestFromAdmin(userId, sessionToken);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Akses ditolak. Kamu bukan admin atau sesi tidak valid." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // INSERT
    // ========================================================
    if (action === "insert") {
      const { data, error } = await supabaseAdmin.from(table).insert(payload).select();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // UPDATE
    // ========================================================
    if (action === "update") {
      if (!id) {
        return new Response(JSON.stringify({ error: "ID wajib diisi untuk update" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabaseAdmin.from(table).update(payload).eq("id", id).select();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // DELETE
    // ========================================================
    if (action === "delete") {
      if (!id) {
        return new Response(JSON.stringify({ error: "ID wajib diisi untuk delete" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Aksi tidak dikenali" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error: " + err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
