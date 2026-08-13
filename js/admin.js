// ============================================================
// ADMIN PANEL — LOGIN & CRUD
// ============================================================

// ----- HELPER: POPUP BERTEMA (menggantikan alert/confirm bawaan browser) -----
const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

const swalTheme = {
  background: isDark ? '#0f1923' : '#ffffff',
  color: isDark ? '#e8f4fb' : '#0d1b2a',
  confirmButtonColor: isDark ? '#00ccff' : '#00aadd',
  cancelButtonColor: isDark ? '#1e3040' : '#e8f4fb',
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
    confirmButtonText: 'Ya, lanjutkan',
    cancelButtonText: 'Batal',
    ...swalTheme,
  }).then(result => result.isConfirmed);
}

const loginBox = document.getElementById('loginBox');
const adminApp = document.getElementById('adminApp');
const loginError = document.getElementById('loginError');

// ----- CEK SESI SAAT HALAMAN DIBUKA -----
async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showAdmin();
  } else {
    loginBox.classList.remove('hidden');
    adminApp.classList.add('hidden');
  }
}
checkSession();

// ----- LOGIN -----
document.getElementById('loginBtn').onclick = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  loginError.textContent = '';

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginError.textContent = 'Gagal login: ' + error.message;
    return;
  }
  showAdmin();
};

// ----- LOGOUT -----
document.getElementById('logoutBtn').onclick = async () => {
  await supabaseClient.auth.signOut();
  location.reload();
};

function showAdmin() {
  loginBox.classList.add('hidden');
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

// ============================================================
// PRODUCTS
// ============================================================

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
      await supabaseClient.from('products').delete().eq('id', btn.dataset.del);
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

  let error;
  if (btn.dataset.editingId) {
    ({ error } = await supabaseClient.from('products').update(payload).eq('id', btn.dataset.editingId));
    delete btn.dataset.editingId;
    btn.textContent = '+ Tambah Produk';
  } else {
    ({ error } = await supabaseClient.from('products').insert(payload));
  }

  if (error) { showError('Gagal simpan: ' + error.message); return; }

  ['p_title','p_desc','p_wa','p_tele','p_content'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('p_type').value = 'PRODUK';
  document.getElementById('p_sort').value = 0;
  showSuccess('Produk berhasil disimpan');
  loadProducts();
};

// ============================================================
// BANNERS
// ============================================================

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
      await supabaseClient.from('banners').delete().eq('id', btn.dataset.del);
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
  const payload = {
    image: document.getElementById('b_image').value.trim(),
    title: document.getElementById('b_title').value.trim(),
    description: document.getElementById('b_desc').value,
    wa: document.getElementById('b_wa').value.trim(),
    tele: document.getElementById('b_tele').value.trim(),
    sort_order: parseInt(document.getElementById('b_sort').value) || 0,
  };

  if (!payload.title || !payload.image) { showError('Judul dan gambar wajib diisi'); return; }

  let error;
  if (btn.dataset.editingId) {
    ({ error } = await supabaseClient.from('banners').update(payload).eq('id', btn.dataset.editingId));
    delete btn.dataset.editingId;
    btn.textContent = '+ Tambah Banner';
  } else {
    ({ error } = await supabaseClient.from('banners').insert(payload));
  }

  if (error) { showError('Gagal simpan: ' + error.message); return; }

  ['b_image','b_title','b_desc','b_wa','b_tele'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('b_sort').value = 0;
  showSuccess('Banner berhasil disimpan');
  loadBanners();
};

// ============================================================
// TESTIMONIALS
// ============================================================

async function loadTestimonials() {
  const list = document.getElementById('t_list');
  list.textContent = 'Memuat...';

  const { data, error } = await supabaseClient
    .from('testimonials')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) { list.textContent = 'Error: ' + error.message; return; }

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
      await supabaseClient.from('testimonials').delete().eq('id', btn.dataset.del);
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
  const payload = {
    image: document.getElementById('t_image').value.trim(),
    date: document.getElementById('t_date').value.trim(),
    title: document.getElementById('t_title').value.trim(),
    description: document.getElementById('t_desc').value.trim(),
    sort_order: parseInt(document.getElementById('t_sort').value) || 0,
  };

  if (!payload.title || !payload.image) { showError('Judul dan gambar wajib diisi'); return; }

  let error;
  if (btn.dataset.editingId) {
    ({ error } = await supabaseClient.from('testimonials').update(payload).eq('id', btn.dataset.editingId));
    delete btn.dataset.editingId;
    btn.textContent = '+ Tambah Testimoni';
  } else {
    ({ error } = await supabaseClient.from('testimonials').insert(payload));
  }

  if (error) { showError('Gagal simpan: ' + error.message); return; }

  ['t_image','t_date','t_title'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('t_desc').value = 'Terimkasih atas kepercayaan anda🌹';
  document.getElementById('t_sort').value = 0;
  showSuccess('Testimoni berhasil disimpan');
  loadTestimonials();
};
