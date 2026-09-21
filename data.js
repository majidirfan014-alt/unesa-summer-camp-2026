// ============================================
// DATA LAYER - Firebase Firestore
// Unesa Summer Camp 2026
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyAzycNJkcJRqN_AT3hzjc5k_euVO4Ui8LQ",
  authDomain: "unesa-summer-camp-2026.firebaseapp.com",
  projectId: "unesa-summer-camp-2026",
  storageBucket: "unesa-summer-camp-2026.firebasestorage.app",
  messagingSenderId: "874063228932",
  appId: "1:874063228932:web:d25e80ac3f6b023b4fc551",
  measurementId: "G-WZM1G6EKPT"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const DB = {
  POIN: { Menang: 3, Seri: 1, Kalah: 0 },

  // Local cache
  _teamCache: [],
  _penilaianCache: [],

  // ---- Init ----
  async init() {
    await this.loadTeam();
    await this.loadPenilaian();
  },

  // ---- TEAM ----
  async loadTeam() {
    const snap = await db.collection('team').orderBy('nomor').get();
    this._teamCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (this._teamCache.length === 0) {
      const batch = db.batch();
      for (let i = 1; i <= 7; i++) {
        const ref = db.collection('team').doc('team_' + i);
        batch.set(ref, {
          id: i,
          nomor: i,
          nama_tim: 'Team ' + i,
          peserta: []
        });
      }
      await batch.commit();
      await this.loadTeam();
    }
  },

  getTeam() {
    return this._teamCache;
  },

  getTeamById(id) {
    return this._teamCache.find(t => t.id === id);
  },

  async setNamaTim(id, namaTim) {
    const docId = 'team_' + id;
    await db.collection('team').doc(docId).update({ nama_tim: namaTim });
    const t = this._teamCache.find(t => t.id === id);
    if (t) t.nama_tim = namaTim;
  },

  // ---- PESERTA ----
  async addPeserta(teamId, nama) {
    const docId = 'team_' + teamId;
    const t = this.getTeamById(teamId);
    if (!t) return;
    const updated = [...t.peserta, nama];
    await db.collection('team').doc(docId).update({ peserta: updated });
    t.peserta = updated;
  },

  async removePeserta(teamId, index) {
    const docId = 'team_' + teamId;
    const t = this.getTeamById(teamId);
    if (!t || t.peserta[index] === undefined) return;
    const updated = [...t.peserta];
    updated.splice(index, 1);
    await db.collection('team').doc(docId).update({ peserta: updated });
    t.peserta = updated;
  },

  // ---- PENILAIAN ----
  async loadPenilaian() {
    const snap = await db.collection('penilaian').get();
    this._penilaianCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  getPenilaian() {
    return this._penilaianCache;
  },

  getNilai(pos, teamId) {
    return this._penilaianCache.find(p => p.pos === pos && p.team_id === teamId);
  },

  async setNilai(pos, teamId, hasil, juri, catatan) {
    const docId = 'pos' + pos + '_team' + teamId;
    const poin = this.POIN[hasil] || 0;
    const entry = {
      team_id: teamId,
      pos: pos,
      hasil: hasil,
      poin: poin,
      juri: juri || '',
      catatan: catatan || '',
      timestamp: new Date().toISOString()
    };

    await db.collection('penilaian').doc(docId).set(entry);

    const idx = this._penilaianCache.findIndex(p => p.pos === pos && p.team_id === teamId);
    if (idx !== -1) {
      this._penilaianCache[idx] = { id: docId, ...entry };
    } else {
      this._penilaianCache.push({ id: docId, ...entry });
    }
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

  async clearPenilaian() {
    const snap = await db.collection('penilaian').get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    this._penilaianCache = [];
  },

  // ---- AUTH (localStorage still used for session) ----
  login(username, password) {
    const juriList = [
      { username: 'juri1', password: '1234', nama: 'Juri Pos 1 - Ular Naga', pos: 1 },
      { username: 'juri2', password: '1234', nama: 'Juri Pos 2 - Jembatan Kayu', pos: 2 },
      { username: 'juri3', password: '1234', nama: 'Juri Pos 3 - Leader Drill', pos: 3 },
      { username: 'juri4', password: '1234', nama: 'Juri Pos 4 - Lompat Karet', pos: 4 },
      { username: 'admin', password: 'admin', nama: 'Admin', pos: 0 }
    ];
    const found = juriList.find(j => j.username === username && j.password === password);
    if (found) {
      localStorage.setItem('usc2026_logged_in', JSON.stringify(found));
      return found;
    }
    return null;
  },

  logout() {
    localStorage.removeItem('usc2026_logged_in');
  },

  getLoggedIn() {
    const data = localStorage.getItem('usc2026_logged_in');
    return data ? JSON.parse(data) : null;
  }
};
