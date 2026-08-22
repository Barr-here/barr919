// ============================================================
// SIDE DRAWER NAVIGATION — menggantikan dock-bar bawah
// Dipakai di semua halaman lewat tombol hamburger (topbar atau floating)
// ============================================================

(function () {
  const ICONS = {
    beranda: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 9l9-7 9 7"></path>
      <path d="M9 22V12h6v10"></path>
      <path d="M5 10v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10"></path>
    </svg>`,
    auth: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>`,
    bantuan: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>`
  };

  const MENU_ITEMS = [
    { page: 'beranda', label: 'Beranda', href: 'index.html', icon: ICONS.beranda },
    { page: 'auth', label: 'Profil', href: 'profile.html', icon: ICONS.auth },
    { page: 'bantuan', label: 'Bantuan', href: 'help.html', icon: ICONS.bantuan }
  ];

  const ICON_LOGIN = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
    <polyline points="10 17 15 12 10 7"></polyline>
    <line x1="15" y1="12" x2="3" y2="12"></line>
  </svg>`;

  const ICON_LOGOUT = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>`;

  function isLoggedIn() {
    try {
      const raw = localStorage.getItem('barr_user_session');
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.userId);
    } catch {
      return false;
    }
  }

  function doLogout() {
    // Pakai logoutUser() dari auth-helper.js kalau ada; kalau tidak, fallback manual
    if (typeof window.logoutUser === 'function') {
      window.logoutUser();
    } else {
      localStorage.removeItem('barr_user_session');
      window.location.href = 'index.html';
    }
  }

  function buildDrawerMarkup() {
    const itemsHtml = MENU_ITEMS.map(item => `
      <a href="${item.href}" class="drawer-item" data-page="${item.page}">
        <div class="dock-icon">${item.icon}</div>
        <span>${item.label}</span>
      </a>
    `).join('');

    return `
      <div class="drawer-overlay" id="drawerOverlay"></div>
      <nav class="side-drawer" id="sideDrawer">
        <div class="drawer-header">
          <span class="drawer-title">Menu</span>
          <button class="drawer-close-btn" id="drawerCloseBtn" aria-label="Tutup menu">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="drawer-nav" id="drawerNav"></div>
        <div class="drawer-auth-wrap" id="drawerAuthWrap"></div>
        <div class="drawer-footer">Barr Store &copy; 2026</div>
      </nav>
    `;
  }

  function init() {
    // Suntik markup drawer ke body kalau belum ada
    if (!document.getElementById('sideDrawer')) {
      document.body.insertAdjacentHTML('beforeend', buildDrawerMarkup());
    }

    const overlay = document.getElementById('drawerOverlay');
    const drawer = document.getElementById('sideDrawer');
    const closeBtn = document.getElementById('drawerCloseBtn');
    const nav = document.getElementById('drawerNav');
    const currentPage = document.body.dataset.page || '';

    // Render item menu + tandai yang aktif
    MENU_ITEMS.forEach(item => {
      const el = document.createElement(item.page === 'auth' ? 'div' : 'a');
      el.className = 'drawer-item';
      if (item.page === currentPage) el.classList.add('drawer-active');
      if (el.tagName === 'A') el.href = item.href;
      el.innerHTML = `<div class="dock-icon">${item.icon}</div><span>${item.label}</span>`;

      // Item "Profil" diarahkan via JS (konsisten dengan perilaku dock lama:
      // redirect ke profile.html dari halaman manapun)
      if (item.page === 'auth') {
        el.addEventListener('click', () => {
          window.location.href = item.href;
        });
      }

      nav.appendChild(el);
    });

    // ----- TOMBOL LOGIN / LOGOUT (di atas footer) -----
    const authWrap = document.getElementById('drawerAuthWrap');
    if (authWrap) {
      authWrap.innerHTML = '';
      const loggedIn = isLoggedIn();

      if (loggedIn) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'drawer-auth-btn is-logout';
        btn.innerHTML = `${ICON_LOGOUT}<span>Logout</span>`;
        btn.addEventListener('click', async () => {
          const confirmOpts = {
            icon: 'warning',
            title: 'Logout?',
            text: 'Kamu akan keluar dari akun ini.',
            showCancelButton: true,
            confirmButtonText: 'Iya',
            cancelButtonText: 'Batal',
          };

          if (typeof window.Swal !== 'undefined') {
            const isDark = document.documentElement.classList.contains('dark');
            const result = await window.Swal.fire({
              ...confirmOpts,
              background: isDark ? '#3A2E1F' : '#ffffff',
              color: isDark ? '#F5EEE0' : '#111111',
              confirmButtonColor: isDark ? '#FF8A3D' : '#FFD43B',
              cancelButtonColor: isDark ? '#453626' : '#FFF0D4',
            });
            if (result.isConfirmed) doLogout();
          } else {
            if (window.confirm('Logout? Kamu akan keluar dari akun ini.')) doLogout();
          }
        });
        authWrap.appendChild(btn);
      } else {
        const btn = document.createElement('a');
        btn.href = 'login.html';
        btn.className = 'drawer-auth-btn is-login';
        btn.innerHTML = `${ICON_LOGIN}<span>Login</span>`;
        authWrap.appendChild(btn);
      }
    }

    function openDrawer() {
      overlay.classList.add('open');
      drawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      overlay.classList.remove('open');
      drawer.classList.remove('open');
      document.body.style.overflow = '';
    }

    // Semua tombol hamburger di halaman (topbar dan/atau floating)
    document.querySelectorAll('.hamburger-btn').forEach(btn => {
      btn.addEventListener('click', openDrawer);
    });

    closeBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
