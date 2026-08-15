// ============================================================
// DOCK NAVIGATION — sliding indicator, animasi lintas halaman
// Dipakai di semua halaman yang punya .dock-bar
// ============================================================

(function () {
  const dockBar = document.getElementById('dockBar');
  const indicator = document.getElementById('dockIndicator');
  if (!dockBar || !indicator) return;

  function getItems() {
    return Array.from(dockBar.querySelectorAll('.dock-item'));
  }

  function moveIndicatorTo(item, animate) {
    if (!item) return;
    const barRect = dockBar.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const left = itemRect.left - barRect.left - 6; // dikurangi padding dockBar
    const width = itemRect.width;

    if (!animate) indicator.style.transition = 'none';
    indicator.style.width = width + 'px';
    indicator.style.transform = `translateX(${left}px)`;

    if (!animate) {
      // paksa reflow supaya transition:none diterapkan sebelum dikembalikan
      indicator.offsetHeight;
      indicator.style.transition = '';
    }
  }

  function setActive(item) {
    getItems().forEach(el => el.classList.remove('dock-active'));
    if (item) item.classList.add('dock-active');
  }

  // ----- TENTUKAN ITEM AKTIF BERDASARKAN HALAMAN SAAT INI -----
  const currentPage = document.body.dataset.page || '';
  const items = getItems();
  const activeItem = items.find(el => el.dataset.page === currentPage) || null;

  // ----- CEK APAKAH ADA POSISI SEBELUMNYA (dari klik di halaman lain) -----
  const savedPage = sessionStorage.getItem('dock_from_page');
  const startItem = savedPage
    ? items.find(el => el.dataset.page === savedPage)
    : null;

  window.addEventListener('load', () => {
    if (startItem && startItem !== activeItem) {
      // Mulai dari posisi lama tanpa animasi, lalu animasikan ke posisi baru
      moveIndicatorTo(startItem, false);
      requestAnimationFrame(() => {
        setActive(activeItem);
        moveIndicatorTo(activeItem, true);
      });
    } else {
      // Tidak ada histori pindah, langsung ke posisi aktif tanpa animasi
      setActive(activeItem);
      moveIndicatorTo(activeItem, false);
    }
    sessionStorage.removeItem('dock_from_page');
  });

  // Reposisi kalau ukuran layar berubah (misal rotate)
  window.addEventListener('resize', () => {
    moveIndicatorTo(dockBar.querySelector('.dock-active'), false);
  });

  // Expose supaya bisa dipanggil manual dari script lain (misal setelah label dock berubah dinamis)
  window.repositionDockIndicator = function () {
    moveIndicatorTo(dockBar.querySelector('.dock-active'), true);
  };

  // ----- KLIK DOCK ITEM -----
  items.forEach(item => {
    item.addEventListener('click', () => {
      if (item.tagName === 'A' && item.href) {
        // Item ini pindah halaman -> simpan posisi asal buat animasi di halaman tujuan
        sessionStorage.setItem('dock_from_page', currentPage);
        return;
      }

      // Item ini TIDAK pindah halaman (misal "Bantuan" yang cuma munculkan popup)
      // -> geser indikator ke situ secara instan di halaman yang sama,
      //    lalu kembalikan ke item halaman aktif setelah sesaat.
      if (item !== activeItem) {
        setActive(item);
        moveIndicatorTo(item, true);

        setTimeout(() => {
          setActive(activeItem);
          moveIndicatorTo(activeItem, true);
        }, 1500);
      }
    });
  });

  // ----- HANDLER KHUSUS "BANTUAN" (berlaku di semua halaman, taruh di sini biar gak duplikat) -----
  const dockBantuan = document.getElementById('dockBantuan');
  if (dockBantuan) {
    dockBantuan.addEventListener('click', () => {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'info',
          title: 'Segera Hadir',
          text: 'Tutorial auto order akan tersedia di sini.',
        });
      } else {
        alert('Segera Hadir: Tutorial auto order akan tersedia di sini.');
      }
    });
  }
})();
