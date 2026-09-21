// ============================================
// DATA LAYER - localStorage Based
// Unesa Summer Camp 2026
// ============================================

const DB = {
  KEYS: {
    TEAM: 'usc2026_team',
    PENILAIAN: 'usc2026_penilaian',
    JURI: 'usc2026_juri',
    LOGGED_IN: 'usc2026_logged_in'
  },

  POIN: { Menang: 3, Seri: 1, Kalah: 0 },

  init() {
    // Clear old localStorage keys from previous versions
    const oldKeys = ['usc2026_kelompok', 'usc2026_penilaian_old'];
    oldKeys.forEach(k => localStorage.removeItem(k));

    // Check if team data needs initialization or migration
    const stored = localStorage.getItem(this.KEYS.TEAM);
    const needInit = !stored || (stored && stored.includes('kelompok_id'));
    if (needInit) {
      const defaultTeam = [];
      for (let i = 1; i <= 7; i++) {
        defaultTeam.push({
          id: i,
          nomor: i,
          nama_tim: `Team ${i}`,
          peserta: []
        });
      }
      localStorage.setItem(this.KEYS.TEAM, JSON.stringify(defaultTeam));
    }

    if (!localStorage.getItem(this.KEYS.PENILAIAN)) {
      localStorage.setItem(this.KEYS.PENILAIAN, JSON.stringify([]));
    }

    if (!localStorage.getItem(this.KEYS.JURI)) {
      const defaultJuri = [
        { username: 'juri1', password: '1234', nama: 'Juri Pos 1 - Ular Naga', pos: 1 },
        { username: 'juri2', password: '1234', nama: 'Juri Pos 2 - Jembatan Kayu', pos: 2 },
        { username: 'juri3', password: '1234', nama: 'Juri Pos 3 - Leader Drill', pos: 3 },
        { username: 'juri4', password: '1234', nama: 'Juri Pos 4 - Lompat Karet', pos: 4 },
        { username: 'admin', password: 'admin', nama: 'Admin', pos: 0 }
      ];
      localStorage.setItem(this.KEYS.JURI, JSON.stringify(defaultJuri));
    }
  },

  // ---- Team ----
  getTeam() {
    return JSON.parse(localStorage.getItem(this.KEYS.TEAM)) || [];
  },

  getTeamById(id) {
    return this.getTeam().find(t => t.id === id);
  },

  updateTeam(id, data) {
    const list = this.getTeam();
    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data };
      localStorage.setItem(this.KEYS.TEAM, JSON.stringify(list));
    }
  },

  setNamaTim(id, namaTim) {
    this.updateTeam(id, { nama_tim: namaTim });
  },

  // ---- Peserta ----
  addPeserta(teamId, nama) {
    const list = this.getTeam();
    const t = list.find(t => t.id === teamId);
    if (t) {
      t.peserta.push(nama);
      localStorage.setItem(this.KEYS.TEAM, JSON.stringify(list));
    }
  },

  removePeserta(teamId, index) {
    const list = this.getTeam();
    const t = list.find(t => t.id === teamId);
    if (t && t.peserta[index] !== undefined) {
      t.peserta.splice(index, 1);
      localStorage.setItem(this.KEYS.TEAM, JSON.stringify(list));
    }
  },

  // ---- Penilaian ----
  getPenilaian() {
    return JSON.parse(localStorage.getItem(this.KEYS.PENILAIAN)) || [];
  },

  getNilai(pos, teamId) {
    return this.getPenilaian().find(p => p.pos === pos && p.team_id === teamId);
  },

  setNilai(pos, teamId, hasil, juri, catatan) {
    const list = this.getPenilaian();
    const idx = list.findIndex(p => p.pos === pos && p.team_id === teamId);
    const poin = this.POIN[hasil] || 0;
    const entry = {
      id: idx !== -1 ? list[idx].id : Date.now(),
      team_id: teamId,
      pos: pos,
      hasil: hasil,
      poin: poin,
      juri: juri || '',
      catatan: catatan || '',
      timestamp: new Date().toISOString()
    };
    if (idx !== -1) {
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    localStorage.setItem(this.KEYS.PENILAIAN, JSON.stringify(list));
  },

  getRekapNilai() {
    const team = this.getTeam();
    const penilaian = this.getPenilaian();

    return team.map(t => {
      const results = {};
      let total = 0;
      for (let pos = 1; pos <= 4; pos++) {
        const p = penilaian.find(x => x.pos === pos && x.team_id === t.id);
        results[pos] = p ? { hasil: p.hasil, poin: p.poin } : null;
        if (p) total += p.poin;
      }
      return {
        id: t.id,
        nama_tim: t.nama_tim,
        nomor: t.nomor,
        pos1: results[1],
        pos2: results[2],
        pos3: results[3],
        pos4: results[4],
        total: total
      };
    }).sort((a, b) => b.total - a.total);
  },

  clearPenilaian() {
    localStorage.setItem(this.KEYS.PENILAIAN, JSON.stringify([]));
  },

  // ---- Juri / Auth ----
  login(username, password) {
    const juri = JSON.parse(localStorage.getItem(this.KEYS.JURI)) || [];
    const found = juri.find(j => j.username === username && j.password === password);
    if (found) {
      localStorage.setItem(this.KEYS.LOGGED_IN, JSON.stringify(found));
      return found;
    }
    return null;
  },

  logout() {
    localStorage.removeItem(this.KEYS.LOGGED_IN);
  },

  getLoggedIn() {
    const data = localStorage.getItem(this.KEYS.LOGGED_IN);
    return data ? JSON.parse(data) : null;
  },

  resetAll() {
    Object.values(this.KEYS).forEach(k => localStorage.removeItem(k));
    this.init();
  }
};

DB.init();
