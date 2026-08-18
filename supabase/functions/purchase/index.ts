// ============================================================
// SUPABASE EDGE FUNCTION: purchase
// Menangani pembelian produk pakai coin.
// - Verifikasi sesi user
// - Cek saldo cukup
// - Ambil stok akun (email/password) yang belum terpakai
// - Kalau stok kurang: batalkan SEBELUM potong coin
// - Potong coin, tandai akun terpakai, catat order
// - Kirim data akun ke EMAIL USER, kirim notif info pesanan ke Telegram admin
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

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")!;

async function sendTelegramNotif(message: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.log("Gagal kirim notif Telegram:", err.message);
  }
}

async function sendAccountEmail(toEmail: string, productTitle: string, accounts: { email: string; password: string | null }[]) {
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

  const accountListHtml = accounts
    .map(
      (acc, i) => `
        <div style="padding:10px 0; border-bottom:1px solid #eee;">
          <b>Akun ${i + 1}</b><br>
          Email/Username: <code>${acc.email}</code><br>
          ${acc.password ? `Password: <code>${acc.password}</code>` : "Password: <i>(tidak ada / tidak perlu)</i>"}
        </div>`
    )
    .join("");

  const accountListText = accounts
    .map((acc, i) => `Akun ${i + 1}\nEmail/Username: ${acc.email}\nPassword: ${acc.password || "(tidak ada)"}`)
    .join("\n\n");

  await client.send({
    from: GMAIL_USER,
    to: toEmail,
    subject: `Data Akun ${productTitle} — Barr Store`,
    content: `Terima kasih sudah membeli ${productTitle}!\n\n${accountListText}\n\nSimpan data ini baik-baik.`,
    html: `
      <div style="font-family: monospace; padding: 20px; max-width: 480px;">
        <h2>Barr Store</h2>
        <p>Terima kasih sudah membeli <b>${productTitle}</b>! Berikut data akun kamu:</p>
        ${accountListHtml}
        <p style="color:#666; font-size:13px; margin-top:16px;">Simpan data ini baik-baik. Jangan berikan ke siapa pun.</p>
      </div>
    `,
  });

  await client.close();
}

async function verifySessionUser(userId: string, sessionToken: string) {
  if (!userId || !sessionToken) return null;

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, email, session_token, coin")
    .eq("id", userId)
    .maybeSingle();

  if (!user || user.session_token !== sessionToken) return null;
  return user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, userId, sessionToken, productId, quantity } = body;

    const user = await verifySessionUser(userId, sessionToken);
    if (!user) {
      return new Response(JSON.stringify({ error: "Sesi tidak valid, silakan login ulang" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // CREATE ORDER — beli produk pakai coin
    // ========================================================
    if (action === "create-order") {
      const qty = parseInt(quantity) || 1;

      if (!productId || qty < 1) {
        return new Response(JSON.stringify({ error: "Data pembelian tidak valid" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: product } = await supabaseAdmin
        .from("products")
        .select("id, title, price")
        .eq("id", productId)
        .maybeSingle();

      if (!product) {
        return new Response(JSON.stringify({ error: "Produk tidak ditemukan" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!product.price || product.price <= 0) {
        return new Response(JSON.stringify({ error: "Produk ini belum bisa dibeli lewat coin" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const totalPrice = product.price * qty;

      if ((user.coin || 0) < totalPrice) {
        return new Response(
          JSON.stringify({ error: `Coin tidak cukup. Kamu punya ${user.coin || 0}, butuh ${totalPrice}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ----- CEK STOK AKUN SEBELUM POTONG COIN -----
      const { data: availableAccounts } = await supabaseAdmin
        .from("product_accounts")
        .select("id, email, password")
        .eq("product_id", productId)
        .eq("is_used", false)
        .limit(qty);

      if (!availableAccounts || availableAccounts.length < qty) {
        return new Response(
          JSON.stringify({ error: "Stok akun untuk produk ini sedang habis. Silakan hubungi admin." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const newCoin = user.coin - totalPrice;

      // ----- POTONG COIN -----
      const { error: updateErr } = await supabaseAdmin
        .from("users")
        .update({ coin: newCoin })
        .eq("id", user.id);

      if (updateErr) {
        return new Response(JSON.stringify({ error: "Gagal memproses pembayaran: " + updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ----- CATAT ORDER -----
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: product.id,
          product_title: product.title,
          quantity: qty,
          price_per_unit: product.price,
          total_price: totalPrice,
          status: "completed",
        })
        .select()
        .single();

      if (orderErr) {
        // Rollback coin kalau gagal catat order
        await supabaseAdmin.from("users").update({ coin: user.coin }).eq("id", user.id);
        return new Response(JSON.stringify({ error: "Gagal mencatat pesanan: " + orderErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ----- TANDAI AKUN SEBAGAI TERPAKAI -----
      const accountIds = availableAccounts.map((a) => a.id);
      await supabaseAdmin
        .from("product_accounts")
        .update({ is_used: true, used_by_order_id: order.id })
        .in("id", accountIds);

      // ----- KIRIM DATA AKUN KE EMAIL USER -----
      try {
        await sendAccountEmail(user.email, product.title, availableAccounts);
      } catch (emailErr) {
        console.log("Gagal kirim email akun:", emailErr.message);
        // Tidak menggagalkan transaksi kalau email gagal terkirim -- data tetap aman di database,
        // admin bisa follow up manual lewat notif Telegram di bawah ini.
      }

      // ----- NOTIF TELEGRAM UNTUK ADMIN (info pesanan, bukan data akun) -----
      await sendTelegramNotif(
        `🛒 <b>Pesanan Baru (Otomatis Terkirim)</b>\n\n` +
        `📧 Email: <code>${user.email}</code>\n` +
        `📦 Produk: ${product.title}\n` +
        `🔢 Jumlah: ${qty}\n` +
        `🪙 Total: ${totalPrice} coin\n` +
        `🧾 Order ID: <code>${order.id}</code>\n` +
        `🕐 Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`
      );

      return new Response(
        JSON.stringify({ success: true, orderId: order.id, coin: newCoin }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================
    // HISTORY — riwayat pesanan user
    // ========================================================
    if (action === "history") {
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("id, product_title, quantity, price_per_unit, total_price, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ success: true, orders: orders || [] }), {
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
