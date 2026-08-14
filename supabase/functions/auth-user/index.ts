// ============================================================
// SUPABASE EDGE FUNCTION: auth-user
// Menangani: register, login, verify-otp, resend-otp
// Kirim email OTP lewat Gmail (SMTP dengan App Password)
// ============================================================

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")!;

// ----- HELPER: hash password sederhana pakai Web Crypto (SHA-256 + salt tetap) -----
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "barr-store-salt-v1");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(toEmail: string, code: string) {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: {
        username: GMAIL_USER,
        password: GMAIL_APP_PASSWORD,
      },
    },
  });

  await client.send({
    from: GMAIL_USER,
    to: toEmail,
    subject: "Kode Verifikasi — Barr Store",
    content: `Kode verifikasi kamu adalah: ${code}\n\nKode ini berlaku 10 menit. Jangan berikan kode ini ke siapa pun.`,
    html: `
      <div style="font-family: monospace; padding: 20px; max-width: 400px;">
        <h2>Barr Store</h2>
        <p>Kode verifikasi kamu adalah:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px 0;">${code}</div>
        <p style="color: #666; font-size: 13px;">Kode ini berlaku 10 menit. Jangan berikan kode ini ke siapa pun.</p>
      </div>
    `,
  });

  await client.close();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, email, password, code } = await req.json();

    if (!action || !email) {
      return new Response(JSON.stringify({ error: "Data tidak lengkap" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // ========================================================
    // REGISTER
    // ========================================================
    if (action === "register") {
      if (!password || password.length < 6) {
        return new Response(JSON.stringify({ error: "Sandi minimal 6 karakter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existing } = await supabaseAdmin
        .from("users")
        .select("id, is_verified")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (existing && existing.is_verified) {
        return new Response(JSON.stringify({ error: "Email sudah terdaftar" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const passwordHash = await hashPassword(password);
      const otpCode = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      if (existing) {
        // Email pernah daftar tapi belum verifikasi -> update
        await supabaseAdmin
          .from("users")
          .update({ password_hash: passwordHash, otp_code: otpCode, otp_expires_at: otpExpiresAt })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("users").insert({
          email: cleanEmail,
          password_hash: passwordHash,
          otp_code: otpCode,
          otp_expires_at: otpExpiresAt,
          is_verified: false,
        });
      }

      await sendOtpEmail(cleanEmail, otpCode);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // VERIFY OTP
    // ========================================================
    if (action === "verify-otp") {
      if (!code) {
        return new Response(JSON.stringify({ error: "Kode wajib diisi" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id, otp_code, otp_expires_at")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (!user) {
        return new Response(JSON.stringify({ error: "Akun tidak ditemukan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!user.otp_code || user.otp_code !== code) {
        return new Response(JSON.stringify({ error: "Kode verifikasi salah" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(user.otp_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Kode sudah kadaluarsa, minta kode baru" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin
        .from("users")
        .update({ is_verified: true, otp_code: null, otp_expires_at: null })
        .eq("id", user.id);

      return new Response(JSON.stringify({ success: true, userId: user.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // RESEND OTP
    // ========================================================
    if (action === "resend-otp") {
      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (!user) {
        return new Response(JSON.stringify({ error: "Akun tidak ditemukan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const otpCode = generateOtp();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await supabaseAdmin
        .from("users")
        .update({ otp_code: otpCode, otp_expires_at: otpExpiresAt })
        .eq("id", user.id);

      await sendOtpEmail(cleanEmail, otpCode);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // LOGIN
    // ========================================================
    if (action === "login") {
      if (!password) {
        return new Response(JSON.stringify({ error: "Sandi wajib diisi" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: user } = await supabaseAdmin
        .from("users")
        .select("id, email, password_hash, is_verified")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (!user) {
        return new Response(JSON.stringify({ error: "Email atau sandi salah" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const passwordHash = await hashPassword(password);
      if (passwordHash !== user.password_hash) {
        return new Response(JSON.stringify({ error: "Email atau sandi salah" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!user.is_verified) {
        return new Response(JSON.stringify({ error: "not_verified" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Buat token sesi sederhana
      const sessionToken = crypto.randomUUID();

      return new Response(
        JSON.stringify({ success: true, userId: user.id, email: user.email, sessionToken }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
