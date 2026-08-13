// ============================================================
// LOGIN / REGISTER USER — index.html
// ============================================================

const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const swalTheme = {
  background: isDark ? '#0f1923' : '#ffffff',
  color: isDark ? '#e8f4fb' : '#0d1b2a',
  confirmButtonColor: isDark ? '#00ccff' : '#00aadd',
};

// ----- JIKA SUDAH LOGIN, LANGSUNG BALIK KE HALAMAN UTAMA -----
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = 'index.html';
  }
})();

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

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = 'Login';

  if (error) {
    // Jika akun belum diverifikasi, arahkan ke step OTP
    if (error.message && error.message.toLowerCase().includes('confirm')) {
      pendingEmail = email;
      showPanel('otp');
      return;
    }
    errBox.textContent = 'Gagal login: ' + error.message;
    return;
  }

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

  const { error } = await supabaseClient.auth.signUp({ email, password });

  btn.disabled = false;
  btn.textContent = 'Daftar';

  if (error) {
    errBox.textContent = 'Gagal daftar: ' + error.message;
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

  const { error } = await supabaseClient.auth.verifyOtp({
    email: pendingEmail,
    token: code,
    type: 'signup',
  });

  btn.disabled = false;
  btn.textContent = 'Verifikasi';

  if (error) {
    errBox.textContent = 'Verifikasi gagal: ' + error.message;
    return;
  }

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

  const { error } = await supabaseClient.auth.resend({
    type: 'signup',
    email: pendingEmail,
  });

  if (error) {
    errBox.textContent = 'Gagal kirim ulang: ' + error.message;
    return;
  }

  Swal.fire({
    icon: 'info',
    title: 'Kode terkirim',
    text: 'Kode verifikasi baru sudah dikirim ke emailmu.',
    ...swalTheme,
  });
};
