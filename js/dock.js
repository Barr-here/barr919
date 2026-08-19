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
    getItems().forEach(el => {
      el.classList.remove('dock-active');
      el.classList.remove('indicator-active');
    });
  
    if (item) {
      item.classList.add('dock-active');
      item.classList.add('indicator-active');
    }
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

  function showIndicator() {
    indicator.classList.add('ready');
  }

  // Gunakan DOMContentLoaded (bukan 'load') supaya indikator muncul
  // secepat mungkin, tidak perlu menunggu gambar/audio/media lain selesai dimuat.
  // Ini yang membuat navigasi terasa "kedip" sebelumnya.
  document.addEventListener('DOMContentLoaded', () => {
    if (startItem && startItem !== activeItem) {
      // Mulai dari posisi lama tanpa animasi, lalu animasikan ke posisi baru
      moveIndicatorTo(startItem, false);
      showIndicator();
      requestAnimationFrame(() => {
        setActive(activeItem);
        moveIndicatorTo(activeItem, true);
      });
    } else {
      // Tidak ada histori pindah, langsung ke posisi aktif tanpa animasi
      setActive(activeItem);
      moveIndicatorTo(activeItem, false);
      showIndicator();
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
        sessionStorage.setItem('dock_from_page', currentPage);
        return;
      }

      if (item !== activeItem) {
        // Tambah indicator-active ke item yang diklik
        item.classList.add('indicator-active');
        setActive(item);
        moveIndicatorTo(item, true);

        setTimeout(() => {
          // Hapus indicator-active dari item yang diklik
          item.classList.remove('indicator-active');
          setActive(activeItem);
          moveIndicatorTo(activeItem, true);
        }, 1500);
      }
    });
  });
})();
