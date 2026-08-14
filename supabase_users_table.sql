-- ============================================================
-- TABEL USERS (sistem login/register sendiri, bukan Supabase Auth)
-- Jalankan di SQL Editor Supabase (New query)
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  is_verified boolean not null default false,
  otp_code text,
  otp_expires_at timestamptz,
  created_at timestamptz default now()
);

alter table users enable row level security;

-- Tidak ada akses langsung dari browser ke tabel ini sama sekali.
-- Semua operasi (daftar, login, verifikasi OTP) HARUS lewat Edge Function,
-- supaya password_hash & otp_code tidak pernah bisa dibaca/ditulis langsung dari frontend.
-- (Makanya sengaja TIDAK dibuat policy select/insert/update publik di sini.)
