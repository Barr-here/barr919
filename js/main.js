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

const testiIcon = document.getElementById('testiIcon');
const donateIcon = document.getElementById('donateIcon');
const donasiPopup = document.getElementById('donasiPopup');

document.getElementById('testiIcon').innerHTML = getSvg('testi');
document.getElementById('donateIcon').innerHTML = getSvg('donate');
document.getElementById('searchIcon').innerHTML = getSvg('search');
document.getElementById('channelIcon').innerHTML = getSvg('community');
document.getElementById('groupIcon').innerHTML = getSvg('group');

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
  document.body.style.overflow = '';
};

const btn = document.getElementById('themeBtn');
const musicBtn = document.getElementById('musicBtn');
const bgMusic = document.getElementById('bgMusic');

function getThemeColor() {
  return document.documentElement.classList.contains('dark')
    ? '#2B2116'
    : '#111111';
}

// MUSIC
musicBtn.innerHTML = getSvg('not', getThemeColor());

let playing = false;

musicBtn.onclick = () => {
  if (playing) {
    bgMusic.pause();
    musicBtn.innerHTML = getSvg('not', getThemeColor());
  } else {
    bgMusic.play();
    musicBtn.innerHTML = getSvg('pause', getThemeColor());
  }

  playing = !playing;
};


// THEME
function updateThemeIcon() {
  const dark = document.documentElement.classList.contains('dark');

  btn.innerHTML = dark
    ? getSvg('sun', '#2B2116')
    : getSvg('moon', '#111111');

  // Update warna icon music juga
  musicBtn.innerHTML = getSvg(
    playing ? 'pause' : 'not',
    dark ? '#2B2116' : '#111111'
  );
}

updateThemeIcon();

btn.onclick = () => {
  document.documentElement.classList.toggle('dark');

  const dark = document.documentElement.classList.contains('dark');

  updateThemeIcon();

  localStorage.setItem('theme', dark ? 'dark' : 'light');
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
  
      <div class="card product-card" data-name="${item.type.toLowerCase()}" data-product-id="${item.id}">

        <div class="product-card-image-wrap">
          <div class="product-card-image" style="background-image:url('${item.image_url || ''}');"></div>
          <div class="product-card-fade"></div>
          <div class="product-card-top">
            <span class="method-tag product">${item.type}</span>
          </div>
        </div>

        <div class="product-card-info">
          <div class="endpoint-path">${item.title}</div>
          <div class="endpoint-desc">${item.description}</div>
        </div>

      </div>
  
      `;
    });

    // simpan data produk supaya bisa dipakai modal detail
    window.__productsData = products;

    // klik card produk -> buka modal detail
    document.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.productId;
        const item = products.find(p => String(p.id) === String(id));
        if (item) openProductModal(item);
      });
    });

  });

// ============================================================
// MODAL DETAIL PRODUK
// ============================================================

function openProductModal(item) {
  const overlay = document.getElementById('productModalOverlay');
  const box = document.getElementById('productModalBox');

  const hasPrice = item.price && item.price > 0;

  box.innerHTML = `
    <button class="product-modal-close" id="productModalClose">✕</button>

    <div class="product-modal-body">
      <div class="expand-footer">${item.content || ''}</div>

      ${hasPrice ? `
        <button class="btn btn-primary" id="buyWithCoinBtn">Beli Sekarang</button>
        <div class="buy-admin-footer">atau beli langsung ke admin</div>
      ` : ''}

      <div class="expand-buttons">
        <a class="expand-btn wa" href="${item.wa}" target="_blank">WhatsApp</a>
        <a class="expand-btn tele" href="${item.tele}" target="_blank">Telegram</a>
      </div>
    </div>
  `;

  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';

  document.getElementById('productModalClose').onclick = closeProductModal;

  if (hasPrice) {
    document.getElementById('buyWithCoinBtn').onclick = () => openBuyConfirmModal(item);
  }
}

function closeProductModal() {
  const overlay = document.getElementById('productModalOverlay');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

document.getElementById('productModalOverlay')?.addEventListener('click', (e) => {
  if (e.target.id === 'productModalOverlay') closeProductModal();
});

// ============================================================
// MODAL KONFIRMASI BELI (quantity + total)
// ============================================================

function openBuyConfirmModal(item) {
  const overlay = document.getElementById('buyConfirmOverlay');
  const box = document.getElementById('buyConfirmBox');
  const formatCount = (value) => {
    const count = Number(value);
    return Number.isFinite(count)
      ? count.toLocaleString('id-ID')
      : '-';
  };

  box.innerHTML = `
    <div class="product-modal-body">
      <div class="buy-confirm-title">${item.title}</div>
      <div
        class="buy-confirm-stock-badges"
        aria-label="Informasi stok produk"
        style="display:flex;flex-wrap:wrap;gap:10px;margin:12px 0 18px;"
      >
        <span
          class="buy-confirm-stock-badge buy-confirm-stock-available"
          id="buyConfirmStockBadge"
          style="display:inline-flex;align-items:center;padding:7px 11px;background:var(--accent);border:3px solid #111;box-shadow:2px 2px 0 #111;color:#111;font-family:var(--mono,monospace);font-size:12px;font-weight:800;line-height:1;letter-spacing:.03em;text-transform:uppercase;"
        >Memuat stok...</span>
        <span
          class="buy-confirm-stock-badge buy-confirm-stock-sold"
          id="buyConfirmSoldBadge"
          style="display:inline-flex;align-items:center;padding:7px 11px;background:var(--accent2);border:3px solid #111;box-shadow:2px 2px 0 #111;color:#111;font-family:var(--mono,monospace);font-size:12px;font-weight:800;line-height:1;letter-spacing:.03em;text-transform:uppercase;"
        >Memuat...</span>
      </div>

      <div class="buy-confirm-row">
        <div class="form-row form-row-qty">
          <label>Jumlah</label>
          <input type="number" id="buyQtyInput" value="1" min="1">
        </div>

        <div class="buy-confirm-total" id="buyTotalText">${item.price} coin</div>
      </div>

      <div class="deposit-error" id="buyConfirmError"></div>
      
      <button class="btn btn-primary" id="buyConfirmSubmit">Beli</button>
      <button class="btn btn-danger" id="buyConfirmClose">Batal</button>
    </div>
  `;

  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
  
  // Ambil stok riil dari edge function (data akun tidak boleh diakses langsung dari frontend)
  fetch(SUPABASE_URL + '/functions/v1/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: 'stock-info', productId: item.id }),
  })
    .then((res) => res.json())
    .then((data) => {
      const stockBadge = document.getElementById('buyConfirmStockBadge');
      const soldBadge = document.getElementById('buyConfirmSoldBadge');
      if (!stockBadge || !soldBadge) return;
      if (data.error) {
        stockBadge.textContent = '- stok';
        soldBadge.textContent = '- terjual';
        return;
      }
      stockBadge.textContent = `${formatCount(data.stock)} stok`;
      soldBadge.textContent = `${formatCount(data.sold)} terjual`;
    })
    .catch(() => {
      const stockBadge = document.getElementById('buyConfirmStockBadge');
      const soldBadge = document.getElementById('buyConfirmSoldBadge');
      if (stockBadge) stockBadge.textContent = '- stok';
      if (soldBadge) soldBadge.textContent = '- terjual';
    });

  const qtyInput = document.getElementById('buyQtyInput');
  const totalText = document.getElementById('buyTotalText');

  qtyInput.addEventListener('input', () => {
    const qty = Math.max(1, parseInt(qtyInput.value) || 1);
    totalText.textContent = `${item.price * qty} coin`;
  });

  document.getElementById('buyConfirmClose').onclick = closeBuyConfirmModal;

  document.getElementById('buyConfirmSubmit').onclick = async () => {
    const btn = document.getElementById('buyConfirmSubmit');
    const errBox = document.getElementById('buyConfirmError');
    
    errBox.textContent = '';

    const qty = Math.max(1, parseInt(qtyInput.value) || 1);

    const session = await verifySession();
    if (!session) {
      window.location.href = 'login.html';
      return;
    }
    
    btn.disabled = true;
    btn.textContent = 'Memproses...';

    try {
      const res = await fetch(SUPABASE_URL + '/functions/v1/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action: 'create-order',
          userId: session.userId,
          sessionToken: session.sessionToken,
          productId: item.id,
          quantity: qty,
        }),
      });
      const data = await res.json();
      
      btn.disabled = false;
      btn.textContent = 'Beli';

      if (!res.ok) {
        errBox.textContent = data.error || 'Gagal memproses pembelian';
        return;
      }

      closeBuyConfirmModal();
      closeProductModal();

      Swal.fire({
        icon: 'success',
        title: 'Pesanan Berhasil Dibuat',
        html: `<b>${item.title} x${qty}</b><br>Data akun sudah dikirim ke email kamu<br><br>Kalau email belum muncul di kotak masuk, coba cek bagian <b>Spam</b> juga ya`,
      });
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Beli';
      errBox.textContent = 'Gagal terhubung ke server';
    }
  };
}

function closeBuyConfirmModal() {
  const overlay = document.getElementById('buyConfirmOverlay');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
}

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

searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase().trim();
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    const title = card.querySelector('.endpoint-path')?.textContent || '';
    const tag = card.querySelector('.method-tag')?.textContent || '';
    const text = (title + ' ' + tag).toLowerCase();
    const match = !q || text.includes(q);
    card.classList.toggle('hidden', !match);
  });
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
// TOP BAR - ganti tampilan kalau user sudah login
// (menu "Profil" di side drawer tetap sama, selalu ke profile.html;
//  profile.html sendiri yang redirect ke login.html kalau belum login)
// ============================================================

(async () => {
  const session = await verifySession();
  const topbarAuthLink = document.getElementById('topbarAuthLink');
  const topbarName = document.getElementById('topbarName');
  const topbarTag = document.getElementById('topbarTag');
  const topbarAvatarImg = document.getElementById('topbarAvatarImg');
  const topbarAvatarInitial = document.getElementById('topbarAvatarInitial');

  if (session) {
    topbarAuthLink.href = 'profile.html';
    topbarName.textContent = session.email.split('@')[0];
    topbarTag.textContent = `Coin: ${session.coin ?? 0}`;

    // Ganti avatar jadi kotak inisial huruf pertama email
    topbarAvatarImg.style.display = 'none';
    topbarAvatarInitial.style.display = 'flex';
    topbarAvatarInitial.textContent = session.email.charAt(0).toUpperCase();
  } else {
    // Belum login -> top bar default
    topbarAuthLink.href = 'login.html';
    topbarName.textContent = 'Login';
    topbarTag.textContent = 'Coin: 0';

    topbarAvatarImg.style.display = 'block';
    topbarAvatarInitial.style.display = 'none';
  }
})();
