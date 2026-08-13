// ============================================================
// QRIS POPUP
// ============================================================

const qrisPopup =
  document.getElementById('qrisPopup');

const closeQris =
  document.getElementById('closeQris');

closeQris.onclick = () => {

  qrisPopup.classList.remove('show');

};

qrisPopup.onclick = (e) => {

  if (e.target === qrisPopup) {

    qrisPopup.classList.remove('show');

  }

};

// ============================================================
// DONASI POPUP
// ============================================================

const donasiPopup = document.getElementById('donasiPopup');

document.getElementById('openDonasi').onclick = () => {
  donasiPopup.classList.add('show');
  document.body.style.overflow = 'hidden';
};

donasiPopup.onclick = (e) => {
  if (e.target === donasiPopup) {
    donasiPopup.classList.remove('show');
    document.body.style.overflow = '';
  }
};

document.getElementById('openQrisFromDonasi').onclick = () => {
  donasiPopup.classList.remove('show');
  qrisPopup.classList.add('show');
};

// ============================================================
// MUSIC TOGGLE
// ============================================================

const musicBtn = document.getElementById('musicBtn');
const bgMusic = document.getElementById('bgMusic');

let playing = false;

musicBtn.onclick = () => {

  if (playing) {
    bgMusic.pause();
    musicBtn.textContent = '🎵';
  } else {
    bgMusic.play();
    musicBtn.textContent = '🔊';
  }

  playing = !playing;

};

// ============================================================
// TESTIMONI
// ============================================================

supabaseClient
  .from('testimonials')
  .select('*')
  .order('sort_order', { ascending: true })
  .then(({ data: testimonials, error }) => {

    const testiSlider =
      document.getElementById(
        'testiSlider'
      );

    // Hapus skeleton loading
    testiSlider.innerHTML = '';

    if (error) {
      console.error('Gagal ambil testimoni:', error);
      testiSlider.innerHTML = '<div class="load-empty-msg"><span class="empty-icon">⚠️</span>Gagal memuat testimoni. Coba refresh halaman.</div>';
      return;
    }

    if (!testimonials || testimonials.length === 0) {
      testiSlider.innerHTML = '<div class="load-empty-msg"><span class="empty-icon">💬</span>Belum ada testimoni.</div>';
      return;
    }

    testimonials.forEach(item => {

      testiSlider.innerHTML += `

        <div class="testi-card">

          <img
            class="testi-img"
            src="${item.image}"
            loading="lazy"
            draggable="false"
          >

          <div class="testi-content">
            <div class="testi-meta">
              <div class="testi-date">
                ${item.date}
              </div>
              <button
                class="like-btn"
                data-id="${item.id}"
              > ♥ </button>
            </div>

            <div class="testi-name">
              #${item.sort_order} ${item.title}
            </div>

            <div class="testi-desc">
              ${item.description}
            </div>

          </div>

        </div>

      `;

    });

    /* OPEN */
    document
    .getElementById('openTesti')
    .onclick = () => {
      document
      .getElementById('testiOverlay')
      .classList.add('show');
      document.body.style.overflow = 'hidden';
    };

    /* CLOSE */
    document
    .getElementById('closeTesti')
    .onclick = () => {
      document
      .getElementById('testiOverlay')
      .classList.remove('show');
      document.body.style.overflow = '';
    };

    document
    .querySelectorAll('.like-btn')
    .forEach(btn => {

      const id = btn.dataset.id;
      let liked = localStorage.getItem('liked_' + id) === 'true';
      btn.classList.toggle('liked', liked);

      btn.onclick = () => {
        liked = !liked;
        localStorage.setItem('liked_' + id, liked);
        btn.classList.toggle('liked', liked);
        btn.classList.remove('pop');
        void btn.offsetWidth; 
        btn.classList.add('pop');
      };
    });
  });


// ============================================================
// BANNER
// ============================================================

supabaseClient
  .from('banners')
  .select('*')
  .order('sort_order', { ascending: true })
  .then(({ data: banners, error }) => {

    const bannerTrack = document.getElementById('bannerTrack');

    // Hapus skeleton loading
    bannerTrack.innerHTML = '';

    if (error) {
      console.error('Gagal ambil banner:', error);
      bannerTrack.innerHTML = '<div class="load-empty-msg"><span class="empty-icon">⚠️</span>Gagal memuat banner. Coba refresh halaman.</div>';
      return;
    }

    if (!banners || banners.length === 0) {
      bannerTrack.innerHTML = '<div class="load-empty-msg"><span class="empty-icon">🖼️</span>Belum ada banner.</div>';
      return;
    }

    banners.forEach(item => {

      bannerTrack.innerHTML += `

        <div
          class="banner-card"
          data-title="${item.title}"
          data-wa="${item.wa}"
          data-tele="${item.tele}"
        >
  
          <div class="banner-image-wrap">

            <img
              class="banner-image"
              src="${item.image}"
              alt="${item.title}"
              loading="lazy"
              draggable="false"
            >

          </div>

          <div class="banner-content">

            <div class="banner-title">
              ${item.title}
            </div>

            <div class="banner-desc">
              ${item.description}
            </div>
          </div>
        </div>
      `;
    });
    
    
    document.addEventListener('contextmenu', (e) => {

      if (e.target.closest('.banner-card')) {
        e.preventDefault();
      }

    });
  
    /* AUTO SCROLL */
    let autoScroll = setInterval(() => {

      bannerTrack.scrollBy({
        left: 260,
        behavior: 'smooth'
      });

      if (
        bannerTrack.scrollLeft +
        bannerTrack.clientWidth >=
        bannerTrack.scrollWidth - 10
      ) {

        bannerTrack.scrollTo({
          left: 0,
          behavior: 'smooth'
        });

      }

    }, 5000);
    
    const bannerPopupOverlay =
      document.getElementById(
        'bannerPopupOverlay'
      );
    
    const popupTitle =
      document.getElementById(
        'popupTitle'
      );
      
    const popupWa =
      document.getElementById(
        'popupWa'
      );

    const popupTele =
      document.getElementById(
        'popupTele'
      );
      
    // buka popup
    document.querySelectorAll('.banner-card')
    .forEach(card => {

      card.addEventListener('click', () => {
        popupTitle.textContent = card.dataset.title;
        popupWa.href = card.dataset.wa;
        popupTele.href = card.dataset.tele;
        bannerPopupOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
      });

    });
    
    // klik luar popup = tutup
    bannerPopupOverlay
    .addEventListener('click', (e) => {
      if (e.target === bannerPopupOverlay) {
        bannerPopupOverlay.classList.remove('show');
        document.body.style.overflow = '';
      }
    });

  });


// ============================================================
// PRODUCTS
// ============================================================

supabaseClient
  .from('products')
  .select('*')
  .order('sort_order', { ascending: true })
  .then(({ data: products, error }) => {

    // Hapus skeleton loading produk (tanpa ganggu card statis lain)
    const skeleton1 = document.getElementById('productSkeleton');
    const skeleton2 = document.getElementById('productSkeleton2');
    if (skeleton1) skeleton1.remove();
    if (skeleton2) skeleton2.remove();

    if (error) {
      console.error('Gagal ambil products:', error);
      document.getElementById('endpointList').insertAdjacentHTML(
        'beforeend',
        '<div class="load-empty-msg"><span class="empty-icon">⚠️</span>Gagal memuat produk. Coba refresh halaman.</div>'
      );
      return;
    }

    const endpointList = document.getElementById('endpointList');
    
    products.forEach(item => {
    
      endpointList.innerHTML += `
  
      <div class="card expandable" data-name="${item.type.toLowerCase()}">

        <div class="card-top">
          <div class="methods">
            <span class="method-tag product">${item.type}</span>
          </div>
          <span class="chevron">›</span>
        </div>

        <div class="endpoint-path">${item.title}</div>

        <div class="endpoint-desc">
          ${item.description}
        </div>

        <div class="expand-content">
          <div class="expand-box">

            <div class="expand-buttons">

              <a class="expand-btn wa"
                 href="${item.wa}"
                 target="_blank">
                WhatsApp
              </a>

              <a class="expand-btn tele"
                 href="${item.tele}"
                 target="_blank">
                Telegram
              </a>

            </div>

            <div class="expand-footer">
              ${item.content}
            </div>

          </div>
        </div>
      </div>
  
      `;
    });

    // expandable cards (harus setelah render)
    document.querySelectorAll('.expandable').forEach(card => {

      card.addEventListener('click', (e) => {

        if (e.target.closest('a')) return;

        // tutup product lain
        document.querySelectorAll('.expandable').forEach(other => {
  
          if (other !== card) {
            other.classList.remove('active');
          }

        });

        // buka/tutup current
        card.classList.toggle('active');
  
      });
    });

    // update search count setelah produk di-render
    countBadge.textContent = document.querySelectorAll('.card').length + ' Kategori';
    buildTags();

  });


// ============================================================
// THEME TOGGLE
// ============================================================

const btn = document.getElementById('themeBtn');

// load theme tersimpan
if (localStorage.getItem('theme') === 'dark') {

  document.body.classList.add('dark');

  btn.textContent = '☀️';

} else {

  btn.textContent = '🌙';

}

// toggle theme
btn.onclick = () => {

  document.body.classList.toggle('dark');

  const dark = document.body.classList.contains('dark');

  btn.textContent = dark ? '☀️' : '🌙';

  // simpan theme
  localStorage.setItem('theme', dark ? 'dark' : 'light');

};

// Theme popup
const themePopup = document.getElementById('themePopup');

function showThemePopup() {

  // cuma tampil di mode terang
  if (document.body.classList.contains('dark')) return;

  themePopup.classList.add('show');

  setTimeout(() => {
    themePopup.classList.remove('show');
  }, 4000);

}

// tampil pertama kali
setTimeout(showThemePopup, 2000);

// ulang tiap 15 detik
setInterval(showThemePopup, 15000);


// ============================================================
// LOGIN HINT POPUP (tampil 1x saja)
// ============================================================

const loginHintPopup = document.getElementById('loginHintPopup');

if (loginHintPopup && !localStorage.getItem('loginHintShown')) {

  setTimeout(() => {
    loginHintPopup.classList.add('show');

    setTimeout(() => {
      loginHintPopup.classList.remove('show');
    }, 4500);

    localStorage.setItem('loginHintShown', 'true');
  }, 6000);

}


// ============================================================
// SEARCH
// ============================================================

const searchInput = document.getElementById('searchInput');
const countBadge = document.getElementById('countBadge');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase().trim();
  const cards = document.querySelectorAll('.card');
  let visible = 0;
  cards.forEach(card => {
    const title = card.querySelector('.endpoint-path')?.textContent || '';
    const tag = card.querySelector('.method-tag')?.textContent || '';
    const text = (title + ' ' + tag).toLowerCase();
    const match = !q || text.includes(q);
    card.classList.toggle('hidden', !match);
    if (match) visible++;
  });
  countBadge.textContent = visible + ' Kategori' + (visible !== 1 ? 's' : '');
});


// ============================================================
// COPY POPUP
// ============================================================

// ============================================================
// COPY POPUP (SweetAlert2)
// ============================================================

document.addEventListener('click', (e) => {
  const card = e.target.closest('.copy-card');
  if (!card) return;

  e.preventDefault();

  const url = card.getAttribute('data-copy');
  const input = document.createElement('input');
  input.value = url;
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, 99999);
  const copied = document.execCommand('copy');
  document.body.removeChild(input);

  if (copied) {
    Swal.fire({
      title: 'Berhasil!',
      text: 'Tautan berhasil disalin',
      icon: 'success',
      confirmButtonText: 'Oke',
      width: 320
    });
  } else {
    Swal.fire({
      title: 'Gagal!',
      text: 'Gagal menyalin tautan',
      icon: 'error',
      confirmButtonText: 'Oke',
      width: 320
    });
  }
});


// ============================================================
// TAGS POPUP
// ============================================================

const openTags = document.getElementById('openTags');
const tagsPopup = document.getElementById('tagsPopup');
const tagsOverlay = document.getElementById('tagsOverlay');
const tagsList = document.getElementById('tagsList');

function buildTags() {

  tagsList.innerHTML = '';

  const allTags = new Set();

  document.querySelectorAll('.method-tag').forEach(tag => {
    const text = tag.textContent.trim();
    if (text) allTags.add(text);
  });

  allTags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-btn';
    btn.textContent = tag;
    btn.onclick = () => {
      searchInput.value = tag;
      searchInput.dispatchEvent(new Event('input'));
      tagsPopup.classList.remove('show');
      tagsOverlay.classList.remove('show');
      document.body.style.overflow = '';
    };
    tagsList.appendChild(btn);
  });

}

openTags.onclick = () => {
  tagsPopup.classList.add('show');
  tagsOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
};

tagsOverlay.onclick = () => {
  tagsPopup.classList.remove('show');
  tagsOverlay.classList.remove('show');
  document.body.style.overflow = '';
};


// ============================================================
// GREETING / CLOCK
// ============================================================

const greetingText =
  document.getElementById('greetingText');

function updateGreeting() {

  const now = new Date();

  const jam = now.getHours()
    .toString()
    .padStart(2, '0');

  const menit = now.getMinutes()
    .toString()
    .padStart(2, '0');

  const detik = now.getSeconds()
    .toString()
    .padStart(2, '0');

  let greeting = '';

  if (jam >= 4 && jam < 11) {

    greeting = 'Selamat pagi 🌤️';

  } else if (jam >= 11 && jam < 15) {

    greeting = 'Selamat siang ☀️';

  } else if (jam >= 15 && jam < 18) {

    greeting = 'Selamat sore 🌥️';

  } else {

    greeting = 'Selamat malam 🌙';

  }

  greetingText.innerHTML = `
    ${greeting}
    <br>
    <span style="
      font-size:13px;
      color: var(--subtext);
      font-family: var(--mono);
    ">
      Time : ${jam}:${menit}:${detik}
    </span>
  `;

}

updateGreeting();

setInterval(updateGreeting, 1000);

// ============================================================
// DOCK BAR — support tap di HP (bukan cuma hover)
// ============================================================

document.querySelectorAll('.dock-item').forEach(item => {
  item.addEventListener('click', (e) => {
    const isAlreadyActive = item.classList.contains('dock-active');

    // Tutup dock lain yang mungkin lagi terbuka
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('dock-active'));

    if (!isAlreadyActive) {
      item.classList.add('dock-active');
    } else if (item.tagName === 'A') {
      // Kalau ini link (Admin) dan sudah aktif, biarkan link jalan normal
      return;
    }

    // Kalau elemen ini bukan link (misal "Bantuan"), cegah reload & hanya toggle
    if (item.tagName !== 'A') {
      e.preventDefault();
    }
  });
});

// Klik Bantuan — placeholder, nanti diisi tutorial auto order
document.getElementById('dockBantuan').addEventListener('click', () => {
  Swal.fire({
    icon: 'info',
    title: 'Segera Hadir',
    text: 'Tutorial auto order akan tersedia di sini.',
  });
});

// Tutup dock item aktif kalau tap di luar dock
document.addEventListener('click', (e) => {
  if (!e.target.closest('.dock-bar')) {
    document.querySelectorAll('.dock-item').forEach(el => el.classList.remove('dock-active'));
  }
});
