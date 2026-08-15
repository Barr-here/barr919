// ============================================================
// THEME — terapkan tema gelap/terang yang tersimpan ke halaman ini
// Dipakai di semua halaman (index, login, profile, admin) supaya
// pilihan tema konsisten lintas halaman.
// ============================================================

(function () {
  if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark');
  }
})();
