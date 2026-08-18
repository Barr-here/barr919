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
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
          <tr>
            <td style="background:#fff;border:3px solid #111;box-shadow:4px 4px 0 #111;padding:14px 16px;">
              <span style="display:inline-block;background:#FFD83D;border:2px solid #111;padding:3px 9px;font-family:monospace;font-size:11px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:#111;margin-bottom:10px;">Akun ${i + 1}</span>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
                <tr>
                  <td style="font-family:monospace;font-size:12px;color:#555;padding-bottom:2px;">Email/Username</td>
                </tr>
                <tr>
                  <td style="font-family:monospace;font-size:14px;font-weight:700;color:#111;padding-bottom:8px;word-break:break-all;">${acc.email}</td>
                </tr>
                <tr>
                  <td style="font-family:monospace;font-size:12px;color:#555;padding-bottom:2px;">Password</td>
                </tr>
                <tr>
                  <td style="font-family:monospace;font-size:14px;font-weight:700;color:#111;">${acc.password ? acc.password : "(tidak ada / tidak perlu)"}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`
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
      <div style="background:#F3EEE3;padding:24px 16px;font-family:monospace;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;">

          <tr>
            <td style="background:#FFD83D;border:3px solid #111;box-shadow:5px 5px 0 #111;padding:16px 18px;margin-bottom:20px;">
              <span style="font-family:monospace;font-size:20px;font-weight:800;color:#111;letter-spacing:.02em;">BARR STORE</span>
            </td>
          </tr>

          <tr><td style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>

          <tr>
            <td style="background:#fff;border:3px solid #111;box-shadow:5px 5px 0 #111;padding:16px 18px;">
              <span style="font-family:monospace;font-size:13px;color:#111;">
                Terima kasih sudah membeli <b>${productTitle}</b>! Berikut data akun kamu:
              </span>
            </td>
          </tr>

          <tr><td style="height:20px;line-height:20px;font-size:0;">&nbsp;</td></tr>

          <tr>
            <td>${accountListHtml}</td>
          </tr>

          <tr>
            <td style="background:#111;border:3px solid #111;box-shadow:5px 5px 0 #111;padding:14px 16px;">
              <span style="font-family:monospace;font-size:11px;color:#FFD83D;font-weight:700;letter-spacing:.02em;">
                ⚠ SIMPAN DATA INI BAIK-BAIK. JANGAN BERIKAN KE SIAPA PUN.
              </span>
            </td>
          </tr>

        </table>
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

    // ========================================================
    // STOCK INFO — publik, tidak perlu login (dipakai badge di modal beli)
    // ========================================================
    if (action === "stock-info") {
      if (!productId) {
        return new Response(JSON.stringify({ error: "productId wajib diisi" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { count: available } = await supabaseAdmin
        .from("product_accounts")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId)
        .eq("is_used", false);

      const { count: used } = await supabaseAdmin
        .from("product_accounts")
        .select("id", { count: "exact", head: true })
        .eq("product_id", productId)
        .eq("is_used", true);

      return new Response(
        JSON.stringify({ success: true, stock: available || 0, sold: used || 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      let emailSent = false;
      try {
        await sendAccountEmail(user.email, product.title, availableAccounts);
        emailSent = true;
      } catch (emailErr) {
        console.log("Gagal kirim email akun:", emailErr.message);
        // Tidak menggagalkan transaksi kalau email gagal terkirim -- data akun
        // SENGAJA dibiarkan tersimpan di database supaya admin bisa follow up
        // manual lewat notif Telegram di bawah ini.
      }

      // ----- KOSONGKAN KREDENSIAL DARI DATABASE SETELAH TERKIRIM -----
      // Baris tetap disimpan (is_used, used_by_order_id) untuk riwayat/audit,
      // tapi email & password dihapus supaya tidak numpuk di storage Supabase
      // dan tidak ada kredensial lama yang tersisa di server.
      if (emailSent) {
        const { data: clearedRows, error: clearErr } = await supabaseAdmin
          .from("product_accounts")
          .update({ email: null, password: null })
          .in("id", accountIds)
          .select("id");

        if (clearErr) {
          console.log("Gagal kosongkan kredensial:", clearErr.message);
        } else {
          console.log("Kredensial dikosongkan untuk baris:", clearedRows?.length, "dari", accountIds.length);
        }
      }

      // ----- NOTIF TELEGRAM UNTUK ADMIN (info pesanan, bukan data akun) -----
      await sendTelegramNotif(
        `<b>┌─────────────────────┐</b>\n` +
        `<b>│   🛒 PESANAN BARU   │</b>\n` +
        `<b>└─────────────────────┘</b>\n\n` +
        `<b>BARR STORE</b> · otomatis terkirim\n\n` +
        `• <b>Produk</b>\n<code>${product.title}</code>\n\n` +
        `• <b>Email</b>\n<code>${user.email}</code>\n\n` +
        `• <b>Jumlah</b>   ${qty}\n` +
        `• <b>Total</b>     ${totalPrice} coin\n\n` +
        `• <b>Order ID</b>\n<code>${order.id}</code>\n\n` +
        `🕐 ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`
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
