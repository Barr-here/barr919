// ============================================================
// SUPABASE EDGE FUNCTION: deposit
// Menangani: create (bikin QRIS), check-status (polling), history
// Integrasi Pakasir untuk pembayaran QRIS
// Rate: 1 coin = Rp1.000, maksimal 50 coin per transaksi
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

const PAKASIR_SLUG = Deno.env.get("PAKASIR_SLUG")!;
const PAKASIR_APIKEY = Deno.env.get("PAKASIR_APIKEY")!;

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

const COIN_TO_RUPIAH = 1000;
const MAX_COIN_PER_DEPOSIT = 50;

// ----- HELPER: kirim notifikasi ke Telegram (gagal kirim tidak boleh menggagalkan proses utama) -----
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
    const { action, userId, sessionToken, coinAmount, orderId } = body;

    const user = await verifySessionUser(userId, sessionToken);
    if (!user) {
      return new Response(JSON.stringify({ error: "Sesi tidak valid, silakan login ulang" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // CREATE — bikin transaksi QRIS baru
    // ========================================================
    if (action === "create") {
      if (!coinAmount || coinAmount < 1 || coinAmount > MAX_COIN_PER_DEPOSIT) {
        return new Response(
          JSON.stringify({ error: `Jumlah coin harus antara 1 - ${MAX_COIN_PER_DEPOSIT}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rupiahAmount = coinAmount * COIN_TO_RUPIAH;
      const newOrderId = `${PAKASIR_SLUG}-${Date.now()}`;

      let pakasirRes;
      let pakasirRawText = "";
      try {
        const fetchRes = await fetch("https://app.pakasir.com/api/transactioncreate/qris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project: PAKASIR_SLUG,
            order_id: newOrderId,
            amount: rupiahAmount,
            api_key: PAKASIR_APIKEY,
          }),
        });

        pakasirRawText = await fetchRes.text();
        pakasirRes = JSON.parse(pakasirRawText);
        console.log("Pakasir create response:", pakasirRawText);
      } catch (fetchErr) {
        return new Response(
          JSON.stringify({
            error: "Gagal menghubungi Pakasir: " + fetchErr.message,
            rawResponse: pakasirRawText?.slice(0, 300),
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!pakasirRes?.payment) {
        return new Response(
          JSON.stringify({
            error: "Gagal membuat transaksi QRIS: " + (pakasirRes?.message || pakasirRes?.error || "Response tidak dikenali"),
            pakasirResponse: pakasirRes,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const payment = pakasirRes.payment;

      // Pakasir kadang menamai field QR-nya berbeda (payment_number / qr_string / qris_string).
      // Ambil yang tersedia, dan gagalkan lebih awal kalau semuanya kosong supaya
      // errornya jelas di sini, bukan pas frontend coba generate QR code.
      const qrValue = payment.payment_number || payment.qr_string || payment.qris_string;

      if (!qrValue) {
        return new Response(
          JSON.stringify({
            error: "Pakasir tidak mengirim data QR (payment_number kosong)",
            pakasirResponse: pakasirRes,
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabaseAdmin.from("deposits").insert({
        user_id: user.id,
        order_id: newOrderId,
        coin_amount: coinAmount,
        rupiah_amount: rupiahAmount,
        status: "pending",
        payment_number: qrValue,
      });

      return new Response(
        JSON.stringify({
          success: true,
          orderId: newOrderId,
          paymentNumber: qrValue,
          totalPayment: payment.total_payment ?? rupiahAmount,
          rupiahAmount,
          coinAmount,
          expiresInSeconds: 600,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================================
    // CANCEL — user batalkan transaksi secara manual
    // ========================================================
    if (action === "cancel") {
      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId wajib diisi" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: deposit } = await supabaseAdmin
        .from("deposits")
        .select("*")
        .eq("order_id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!deposit) {
        return new Response(JSON.stringify({ error: "Transaksi tidak ditemukan" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (deposit.status === "pending") {
        try {
          await fetch("https://app.pakasir.com/api/transactioncancel", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              project: PAKASIR_SLUG,
              order_id: orderId,
              amount: deposit.rupiah_amount,
              api_key: PAKASIR_APIKEY,
            }),
          });
        } catch (cancelErr) {
          // Tetap lanjut update status walau request cancel ke Pakasir gagal
          console.log("Gagal cancel ke Pakasir:", cancelErr.message);
        }

        await supabaseAdmin.from("deposits").update({ status: "cancelled" }).eq("id", deposit.id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // CHECK STATUS — polling status pembayaran
    // ========================================================
    if (action === "check-status") {
      if (!orderId) {
        return new Response(JSON.stringify({ error: "orderId wajib diisi" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: deposit } = await supabaseAdmin
        .from("deposits")
        .select("*")
        .eq("order_id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!deposit) {
        return new Response(JSON.stringify({ error: "Transaksi tidak ditemukan" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Kalau sudah selesai diproses sebelumnya, langsung balikin statusnya
      if (deposit.status !== "pending") {
        return new Response(
          JSON.stringify({ success: true, status: deposit.status, coin: user.coin }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pakasirRes = await fetch(
        `https://app.pakasir.com/api/transactiondetail?project=${PAKASIR_SLUG}&amount=${deposit.rupiah_amount}&order_id=${orderId}&api_key=${PAKASIR_APIKEY}`
      ).then((r) => r.json());

      const trxStatus = pakasirRes?.transaction?.status;

      if (trxStatus === "completed") {
        // Tambahkan coin ke user, tandai deposit selesai
        const newCoin = (user.coin || 0) + deposit.coin_amount;

        await supabaseAdmin.from("users").update({ coin: newCoin }).eq("id", user.id);
        await supabaseAdmin
          .from("deposits")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", deposit.id);

        await sendTelegramNotif(
          `💰 <b>Deposit Berhasil</b>\n\n` +
          `📧 Email: <code>${user.email}</code>\n` +
          `🪙 Coin: +${deposit.coin_amount} (total: ${newCoin})\n` +
          `💵 Rupiah: Rp${deposit.rupiah_amount.toLocaleString("id-ID")}\n` +
          `🧾 Order ID: <code>${orderId}</code>\n` +
          `🕐 Waktu: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`
        );

        return new Response(
          JSON.stringify({ success: true, status: "completed", coin: newCoin }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cek kadaluarsa (10 menit)
      const createdAt = new Date(deposit.created_at).getTime();
      if (Date.now() - createdAt > 10 * 60 * 1000) {
        await fetch("https://app.pakasir.com/api/transactioncancel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project: PAKASIR_SLUG,
            order_id: orderId,
            amount: deposit.rupiah_amount,
            api_key: PAKASIR_APIKEY,
          }),
        });

        await supabaseAdmin.from("deposits").update({ status: "expired" }).eq("id", deposit.id);

        return new Response(JSON.stringify({ success: true, status: "expired" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, status: "pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // HISTORY — riwayat deposit user
    // ========================================================
    if (action === "history") {
      const { data: deposits } = await supabaseAdmin
        .from("deposits")
        .select("order_id, coin_amount, rupiah_amount, status, created_at, completed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      return new Response(JSON.stringify({ success: true, deposits: deposits || [] }), {
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
