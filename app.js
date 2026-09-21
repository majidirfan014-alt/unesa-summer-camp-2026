// ============================================
// APP - Unesa Summer Camp 2026
// ============================================

const POS_NAMES = {
  1: 'Ular Naga',
  2: 'Jembatan Kayu',
  3: 'Leader Drill',
  4: 'Lompat Karet'
};

const HASIL_COLORS = {
  Menang: '#2e7d32',
  Seri: '#f9a825',
  Kalah: '#c62828'
};

const APP = {
  currentPage: 'dashboard',
  currentUser: null,
  currentPos: 1,
  selectedHasil: '',

  async init() {
    this.showLoading(true);
    this.currentUser = DB.getLoggedIn();
    this.updateNavbar();

    // Enter key support for peserta input
    const pesertaInput = document.getElementById('pesertaNama');
    if (pesertaInput) {
      pesertaInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          APP.addPeserta();
        }
      });
    }

    // Enter key support for tim input
    const timInput = document.getElementById('timNama');
    if (timInput) {
      timInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          APP.saveNamaTim();
        }
      });
    }

    await DB.init();
    this.showLoading(false);

    if (this.currentUser) {
      this.navigate('penilaian');
    } else {
      this.navigate('dashboard');
    }
  },

  showLoading(show) {
    let el = document.getElementById('loadingOverlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'loadingOverlay';
      el.innerHTML = '<div class="loading-spinner"></div>';
      document.body.appendChild(el);
    }
    el.style.display = show ? 'flex' : 'none';
  },

  navigate(page) {
    this.currentPage = page;

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    const navbar = document.getElementById('navbar');
    if (page === 'dashboard' || page === 'login' || page === 'loginAdmin') {
      navbar.style.display = 'none';
    } else {
      navbar.style.display = 'flex';
      this.updateNavbar();
    }

    switch (page) {
      case 'peserta': this.renderPesertaList(); break;
      case 'tim': this.renderTimForm(); this.renderTimTable(); break;
      case 'penilaian': this.renderPenilaian(); break;
      case 'leaderboard': this.renderLeaderboard(); break;
    }

    document.querySelectorAll('.nav-links a').forEach(a => {
      a.classList.toggle('active', a.dataset.page === page);
    });

    window.scrollTo(0, 0);
  },

  updateNavbar() {
    const navLinks = document.getElementById('navLinks');
    const navUser = document.getElementById('navUser');
    const navLoginBtn = document.getElementById('navLoginBtn');
    const navLogoutBtn = document.getElementById('navLogoutBtn');

    const isAdmin = this.currentUser && this.currentUser.pos === 0;
    const isLoggedIn = !!this.currentUser;

    navLoginBtn.style.display = isLoggedIn ? 'none' : 'inline-flex';
    navLogoutBtn.style.display = isLoggedIn ? 'inline-flex' : 'none';

    let links = '';

    if (isLoggedIn && !isAdmin) {
      links = `
        <li><a data-page="penilaian" onclick="APP.navigate('penilaian')">Penilaian</a></li>
        <li><a data-page="leaderboard" onclick="APP.navigate('leaderboard')">Leaderboard</a></li>
      `;
    } else if (isAdmin) {
      links = `
        <li><a data-page="peserta" onclick="APP.navigate('peserta')">Peserta</a></li>
        <li><a data-page="tim" onclick="APP.navigate('tim')">Tim</a></li>
        <li><a data-page="penilaian" onclick="APP.navigate('penilaian')">Penilaian</a></li>
        <li><a data-page="leaderboard" onclick="APP.navigate('leaderboard')">Leaderboard</a></li>
      `;
    } else {
      links = `
        <li><a data-page="peserta" onclick="APP.navigate('peserta')">Peserta</a></li>
        <li><a data-page="tim" onclick="APP.navigate('tim')">Tim</a></li>
        <li><a data-page="penilaian" onclick="APP.navigate('penilaian')">Penilaian</a></li>
        <li><a data-page="leaderboard" onclick="APP.navigate('leaderboard')">Leaderboard</a></li>
      `;
    }

    navLinks.innerHTML = links;
    navUser.textContent = this.currentUser ? this.currentUser.nama : '';
  },

  // ---- Auth ----
  login(e) {
    e.preventDefault();
    const formId = e.target.id;
    let username, password;

    if (formId === 'formLoginAdmin') {
      username = document.getElementById('loginAdminUsername').value.trim();
      password = document.getElementById('loginAdminPassword').value.trim();
    } else {
      username = document.getElementById('loginUsername').value.trim();
      password = document.getElementById('loginPassword').value.trim();
    }

    const user = DB.login(username, password);
    if (user) {
      this.currentUser = user;
      this.updateNavbar();
      this.toast('Login berhasil! Selamat datang, ' + user.nama, 'success');
      if (user.pos === 0) {
        this.navigate('peserta');
      } else {
        this.navigate('penilaian');
      }
    } else {
      this.toast('Username atau password salah!', 'error');
    }
  },

  logout() {
    DB.logout();
    this.currentUser = null;
    this.updateNavbar();
    this.toast('Logout berhasil.', 'info');
    this.navigate('dashboard');
  },

  // ---- PESERTA ----
  renderPesertaList() {
    const tId = parseInt(document.getElementById('pesertaTeam').value);
    const t = DB.getTeamById(tId);
    const list = document.getElementById('pesertaList');

    if (!t || t.peserta.length === 0) {
      list.innerHTML = '<div class="empty-state"><div class="icon">&#128101;</div>Belum ada peserta di team ini.</div>';
      return;
    }

    list.innerHTML = t.peserta.map((nama, i) => `
      <li>
        <span class="peserta-num">${i + 1}.</span>
        <span class="peserta-name">${this.esc(nama)}</span>
        <button class="btn-remove" onclick="APP.removePeserta(${tId}, ${i})" title="Hapus">&#10005;</button>
      </li>
    `).join('');
  },

  async addPeserta() {
    const tId = parseInt(document.getElementById('pesertaTeam').value);
    const input = document.getElementById('pesertaNama');
    const nama = input.value.trim();

    if (!nama) {
      this.toast('Nama peserta harus diisi!', 'error');
      input.focus();
      return;
    }

    await DB.addPeserta(tId, nama);
    input.value = '';
    input.focus();
    this.renderPesertaList();
    this.toast('Peserta berhasil ditambahkan!', 'success');
  },

  async removePeserta(tId, index) {
    if (confirm('Hapus peserta ini?')) {
      await DB.removePeserta(tId, index);
      this.renderPesertaList();
      this.toast('Peserta dihapus.', 'info');
    }
  },

  // ---- TIM ----
  renderTimForm() {
    const tId = parseInt(document.getElementById('timTeam').value);
    const t = DB.getTeamById(tId);
    document.getElementById('timNama').value = t ? t.nama_tim : '';
  },

  renderTimTable() {
    const team = DB.getTeam();
    const tbody = document.getElementById('timTable');
    tbody.innerHTML = team.map(t => `
      <tr>
        <td>Team ${t.nomor}</td>
        <td>${this.esc(t.nama_tim)}</td>
        <td>${t.peserta.length} orang</td>
      </tr>
    `).join('');
  },

  async saveNamaTim() {
    const tId = parseInt(document.getElementById('timTeam').value);
    const nama = document.getElementById('timNama').value.trim();

    if (!nama) {
      this.toast('Nama tim harus diisi!', 'error');
      return;
    }

    await DB.setNamaTim(tId, nama);
    this.renderTimTable();
    this.toast('Nama tim berhasil disimpan!', 'success');
  },

  // ---- PENILAIAN ----
  selectPos(pos) {
    this.currentPos = pos;
    document.querySelectorAll('#posTabBar .tab-btn').forEach((btn, i) => {
      btn.classList.toggle('active', i + 1 === pos);
    });
    this.loadExistingNilai();
  },

  selectHasil(hasil) {
    this.selectedHasil = hasil;
    document.getElementById('penilaianHasil').value = hasil;
    document.querySelectorAll('.hasil-btn').forEach(btn => btn.classList.remove('selected'));
    const targetClass = 'hasil-' + hasil.toLowerCase();
    document.querySelectorAll('.' + targetClass).forEach(btn => btn.classList.add('selected'));
  },

  renderPenilaian() {
    const penilaianUser = document.getElementById('penilaianJuri');
    if (this.currentUser && this.currentUser.pos > 0) {
      this.currentPos = this.currentUser.pos;
      document.querySelectorAll('#posTabBar .tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', i + 1 === this.currentPos);
      });
      penilaianUser.textContent = `Juri: ${this.currentUser.nama}`;
    }
    this.selectedHasil = '';
    document.getElementById('penilaianHasil').value = '';
    document.querySelectorAll('.hasil-btn').forEach(btn => btn.classList.remove('selected'));
    this.loadExistingNilai();
    this.renderRekapTable();
  },

  loadExistingNilai() {
    const pos = this.currentPos;
    const tId = parseInt(document.getElementById('penilaianTeam').value);
    const existing = DB.getNilai(pos, tId);

    if (existing) {
      this.selectHasil(existing.hasil);
      document.getElementById('penilaianCatatan').value = existing.catatan || '';
    } else {
      this.selectedHasil = '';
      document.getElementById('penilaianHasil').value = '';
      document.querySelectorAll('.hasil-btn').forEach(btn => btn.classList.remove('selected'));
      document.getElementById('penilaianCatatan').value = '';
    }
  },

  async simpanNilai() {
    const pos = this.currentPos;
    const tId = parseInt(document.getElementById('penilaianTeam').value);
    const hasil = document.getElementById('penilaianHasil').value;
    const catatan = document.getElementById('penilaianCatatan').value.trim();

    if (!hasil) {
      this.toast('Pilih hasil pertandingan (Menang/Seri/Kalah)!', 'error');
      return;
    }

    const juriName = this.currentUser ? this.currentUser.nama : 'Admin';
    await DB.setNilai(pos, tId, hasil, juriName, catatan);

    this.renderRekapTable();
    const poin = DB.POIN[hasil];
    this.toast(`Pos ${pos} - Team ${tId}: ${hasil} (${poin} poin) berhasil disimpan!`, 'success');
  },

  renderRekapTable() {
    const tbody = document.getElementById('rekapTable');
    let html = '';
    for (let pos = 1; pos <= 4; pos++) {
      html += `<tr><td style="font-weight:700;">Pos ${pos} - ${POS_NAMES[pos]}</td>`;
      for (let t = 1; t <= 7; t++) {
        const n = DB.getNilai(pos, t);
        if (n) {
          const color = HASIL_COLORS[n.hasil] || '#757575';
          html += `<td class="score-cell"><span style="color:${color};font-weight:700;">${n.hasil}</span> <small style="color:var(--text-light);">(${n.poin})</small></td>`;
        } else {
          html += `<td class="score-cell" style="color:#ccc;">-</td>`;
        }
      }
      html += '</tr>';
    }
    html += '<tr style="background:#fff3e0;font-weight:700;"><td>TOTAL POIN</td>';
    for (let t = 1; t <= 7; t++) {
      let total = 0;
      for (let pos = 1; pos <= 4; pos++) {
        const n = DB.getNilai(pos, t);
        if (n) total += n.poin;
      }
      html += `<td class="total-cell">${total}</td>`;
    }
    html += '</tr>';
    tbody.innerHTML = html;
  },

  async clearAllPenilaian() {
    if (!confirm('Hapus SEMUA data penilaian? Tindakan ini tidak dapat dibatalkan.')) return;
    await DB.clearPenilaian();
    this.renderRekapTable();
    this.loadExistingNilai();
    this.toast('Semua data penilaian berhasil dihapus.', 'info');
  },

  // ---- LEADERBOARD ----
  renderLeaderboard() {
    const rekap = DB.getRekapNilai();
    const tbody = document.getElementById('leaderboardTable');

    if (rekap.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Belum ada data penilaian.</td></tr>';
      return;
    }

    tbody.innerHTML = rekap.map((r, i) => {
      const rank = i + 1;
      let medalHtml = '';
      if (rank === 1) medalHtml = '<span class="medal medal-1">1</span>';
      else if (rank === 2) medalHtml = '<span class="medal medal-2">2</span>';
      else if (rank === 3) medalHtml = '<span class="medal medal-3">3</span>';
      else medalHtml = rank;

      const fmtCell = (cell) => {
        if (!cell) return '<td class="score-cell" style="color:#ccc;">-</td>';
        const color = HASIL_COLORS[cell.hasil] || '#757575';
        return `<td class="score-cell"><span style="color:${color};font-weight:700;">${cell.hasil}</span> <small>(${cell.poin})</small></td>`;
      };

      return `
        <tr>
          <td style="text-align:center;">${medalHtml}</td>
          <td><strong>${this.esc(r.nama_tim)}</strong><br><small style="color:var(--text-light);">Team ${r.nomor}</small></td>
          ${fmtCell(r.pos1)}
          ${fmtCell(r.pos2)}
          ${fmtCell(r.pos3)}
          ${fmtCell(r.pos4)}
          <td class="total-cell">${r.total}</td>
        </tr>
      `;
    }).join('');
  },

  // ---- Utilities ----
  esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  toast(msg, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => APP.init());
