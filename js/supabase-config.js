// ============================================================
// SUPABASE CONFIG
// Ganti 2 nilai di bawah ini dengan punya kamu sendiri.
// Ambil dari: Supabase Dashboard > Project Settings > API
// ============================================================

const SUPABASE_URL = 'GANTI_DENGAN_PROJECT_URL_KAMU'; // contoh: https://xxxxxxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = 'GANTI_DENGAN_ANON_PUBLIC_KEY_KAMU';

// Inisialisasi client Supabase (dipakai di index.html & admin.html)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
