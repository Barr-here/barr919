// ADMIN PANEL — LOGIN & CRUD
// ----- HELPER: POPUP BERTEMA (menggantikan alert/confirm bawaan browser) -----
const isDark = document.documentElement.classList.contains('dark');

const swalTheme = {
  background: isDark ? '#202020' : '#ffffff',
  color: isDark ? '#F5F5F5' : '#111111',
  confirmButtonColor: isDark ? '#C6FF00' : '#FFD43B',
  cancelButtonColor: isDark ? '#2a2a2a' : '#FFF0D4',
  customClass: {
    popup: 'themed-swal',
    confirmButton: 'themed-swal-btn',
  },
};

function showSuccess(message) {
  return Swal.fire({
    icon: 'success',
    title: 'Berhasil',
    text: message,
    ...swalTheme,
  });
}

function showError(message) {
  return Swal.fire({
    icon: 'error',
    title: 'Gagal',
    text: message,
    ...swalTheme,
  });
}

function askConfirm(message) {
  return Swal.fire({
    icon: 'warning',
    title: 'Konfirmasi',
    text: message,
    showCancelButton: true,
    confirmButtonText: 'Lanjutkan',
    cancelButtonText: 'Batal',
    ...swalTheme,
  }).then(result => result.isConfirmed);
}

// ----- HELPER: PANGGIL EDGE FUNCTION admin-data UNTUK INSERT/UPDATE/DELETE -----
// (SELECT/baca data tetap langsung ke Supabase, karena itu publik & aman dibaca semua orang)
async function callAdminData(action, table, extra = {}) {
  const local = getLocalSession();
  if (!local) {
    showError('Sesi login habis, silakan login ulang');
    window.location.href = 'login.html';
    return { ok: false };
  }

  const res = await fetch(SUPABASE_URL + '/functions/v1/admin-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action,
      table,
      userId: local.userId,
      sessionToken: local.sessionToken,
      ...extra,
    }),
  });

  const data = await res.json();
  return { ok: res.ok, data };
}

const loadingBox = document.getElementById('loadingBox');
const adminApp = document.getElementById('adminApp');

// ----- CEK SESI + STATUS ADMIN SAAT HALAMAN DIBUKA -----
async function checkSession() {
  const session = await verifySession();

  if (!session) {
    // Belum login sama sekali -> lempar ke halaman login
    window.location.href = 'login.html';
    return;
  }

  if (!session.isAdmin) {
    // Login tapi bukan admin -> tendang balik ke beranda
    await showError('Kamu tidak punya akses ke halaman ini.');
    window.location.href = 'index.html';
    return;
  }

  showAdmin();
}
checkSession();

// ----- LOGOUT -----
document.getElementById('logoutBtn').onclick = () => {
  logoutUser();
};

function showAdmin() {
  loadingBox.classList.add('hidden');
  adminApp.classList.remove('hidden');
  loadProducts();
  loadBanners();
  loadTestimonials();
}

// ----- TAB SWITCH -----
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  };
});

// PRODUCTS
async function loadProducts() {
  const list = document.getElementById('p_list');
  list.textContent = 'Memuat...';

  const { data, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) { list.textContent = 'Error: ' + error.message; return; }

  list.innerHTML = '';
  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="item-title">${item.title}</div>
      <div class="item-actions">
        <button class="btn btn-secondary" data-edit="${item.id}">Edit</button>
        <button class="btn btn-danger" data-del="${item.id}">Hapus</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = async () => {
      if (!(await askConfirm('Yakin hapus produk ini?'))) return;
      const { ok, data } = await callAdminData('delete', 'products', { id: btn.dataset.del });
      if (!ok) { showError(data.error || 'Gagal hapus'); return; }
      showSuccess('Produk berhasil dihapus');
      loadProducts();
    };
  });

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => editProduct(data.find(d => d.id === btn.dataset.edit));
  });
}

function editProduct(item) {
  document.getElementById('p_type').value = item.type;
  document.getElementById('p_title').value = item.title;
  document.getElementById('p_desc').value = item.description;
  document.getElementById('p_wa').value = item.wa || '';
  document.getElementById('p_tele').value = item.tele || '';
  document.getElementById('p_content').value = item.content || '';
  document.getElementById('p_sort').value = item.sort_order || 0;

  const addBtn = document.getElementById('p_add');
  addBtn.textContent = '💾 Simpan Perubahan';
  addBtn.dataset.editingId = item.id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('p_add').onclick = async () => {
  const btn = document.getElementById('p_add');
  const isEditing = !!btn.dataset.editingId;
  const originalText = isEditing ? '💾 Simpan Perubahan' : '+ Tambah Produk';

  const payload = {
    type: document.getElementById('p_type').value.trim(),
    title: document.getElementById('p_title').value.trim(),
    description: document.getElementById('p_desc').value.trim(),
    wa: document.getElementById('p_wa').value.trim(),
    tele: document.getElementById('p_tele').value.trim(),
    content: document.getElementById('p_content').value,
    sort_order: parseInt(document.getElementById('p_sort').value) || 0,
  };

  if (!payload.title) { showError('Judul wajib diisi'); return; }

  btn.disabled = true;
  btn.textContent = isEditing ? 'Menyimpan...' : 'Menambahkan...';

  let result;
  if (isEditing) {
    result = await callAdminData('update', 'products', { id: btn.dataset.editingId, payload });
    delete btn.dataset.editingId;
  } else {
    result = await callAdminData('insert', 'products', { payload });
  }

  btn.disabled = false;
  btn.textContent = '+ Tambah Produk';

  if (!result.ok) { showError('Gagal simpan: ' + (result.data.error || '')); return; }

  ['p_title','p_desc','p_wa','p_tele','p_content'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('p_type').value = 'PRODUK';
  document.getElementById('p_sort').value = 0;
  showSuccess('Produk berhasil disimpan');
  loadProducts();
};

// BANNERS
async function loadBanners() {
  const list = document.getElementById('b_list');
  list.textContent = 'Memuat...';

  const { data, error } = await supabaseClient
    .from('banners')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) { list.textContent = 'Error: ' + error.message; return; }

  list.innerHTML = '';
  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="item-title">${item.title}</div>
      <div class="item-actions">
        <button class="btn btn-secondary" data-edit="${item.id}">Edit</button>
        <button class="btn btn-danger" data-del="${item.id}">Hapus</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = async () => {
      if (!(await askConfirm('Yakin hapus banner ini?'))) return;
      const { ok, data } = await callAdminData('delete', 'banners', { id: btn.dataset.del });
      if (!ok) { showError(data.error || 'Gagal hapus'); return; }
      showSuccess('Banner berhasil dihapus');
      loadBanners();
    };
  });

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => editBanner(data.find(d => d.id === btn.dataset.edit));
  });
}

function editBanner(item) {
  document.getElementById('b_image').value = item.image;
  document.getElementById('b_title').value = item.title;
  document.getElementById('b_desc').value = item.description;
  document.getElementById('b_wa').value = item.wa || '';
  document.getElementById('b_tele').value = item.tele || '';
  document.getElementById('b_sort').value = item.sort_order || 0;

  const addBtn = document.getElementById('b_add');
  addBtn.textContent = '💾 Simpan Perubahan';
  addBtn.dataset.editingId = item.id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('b_add').onclick = async () => {
  const btn = document.getElementById('b_add');
  const isEditing = !!btn.dataset.editingId;

  const payload = {
    image: document.getElementById('b_image').value.trim(),
    title: document.getElementById('b_title').value.trim(),
    description: document.getElementById('b_desc').value,
    wa: document.getElementById('b_wa').value.trim(),
    tele: document.getElementById('b_tele').value.trim(),
    sort_order: parseInt(document.getElementById('b_sort').value) || 0,
  };

  if (!payload.title || !payload.image) { showError('Judul dan gambar wajib diisi'); return; }

  btn.disabled = true;
  btn.textContent = isEditing ? 'Menyimpan...' : 'Menambahkan...';

  let result;
  if (isEditing) {
    result = await callAdminData('update', 'banners', { id: btn.dataset.editingId, payload });
    delete btn.dataset.editingId;
  } else {
    result = await callAdminData('insert', 'banners', { payload });
  }

  btn.disabled = false;
  btn.textContent = '+ Tambah Banner';

  if (!result.ok) { showError('Gagal simpan: ' + (result.data.error || '')); return; }

  ['b_image','b_title','b_desc','b_wa','b_tele'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('b_sort').value = 0;
  showSuccess('Banner berhasil disimpan');
  loadBanners();
};

// TESTIMONIALS
async function loadTestimonials() {
  const list = document.getElementById('t_list');
  list.textContent = 'Memuat...';

  const { data, error } = await supabaseClient
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) { list.textContent = 'Error: ' + error.message; return; }

  // Update hint "urutan terakhir" di form tambah testimoni
  const hintBox = document.getElementById('t_sort_hint');
  if (data.length > 0) {
    const lastSort = data[data.length - 1].sort_order;
    hintBox.textContent = `Urutan sekarang: ${lastSort}`;
  } else {
    hintBox.textContent = 'Belum ada testimoni, mulai dari urutan 1';
  }

  list.innerHTML = '';
  data.forEach(item => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <div class="item-title">${item.title} — ${item.date}</div>
      <div class="item-actions">
        <button class="btn btn-secondary" data-edit="${item.id}">Edit</button>
        <button class="btn btn-danger" data-del="${item.id}">Hapus</button>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = async () => {
      if (!(await askConfirm('Yakin hapus testimoni ini?'))) return;
      const { ok, data } = await callAdminData('delete', 'testimonials', { id: btn.dataset.del });
      if (!ok) { showError(data.error || 'Gagal hapus'); return; }
      showSuccess('Testimoni berhasil dihapus');
      loadTestimonials();
    };
  });

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => editTestimonial(data.find(d => d.id === btn.dataset.edit));
  });
}

function editTestimonial(item) {
  document.getElementById('t_image').value = item.image;
  document.getElementById('t_date').value = item.date;
  document.getElementById('t_title').value = item.title;
  document.getElementById('t_desc').value = item.description;
  document.getElementById('t_sort').value = item.sort_order || 0;

  const addBtn = document.getElementById('t_add');
  addBtn.textContent = '💾 Simpan Perubahan';
  addBtn.dataset.editingId = item.id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('t_add').onclick = async () => {
  const btn = document.getElementById('t_add');
  const isEditing = !!btn.dataset.editingId;

  const payload = {
    image: document.getElementById('t_image').value.trim(),
    date: document.getElementById('t_date').value.trim(),
    title: document.getElementById('t_title').value.trim(),
    description: document.getElementById('t_desc').value.trim(),
    sort_order: parseInt(document.getElementById('t_sort').value) || 0,
  };

  if (!payload.title || !payload.image) { showError('Judul dan gambar wajib diisi'); return; }

  btn.disabled = true;
  btn.textContent = isEditing ? 'Menyimpan...' : 'Menambahkan...';

  let result;
  if (isEditing) {
    result = await callAdminData('update', 'testimonials', { id: btn.dataset.editingId, payload });
    delete btn.dataset.editingId;
  } else {
    result = await callAdminData('insert', 'testimonials', { payload });
  }

  btn.disabled = false;
  btn.textContent = '+ Tambah Testimoni';

  if (!result.ok) { showError('Gagal simpan: ' + (result.data.error || '')); return; }

  ['t_image','t_date','t_title'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('t_desc').value = 'Terimkasih atas kepercayaan anda🌹';
  document.getElementById('t_sort').value = 0;
  showSuccess('Testimoni berhasil disimpan');
  loadTestimonials();
};
