// ============================================================
// LOGIN / REGISTER USER — index.html
// Sistem akun sendiri (tabel `users`), OTP dikirim via Gmail
// lewat Supabase Edge Function "auth-user"
// ============================================================

const isDark = document.documentElement.classList.contains('dark');

const swalTheme = {
  background: isDark ? '#3A2E1F' : '#ffffff',
  color: isDark ? '#F5EEE0' : '#111111',
  confirmButtonColor: isDark ? '#FF8A3D' : '#FFD43B',
};

// URL Edge Function — otomatis dibentuk dari SUPABASE_URL yang sudah ada di supabase-config.js
const AUTH_FUNCTION_URL = SUPABASE_URL + '/functions/v1/auth-user';

async function callAuthFunction(payload) {
  const res = await fetch(AUTH_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

// ----- JIKA SUDAH LOGIN, LANGSUNG BALIK KE HALAMAN UTAMA -----
if (localStorage.getItem('barr_user_session')) {
  window.location.href = 'index.html';
}

const authTabs = document.getElementById('authTabs');
const panelLogin = document.getElementById('panel-login');
const panelRegister = document.getElementById('panel-register');
const panelOtp = document.getElementById('panel-otp');

function showPanel(name) {
  [panelLogin, panelRegister, panelOtp].forEach(p => p.classList.remove('active'));
  if (name === 'login') panelLogin.classList.add('active');
  if (name === 'register') panelRegister.classList.add('active');
  if (name === 'otp') panelOtp.classList.add('active');
}

// ----- TAB SWITCH -----
authTabs.querySelectorAll('.auth-tab').forEach(tab => {
  tab.onclick = () => {
    authTabs.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    showPanel(tab.dataset.mode);
  };
});

// ============================================================
// LOGIN
// ============================================================

document.getElementById('loginBtn').onclick = async () => {
  const btn = document.getElementById('loginBtn');
  const errBox = document.getElementById('loginError');
  errBox.textContent = '';

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    errBox.textContent = 'Email dan sandi wajib diisi';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const { ok, data } = await callAuthFunction({ action: 'login', email, password });

  btn.disabled = false;
  btn.textContent = 'Login';

  if (!ok) {
    if (data.error === 'not_verified') {
      pendingEmail = email;
      showPanel('otp');
      return;
    }
    errBox.textContent = data.error || 'Gagal login';
    return;
  }

  localStorage.setItem('barr_user_session', JSON.stringify({
    userId: data.userId,
    email: data.email,
    sessionToken: data.sessionToken,
    isAdmin: data.isAdmin,
    coin: data.coin,
  }));

  Swal.fire({
    icon: 'success',
    title: 'Berhasil login',
    text: 'Selamat datang kembali!',
    timer: 1400,
    showConfirmButton: false,
    ...swalTheme,
  }).then(() => {
    window.location.href = 'index.html';
  });
};

// ============================================================
// REGISTER
// ============================================================

let pendingEmail = '';

document.getElementById('regBtn').onclick = async () => {
  const btn = document.getElementById('regBtn');
  const errBox = document.getElementById('regError');
  errBox.textContent = '';

  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  if (!email || !password) {
    errBox.textContent = 'Email dan sandi wajib diisi';
    return;
  }
  if (password.length < 6) {
    errBox.textContent = 'Sandi minimal 6 karakter';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Memproses...';

  const { ok, data } = await callAuthFunction({ action: 'register', email, password });

  btn.disabled = false;
  btn.textContent = 'Daftar';

  if (!ok) {
    errBox.textContent = data.error || 'Gagal daftar';
    return;
  }

  pendingEmail = email;
  document.getElementById('otpInfo').textContent =
    'Kode verifikasi sudah dikirim ke ' + email + '. Masukkan kodenya di bawah ini.';
  showPanel('otp');
};

// ============================================================
// VERIFIKASI OTP
// ============================================================

document.getElementById('otpBtn').onclick = async () => {
  const btn = document.getElementById('otpBtn');
  const errBox = document.getElementById('otpError');
  errBox.textContent = '';

  const code = document.getElementById('otpCode').value.trim();

  if (!code) {
    errBox.textContent = 'Kode verifikasi wajib diisi';
    return;
  }
  if (!pendingEmail) {
    errBox.textContent = 'Sesi kadaluarsa, silakan login/daftar ulang';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Memverifikasi...';

  const { ok, data } = await callAuthFunction({ action: 'verify-otp', email: pendingEmail, code });

  btn.disabled = false;
  btn.textContent = 'Verifikasi';

  if (!ok) {
    errBox.textContent = data.error || 'Verifikasi gagal';
    return;
  }

  localStorage.setItem('barr_user_session', JSON.stringify({
    userId: data.userId,
    email: pendingEmail,
    sessionToken: data.sessionToken,
    isAdmin: data.isAdmin,
    coin: data.coin,
  }));

  Swal.fire({
    icon: 'success',
    title: 'Akun terverifikasi',
    text: 'Kamu berhasil login!',
    timer: 1400,
    showConfirmButton: false,
    ...swalTheme,
  }).then(() => {
    window.location.href = 'index.html';
  });
};

// ----- KIRIM ULANG KODE -----
document.getElementById('otpResend').onclick = async () => {
  const errBox = document.getElementById('otpError');
  errBox.textContent = '';

  if (!pendingEmail) {
    errBox.textContent = 'Sesi kadaluarsa, silakan login/daftar ulang';
    return;
  }

  const { ok, data } = await callAuthFunction({ action: 'resend-otp', email: pendingEmail });

  if (!ok) {
    errBox.textContent = data.error || 'Gagal kirim ulang';
    return;
  }

  Swal.fire({
    icon: 'info',
    title: 'Kode terkirim',
    text: 'Kode verifikasi baru sudah dikirim ke emailmu.',
    ...swalTheme,
  });
};
