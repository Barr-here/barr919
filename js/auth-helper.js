// ============================================================
// AUTH HELPER — dipakai di index.html, admin.html, profile.html
// Cek status login user lewat Edge Function (verifikasi sesi asli,
// bukan cuma percaya localStorage begitu saja)
// ============================================================

function getLocalSession() {
  const raw = localStorage.getItem('barr_user_session');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearLocalSession() {
  localStorage.removeItem('barr_user_session');
}

// Verifikasi sesi ke server (memastikan sessionToken masih valid & ambil data terbaru)
async function verifySession() {
  const local = getLocalSession();
  if (!local || !local.userId || !local.sessionToken) return null;

  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/auth-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: 'get-profile',
        userId: local.userId,
        sessionToken: local.sessionToken,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      clearLocalSession();
      return null;
    }

    // Update localStorage dengan data terbaru (coin/admin bisa berubah)
    localStorage.setItem('barr_user_session', JSON.stringify({
      ...local,
      email: data.email,
      isAdmin: data.isAdmin,
      coin: data.coin,
    }));

    return { ...local, email: data.email, isAdmin: data.isAdmin, coin: data.coin };
  } catch {
    return null;
  }
}

function logoutUser() {
  clearLocalSession();
  window.location.href = 'index.html';
}
