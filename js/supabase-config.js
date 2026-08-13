// ============================================================
// SUPABASE CONFIG
// Ganti 2 nilai di bawah ini dengan punya kamu sendiri.
// Ambil dari: Supabase Dashboard > Project Settings > API
// ============================================================

const SUPABASE_URL = 'https://kejqdongxwxaukpamini.supabase.co'; // contoh: https://xxxxxxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_7UfxOUZWWvU75x855yfYbg_aZRXy1OE';

// Inisialisasi client Supabase (dipakai di index.html & admin.html)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
