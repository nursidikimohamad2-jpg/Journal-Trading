/* ===== util DOM ===== */
const $ = q => document.querySelector(q);
const uid = () => Math.random().toString(36).slice(2,9);

/* ===== refs ===== */
const form = $('#tradeForm');
const rPointEl = $('#rPoint'), tp1El = $('#tp1Display'), tp2El = $('#tp2Display'), tp3El = $('#tp3Display');
const pBox1 = $('#pBox1'), pBox2 = $('#pBox2'), pBox3 = $('#pBox3'), totalTxBox = $('#totalTxBox');
const tradeList = $('#tradeList'), totR1El = $('#totR1'), totR2El = $('#totR2'), totR3El = $('#totR3');

const exportBtn = $('#exportBtn'), importInput = $('#importInput'), clearBtn = $('#clearBtn');
const exportHtmlBtn = $('#exportHtmlBtn');

/* ===== Simulasi Balance (editable input) ===== */
const baseInput = $('#baseInput');     // Modal (USD)
const riskInput = $('#riskInput');     // Risk % per trade
const rValBox = $('#rValBox');         // 1R (USD)
const simBalBox = $('#simBalBox');     // Equity (sim)
const pnlMoneyBox = $('#pnlMoneyBox'); // P/L (sim)

/* ===== Projects ===== */
const saveProjectBtn = $('#saveProjectBtn'), openProjectsBtn = $('#openProjectsBtn');
const saveToActiveBtn = $('#saveToActiveBtn');

const projectsModal = $('#projectsModal'), projectsList = $('#projectsList'), closeProjects = $('#closeProjects');

const saveProjectModal = $('#saveProjectModal');
const saveProjectName = $('#saveProjectName');
const saveProjectNotes = $('#saveProjectNotes');
const cancelSaveProject = $('#cancelSaveProject');
const confirmSaveProject = $('#confirmSaveProject');

const editModal = $('#editModal'), editForm = $('#editForm'), editCancel = $('#editCancel');

/* ===== storage keys ===== */
const STORE       = 'rr_journal_active_v1';
const STORE_PROJ  = 'rr_journal_projects_v1';
const ACTIVE_ID_KEY   = 'rr_active_project_id';
const ACTIVE_NAME_KEY = 'rr_active_project_name';
const STORE_SETTINGS  = 'rr_journal_settings_v1'; // { base, risk }

/* ===== storage helpers ===== */
const load       = () => JSON.parse(localStorage.getItem(STORE) || '[]');
const save       = d  => localStorage.setItem(STORE, JSON.stringify(d));
const loadProj   = () => { try { return JSON.parse(localStorage.getItem(STORE_PROJ) || '[]'); } catch { localStorage.removeItem(STORE_PROJ); return []; } };
const saveProj   = p  => localStorage.setItem(STORE_PROJ, JSON.stringify(p));
const loadSettings = () => { try { return JSON.parse(localStorage.getItem(STORE_SETTINGS) || '{}'); } catch { return {}; } };
const saveSettings = s  => localStorage.setItem(STORE_SETTINGS, JSON.stringify(s));

/* ===== helpers ===== */
const fmtDT     = s => s ? s.replace('T',' ') : '';
const toDTInput = s => !s ? '' : (s.includes('T') ? s : s.replace(' ', 'T'));
const nowISO    = () => new Date().toISOString();
const fmtMoney  = n => (isFinite(n) ? n.toLocaleString('id-ID',{minimumFractionDigits:2, maximumFractionDigits:2}) : '0.00');

function setActiveProject(id='', name=''){
  localStorage.setItem(ACTIVE_ID_KEY, id || '');
  localStorage.setItem(ACTIVE_NAME_KEY, name || '');
  updateActiveProjectUI();
}
function getActiveProject(){
  return {
    id:   localStorage.getItem(ACTIVE_ID_KEY)   || '',
    name: localStorage.getItem(ACTIVE_NAME_KEY) || ''
  };
}
function updateActiveProjectUI(){
  const { id, name } = getActiveProject();
  if (id) {
    saveToActiveBtn?.classList.remove('hidden');
    if (saveToActiveBtn) saveToActiveBtn.textContent = `Simpan (${name})`;
  } else {
    saveToActiveBtn?.classList.add('hidden');
  }
}

/* ===== preview ===== */
function calcPreview(entry, sl, side){
  const ok = Number.isFinite(entry) && Number.isFinite(sl);
  if (!ok){ rPointEl.textContent='0.00'; tp1El.textContent=tp2El.textContent=tp3El.textContent='0.00'; return; }
  const d = Math.abs(entry - sl);
  rPointEl.textContent = d.toFixed(2);
  const tp1 = side==='LONG'? entry+d : entry-d;
  const tp2 = side==='LONG'? entry+2*d : entry-2*d;
  const tp3 = side==='LONG'? entry+3*d : entry-3*d;
  tp1El.textContent = tp1.toFixed(2);
  tp2El.textContent = tp2.toFixed(2);
  tp3El.textContent = tp3.toFixed(2);
}

/* ===== R calc ===== */
function rByResult(res){
  switch(res){
    case 'SL':  return [-1,-1,-1];
    case 'TP1': return [ 1,-1,-1];
    case 'TP2': return [ 1, 2,-1];
    case 'TP3': return [ 1, 2, 3];
    default:    return [ 0, 0, 0];
  }
}
function levelFromResult(res){
  switch(res){ case 'TP3':return 3; case 'TP2':return 2; case 'TP1':return 1; case 'SL':return 0; default:return null; }
}
function netROf(res){
  if(res==='SL')  return -1;
  if(res==='TP1') return  1;
  if(res==='TP2') return  2;
  if(res==='TP3') return  3;
  return 0;
}
function rCell(n){
  const c = n>0 ? 'text-emerald-400' : (n<0 ? 'text-rose-400' : 'text-slate-400');
  return `<span class="${c}">${String(n)}</span>`;
}

/* ===== table row ===== */
function rowHTML(t){
  const [r1,r2,r3] = rByResult(t.result||'');
  const resultSel = `
    <select data-id="${t.id}" data-field="result"
      class="bg-slate-900/70 border border-slate-700 rounded-lg px-2 py-1">
      <option value=""   ${!t.result?'selected':''}>-</option>
      <option value="SL" ${t.result==='SL'?'selected':''}>SL</option>
      <option value="TP1"${t.result==='TP1'?'selected':''}>TP1</option>
      <option value="TP2"${t.result==='TP2'?'selected':''}>TP2</option>
      <option value="TP3"${t.result==='TP3'?'selected':''}>TP3</option>
    </select>`;
  const buttons = `
    <div class="flex items-center gap-2 justify-center">
      <button data-id="${t.id}" data-action="edit"
        class="bg-slate-900/70 border border-slate-700 rounded-lg px-2 py-1" title="Edit">✏️</button>
      <button data-id="${t.id}" data-action="del"
        class="bg-slate-900/70 border border-slate-700 rounded-lg px-2 py-1 hover:bg-rose-600 hover:text-white" title="Hapus">🗑</button>
    </div>`;
  return `
    <td class="px-3 py-2">${fmtDT(t.setup_date||'')}</td>
    <td class="px-3 py-2">${t.symbol}</td>
    <td class="px-3 py-2 text-center">${t.side}</td>
    <td class="px-3 py-2 text-right">${t.entry_price}</td>
    <td class="px-3 py-2 text-right">${t.stop_loss}</td>
    <td class="px-3 py-2 text-right">${rCell(r1)}</td>
    <td class="px-3 py-2 text-right">${rCell(r2)}</td>
    <td class="px-3 py-2 text-right">${rCell(r3)}</td>
    <td class="px-3 py-2 text-right">${resultSel}</td>
    <td class="px-3 py-2 text-left">${t.note || ''}</td>
    <td class="px-3 py-2">${buttons}</td>
  `;
}

/* ===== refresh UI + prob & sim ===== */
function refresh(){
  const data = load();
  tradeList.innerHTML = '';
  totalTxBox.textContent = String(data.length);

  let tR1=0,tR2=0,tR3=0, nDone=0, n1=0, n2=0, n3=0, rnet=0;

  for(const t of data){
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-900/40 transition-colors';
    tr.innerHTML = rowHTML(t);
    tradeList.appendChild(tr);

    const [r1,r2,r3] = rByResult(t.result||'');
    tR1+=r1; tR2+=r2; tR3+=r3;
    rnet += netROf(t.result||'');

    const lvl = levelFromResult(t.result||'');
    if(lvl!==null){ nDone++; if(lvl>=1) n1++; if(lvl>=2) n2++; if(lvl>=3) n3++; }
  }

  const setTot=(el,v)=>{ el.textContent=String(v); el.className='px-3 py-2 text-right font-semibold '+(v>0?'text-emerald-400':(v<0?'text-rose-400':'')); };
  setTot(totR1El,tR1); setTot(totR2El,tR2); setTot(totR3El,tR3);

  const pct = x => (nDone>0?Math.round(x/nDone*100):0)+'%';
  pBox1.textContent = pct(n1); pBox2.textContent = pct(n2); pBox3.textContent = pct(n3);

  // update simulasi balance
  calcSim(rnet);
}

/* ===== CRUD data ===== */
function addTrade(obj){ const data = load(); data.unshift(obj); save(data); }
function updateTrade(id, patch){ const data = load(); const i = data.findIndex(x=>x.id===id); if(i<0) return; data[i] = {...data[i], ...patch}; save(data); }
function deleteTrade(id){ save(load().filter(x=>x.id!==id)); }

/* ===== edit modal ===== */
function openEdit(id){
  const t = load().find(x=>x.id===id); if(!t) return;
  editForm.id.value = id;
  editForm.setup_date.value = toDTInput(t.setup_date || '');
  editForm.symbol.value = t.symbol || '';
  editForm.side.value = t.side || 'LONG';
  editForm.entry_price.value = t.entry_price ?? 0;
  editForm.stop_loss.value  = t.stop_loss  ?? 0;
  editModal.classList.remove('hidden'); editModal.classList.add('flex');
}
function closeEdit(){ editModal.classList.add('hidden'); editModal.classList.remove('flex'); }

/* ===== projects modal ===== */
function renderProjects(){
  const items = loadProj();
  projectsList.innerHTML = '';
  if(items.length===0){
    projectsList.innerHTML = `<div class="text-slate-400">Belum ada project.</div>`;
    return;
  }
  for(const p of items){
    const div = document.createElement('div');
    const created = p.createdAt?.replace('T',' ').slice(0,16) || '-';
    const updated = p.updatedAt?.replace('T',' ').slice(0,16) || '-';
    div.className = 'bg-slate-900/70 ring-1 ring-white/10 rounded-xl p-4 flex flex-wrap items-center gap-3';
    div.innerHTML = `
      <div class="flex-1">
        <div class="font-semibold">${p.name}</div>
        <div class="text-slate-400 text-sm">Transaksi: ${p.trades.length} • Catatan: ${p.notes||'-'}</div>
        <div class="text-slate-500 text-xs">Dibuat: ${created} • Update: ${updated}</div>
      </div>
      <div class="flex items-center gap-2">
        <button data-id="${p.id}" data-act="open" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-lg">Lanjut Journal</button>
        <button data-id="${p.id}" data-act="del" class="bg-rose-600 hover:bg-rose-500 text-white px-3 py-1 rounded-lg">Hapus</button>
      </div>
    `;
    projectsList.appendChild(div);
  }
}
function openProjects(){ renderProjects(); projectsModal.classList.remove('hidden'); projectsModal.classList.add('flex'); }
function closeProjectsModal(){ projectsModal.classList.add('hidden'); projectsModal.classList.remove('flex'); }

/* ===== save project modal ===== */
function openSaveProjectModal(){
  saveProjectName.value = '';
  saveProjectNotes.value = '';
  saveProjectModal.classList.remove('hidden'); saveProjectModal.classList.add('flex');
  setTimeout(()=>saveProjectName.focus(),50);
}
function closeSaveProjectModal(){ saveProjectModal.classList.add('hidden'); saveProjectModal.classList.remove('flex'); }

/* ===== events ===== */
form.addEventListener('input', ()=>{
  calcPreview(Number(form.entry_price.value), Number(form.stop_loss.value), form.side.value);
});

/* validasi + tambah row  (TIDAK reset modal/risk) */
form.addEventListener('submit', e=>{
  e.preventDefault();

  // simpan nilai modal/risk sekarang agar tidak ikut ke-reset
  const keepSettings = getSettings();

  const symbol = (form.symbol.value || '').trim();
  const side   = form.side.value;
  const entry  = Number(form.entry_price.value);
  const sl     = Number(form.stop_loss.value);

  if (!symbol || !Number.isFinite(entry) || !Number.isFinite(sl)) {
    alert('Isi minimal: Symbol, Entry, dan Stop Loss dengan nilai yang valid.');
    return;
  }
  if (entry === sl) {
    alert('Entry dan Stop Loss tidak boleh sama.');
    return;
  }

  addTrade({
    id: uid(),
    symbol,
    side,
    entry_price: entry,
    stop_loss: sl,
    setup_date: form.setup_date.value || '',
    note: form.note.value || '',
    result: ''
  });

  // reset field trade saja
  form.reset();

  // kembalikan modal/risk (project berjalan)
  setSettings(keepSettings);
  calcSim(); // recompute 1R & P/L

  rPointEl.textContent = tp1El.textContent = tp2El.textContent = tp3El.textContent = '0.00';
  refresh();
});

/* tombol reset form -> jangan hapus modal/risk */
form.addEventListener('reset', ()=>{
  const s = loadSettings();
  setTimeout(()=>{ setSettings(s); calcSim(); }, 0);
});

tradeList.addEventListener('change', e=>{
  const sel = e.target.closest('select[data-id]');
  if(sel){ updateTrade(sel.dataset.id, { [sel.dataset.field||'result']: sel.value }); refresh(); }
});
tradeList.addEventListener('click', e=>{
  const btn = e.target.closest('button[data-action]'); if(!btn) return;
  const id = btn.dataset.id;
  if(btn.dataset.action==='del'){ deleteTrade(id); refresh(); }
  if(btn.dataset.action==='edit'){ openEdit(id); }
});

editCancel.addEventListener('click', closeEdit);
editForm.addEventListener('submit', e=>{
  e.preventDefault();
  updateTrade(editForm.id.value, {
    setup_date: editForm.setup_date.value || '',
    symbol: editForm.symbol.value || '',
    side: editForm.side.value,
    entry_price: Number(editForm.entry_price.value)||0,
    stop_loss:  Number(editForm.stop_loss.value)||0
  });
  closeEdit(); refresh();
});

document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ closeEdit(); closeProjectsModal(); closeSaveProjectModal(); }
});

/* export/import/clear */
exportBtn?.addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(load(), null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='rr-journal.json'; a.click(); URL.revokeObjectURL(a.href);
});
importInput?.addEventListener('change', async e=>{
  const f = e.target.files[0]; if(!f) return;
  try { const txt = await f.text(); const data = JSON.parse(txt); if(Array.isArray(data)) save(data); } catch {}
  importInput.value=''; refresh();
});
clearBtn?.addEventListener('click', ()=>{
  if(confirm('Hapus semua data jurnal aktif?')){
    localStorage.removeItem(STORE);
    refresh();
    // setActiveProject('', ''); // jika ingin menonaktifkan status project aktif
  }
});

/* ===== Projects: Save / Open / Delete ===== */
saveProjectBtn?.addEventListener('click', openSaveProjectModal);
cancelSaveProject?.addEventListener('click', closeSaveProjectModal);

confirmSaveProject?.addEventListener('click', ()=>{
  const trades = load();
  if (!trades.length) {
    alert('Belum ada data jurnal untuk disimpan.');
    return;
  }

  const name = (saveProjectName.value||'').trim();
  if (!name) {
    alert('Nama Project wajib diisi.');
    saveProjectName.focus();
    return;
  }

  const notes = (saveProjectNotes.value||'').trim();
  const projects = loadProj();
  const existing = projects.find(p => p.name.toLowerCase() === name.toLowerCase());
  const snapshot = JSON.parse(JSON.stringify(trades));

  // sertakan settings saat simpan
  const settings = getSettings();

  if (existing) {
    if(!confirm(`Project "${existing.name}" sudah ada.\nUpdate isi project ini?`)) return;
    existing.trades = snapshot;
    existing.notes  = notes;
    existing.settings = settings;
    existing.updatedAt = nowISO();
    saveProj(projects);
    setActiveProject(existing.id, existing.name);
  } else {
    const newItem = {
      id: uid(), name,
      createdAt: nowISO(), updatedAt: nowISO(),
      notes, trades: snapshot,
      settings
    };
    projects.unshift(newItem);
    saveProj(projects);
    setActiveProject(newItem.id, newItem.name);
  }

  save([]);       // kosongkan jurnal aktif
  refresh();
  closeSaveProjectModal();
  openProjects(); // tampilkan daftar setelah simpan
});

/* buka/tutup modal projects */
openProjectsBtn?.addEventListener('click', openProjects);
closeProjects?.addEventListener('click', closeProjectsModal);

/* tombol dalam daftar projects */
projectsList?.addEventListener('click', e=>{
  const btn = e.target.closest('button[data-act]'); if(!btn) return;
  const id = btn.dataset.id; const projects = loadProj(); const item = projects.find(p=>p.id===id); if(!item) return;

  if(btn.dataset.act==='open'){
    save(item.trades); refresh(); closeProjectsModal();
    setActiveProject(item.id, item.name);
    // restore settings utk project ini jika ada
    if(item.settings){
      setSettings(item.settings);
      calcSim(); // recalc
    }
  }else if(btn.dataset.act==='del'){
    if(confirm(`Hapus project "${item.name}"?`)){
      saveProj(projects.filter(p=>p.id!==id));
      const act = getActiveProject();
      if(act.id===id) setActiveProject('', '');
      renderProjects();
    }
  }
});

/* simpan langsung ke project aktif */
saveToActiveBtn?.addEventListener('click', () => {
  const { id, name } = getActiveProject();
  if (!id) { alert('Belum ada project aktif. Buka "Projects" lalu pilih "Lanjut Journal".'); return; }

  const projects = loadProj();
  const p = projects.find(x => x.id === id);
  if (!p) {
    alert('Project aktif tidak ditemukan. Silakan pilih ulang di "Projects".');
    setActiveProject('', '');
    return;
  }

  p.trades    = load();
  p.settings  = getSettings();
  p.updatedAt = nowISO();
  saveProj(projects);

  alert(`Perubahan disimpan ke project "${name}".`);
});

/* ===== Simulasi Balance ===== */
function getSettings(){
  return {
    base: parseFloat(baseInput?.value) || 0,
    risk: parseFloat(riskInput?.value) || 0
  };
}
function setSettings({base=0, risk=0}={}){
  if(baseInput) baseInput.value = (base ?? '');
  if(riskInput) riskInput.value = (risk ?? '');
  saveSettings({base, risk});
}
function currentOneR(){
  const s = getSettings();
  return s.base * (s.risk/100);
}
function calcSim(_rnetFromRefresh){
  const s = getSettings();
  // persist every change
  saveSettings(s);

  const oneR = currentOneR();
  const rTotal = load().reduce((acc,t)=>{ const [x1,x2,x3]=rByResult((t.result||'')); return acc + x1 + x2 + x3; }, 0);
  const pnl  = oneR * rTotal;
  const eq   = s.base + pnl;

  if(rValBox)     rValBox.textContent     = fmtMoney(oneR);
  if(pnlMoneyBox) pnlMoneyBox.textContent = (pnl>=0? '+' : '') + fmtMoney(pnl);
  if(simBalBox)   simBalBox.textContent   = fmtMoney(eq);

  // tint color based on +/-
  [pnlMoneyBox, simBalBox].forEach(el=>{
    if(!el) return;
    el.classList.remove('text-emerald-400','text-rose-400');
    const v = el===pnlMoneyBox ? pnl : eq - s.base; // equity > base -> hijau
    el.classList.add(v>=0 ? 'text-emerald-400' : 'text-rose-400');
  });
}

/* init settings from localStorage */
(function initSettings(){
  const s = loadSettings();
  if(baseInput) baseInput.value = (s.base ?? '');
  if(riskInput) riskInput.value = (s.risk ?? '');
  baseInput?.addEventListener('input', ()=> calcSim());
  riskInput?.addEventListener('input', ()=> calcSim());
})();

/* =====================================================
   EXPORT HTML (ringkasan + simulasi balance)
   ===================================================== */

function downloadTextFile(filename, text, mime = 'text/html') {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function slugify(s){ return (s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') || 'report'; }

/* ===== hitung statistik + simulasi ===== */
function computeStats(trades){
  let nDone=0,n1=0,n2=0,n3=0;
  let r1=0,r2=0,r3=0,rnet=0;
  const dates=[];

  // exact hasil per kategori
  const resultCounts = { SL:0, TP1:0, TP2:0, TP3:0 };

  for (const t of trades){
    if (t.setup_date) dates.push(t.setup_date);

    const res = t.result || '';
    const [x1,x2,x3] = rByResult(res);
    r1 += x1; r2 += x2; r3 += x3;      // ΣR komponen
    rnet += netROf(res);               // R final / net

    const lvl = levelFromResult(res);
    if (lvl !== null){ nDone++; if(lvl>=1)n1++; if(lvl>=2)n2++; if(lvl>=3)n3++; }

    if (res==='SL')  resultCounts.SL++;
    if (res==='TP1') resultCounts.TP1++;
    if (res==='TP2') resultCounts.TP2++;
    if (res==='TP3') resultCounts.TP3++;
  }

  // kumulatif (≥TPn): TP3 dihitung juga untuk ≥TP2 & ≥TP1, TP2 dihitung juga untuk ≥TP1
  const cumulativeWin = {
    ge_tp1: resultCounts.TP1 + resultCounts.TP2 + resultCounts.TP3,
    ge_tp2: resultCounts.TP2 + resultCounts.TP3,
    ge_tp3: resultCounts.TP3
  };

  const pct=(x,b)=>b>0?Math.round(x/b*100):0;

  // rentang tanggal
  let minDate='', maxDate='';
  if (dates.length){
    const arr = dates.slice().sort();
    minDate = (arr[0]||'').replace('T',' ');
    maxDate = (arr[arr.length-1]||'').replace('T',' ');
  }

  // simulasi balance
  const { base, risk } = getSettings();
  const oneR = base * (risk/100);

  const sim1   = { sumR:r1,             pnl: oneR*r1,             equity: base + oneR*r1 };
  const sim2   = { sumR:r2,             pnl: oneR*r2,             equity: base + oneR*r2 };
  const sim3   = { sumR:r3,             pnl: oneR*r3,             equity: base + oneR*r3 };
  const simAll = { sumR:r1+r2+r3,       pnl: oneR*(r1+r2+r3),     equity: base + oneR*(r1+r2+r3) };

  // urutan hasil aktual → streak & DD
  const seq = trades.map(t=>netROf(t.result||'')).filter(v=>v!==0);

  let curW=0,curL=0,maxW=0,maxL=0;
  for (const v of seq){
    if (v>0){ curW++; if(curW>maxW)maxW=curW; curL=0; }
    else if (v<0){ curL++; if(curL>maxL)maxL=curL; curW=0; }
  }

  let equity=base, peak=base, maxDD=0, minEq=base, maxEq=base;
  for (const v of seq){
    equity += oneR*v;
    peak = Math.max(peak, equity);
    maxDD = Math.max(maxDD, peak - equity);
    minEq = Math.min(minEq, equity);
    maxEq = Math.max(maxEq, equity);
  }
  const ddPct = peak>0 ? +(maxDD/peak*100).toFixed(2) : 0;

  let curProfitR=0, maxProfitR=0;
  for (const v of seq){
    if (v>0){ curProfitR += v; if(curProfitR>maxProfitR) maxProfitR=curProfitR; }
    else { curProfitR=0; }
  }

  const wins   = resultCounts.TP1 + resultCounts.TP2 + resultCounts.TP3;
  const losses = resultCounts.SL;

  return {
    total: trades.length,
    prob: { tp1:pct(n1,nDone), tp2:pct(n2,nDone), tp3:pct(n3,nDone) },
    rsum: { r1, r2, r3 },
    rsumTotal: rnet,                       // Total R (final/net)
    rsumComponentsTotal: r1 + r2 + r3,     // ΣR komponen
    range: { min:minDate, max:maxDate },

    results: {
      counts: resultCounts,                // exact
      cumulative: cumulativeWin,           // kumulatif ≥TP
      wins, losses
    },

    sim: {
      base, risk, oneR,
      pnl: oneR*rnet,
      equity: base + oneR*rnet,
      scenarios: { rr1:sim1, rr2:sim2, rr3:sim3, combined:simAll }
    },

    streak: {
      maxConsecWin: maxW,
      maxConsecLoss: maxL,
      maxConsecProfitR: maxProfitR,
      maxConsecProfitUSD: oneR*maxProfitR
    },

    drawdown: { maxAbs:maxDD, maxPct:ddPct, minEquity:minEq, maxEquity:maxEq }
  };
}

/* ===== template laporan HTML ===== */
function buildReportHTML({ projectName, createdAt, stats }) {
  const css = `
  :root{--bg:#0b1220;--panel:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--pos:#10b981;--neg:#f43f5e}
  *{box-sizing:border-box}
  body{margin:0;background:linear-gradient(#0b1220,#0a1020);color:var(--text);font:14px/1.45 system-ui,Inter,Segoe UI,Roboto}
  .wrap{max-width:1024px;margin:0 auto;padding:24px}
  .grid{display:grid;gap:12px}
  .g-4{grid-template-columns:repeat(4,1fr);align-items:stretch}
  .card{background:rgba(15,23,42,.9);border:1px solid rgba(255,255,255,.08);border-radius:12px;
        padding:16px;display:flex;flex-direction:column;justify-content:space-between}
  .muted{color:var(--muted)} .big{font-size:22px;font-weight:700}
  .row{display:flex;gap:12px;align-items:center}
  .bar{height:8px;background:#0b7180;border-radius:2px;overflow:hidden;flex:1}
  .bar>i{display:block;height:100%;background:linear-gradient(90deg,#0ea5e9,#10b981)}
  .pos{color:var(--pos)} .neg{color:var(--neg)}
  .footer{color:#6b7280;font-size:12px;text-align:right;margin-top:24px}
  .r-list{display:flex;flex-direction:column;gap:6px;line-height:1.4}
  @media print{body{background:#fff;color:#000}.card{background:#fff;border-color:#ddd}}
  `;
  const fmtMoney = n => (+n).toLocaleString('id-ID',{minimumFractionDigits:2});
  const sign = n => n>=0?'pos':'neg';

  return `<!doctype html>
  <html lang="id"><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Laporan — ${projectName}</title><style>${css}</style></head>
  <body><div class="wrap">

    <div class="card" style="margin-bottom:12px;height:auto">
      <h1>${projectName}</h1>
      <div class="muted">Dibuat: ${createdAt} • Rentang: ${stats.range.min||'-'} — ${stats.range.max||'-'}</div>
    </div>

    <!-- Probabilitas -->
    <div class="grid g-4" style="margin-bottom:12px">
      <div class="card"><div class="muted">Jumlah Transaksi</div><div class="big">${stats.total}</div></div>
      <div class="card"><div class="muted">Prob ≥ TP1</div><div class="row"><div class="big">${stats.prob.tp1}%</div><div class="bar"><i style="width:${stats.prob.tp1}%"></i></div></div></div>
      <div class="card"><div class="muted">Prob ≥ TP2</div><div class="row"><div class="big">${stats.prob.tp2}%</div><div class="bar"><i style="width:${stats.prob.tp2}%"></i></div></div></div>
      <div class="card"><div class="muted">Prob ≥ TP3</div><div class="row"><div class="big">${stats.prob.tp3}%</div><div class="bar"><i style="width:${stats.prob.tp3}%"></i></div></div></div>
    </div>

    <!-- Ringkasan R -->
    <div class="grid g-4" style="margin-bottom:12px">
      <div class="card">
        <div class="muted">Total R (Final / Net)</div>
        <div class="big ${sign(stats.rsumTotal)}">${stats.rsumTotal}</div>
      </div>
      <div class="card">
        <div class="muted">ΣR Komponen (R1+R2+R3)</div>
        <div class="big ${sign(stats.rsumComponentsTotal)}">${stats.rsumComponentsTotal}</div>
      </div>
      <div class="card">
        <div class="muted">Akumulasi R</div>
        <div class="r-list">
          <div>R1: <b class="${sign(stats.rsum.r1)}">${stats.rsum.r1}</b></div>
          <div>R2: <b class="${sign(stats.rsum.r2)}">${stats.rsum.r2}</b></div>
          <div>R3: <b class="${sign(stats.rsum.r3)}">${stats.rsum.r3}</b></div>
        </div>
      </div>
      <div class="card">
        <div class="muted">Simulasi Balance</div>
        <div>Modal: <b>$${Number(stats.sim.base).toLocaleString('id-ID')}</b></div>
        <div>Risk/trade: <b>${(+stats.sim.risk).toFixed(2)}%</b> • 1R: <b>$${fmtMoney(stats.sim.oneR)}</b></div>
      </div>
    </div>

    <!-- Skenario -->
    <div class="grid g-4" style="margin-bottom:12px">
      ${['rr1','rr2','rr3','combined'].map(k=>{
        const label={rr1:'TP1',rr2:'TP2',rr3:'TP3',combined:'Semua R'}[k];
        const s=stats.sim.scenarios[k];
        return `<div class="card">
          <div class="muted">${label}</div>
          <div>Equity: <b>$${fmtMoney(s.equity)}</b></div>
          <div>P/L: <b class="${sign(s.pnl)}">$${fmtMoney(s.pnl)}</b></div>
          <div>ΣR: <b class="${sign(s.sumR)}">${s.sumR}</b></div>
        </div>`;
      }).join('')}
    </div>

    <!-- Win/Loss detail + DD -->
    <div class="grid g-4">
      <div class="card">
        <div class="muted">Win (berdasarkan TP)</div>
        <div class="r-list">
          <div>TP1: <b class="pos">${stats.counts.tp1}</b></div>
          <div>TP2: <b class="pos">${stats.counts.tp2}</b></div>
          <div>TP3: <b class="pos">${stats.counts.tp3}</b></div>
          <div>Total Win: <b class="pos">${stats.wins}</b></div>
          <div class="muted">Win Streak: <b>${stats.streak.maxConsecWin}</b></div>
        </div>
      </div>

      <div class="card">
        <div class="muted">Loss</div>
        <div class="r-list">
          <div>SL: <b class="neg">${stats.counts.sl}</b></div>
          <div>Total Loss: <b class="neg">${stats.losses}</b></div>
          <div class="muted">Loss Streak: <b class="${stats.streak.maxConsecLoss>0?'neg':''}">${stats.streak.maxConsecLoss}</b></div>
        </div>
      </div>

      <div class="card">
        <div class="muted">Consec. Profit (maks)</div>
        <div><b class="pos">$${fmtMoney(stats.streak.maxConsecProfitUSD)}</b></div>
        <div><b class="pos">${stats.streak.maxConsecProfitR}R</b></div>
      </div>
      <div class="card">
        <div class="muted">Max Drawdown</div>
        <div><b class="neg">$${fmtMoney(stats.drawdown.maxAbs)}</b></div>
        <div><b class="neg">${stats.drawdown.maxPct}%</b></div>
      </div>
    </div>

    <div class="footer">RR Journal — Export HTML</div>
  </div></body></html>`;
}

/* ===== handler tombol Export HTML ===== */
exportHtmlBtn?.addEventListener('click', ()=>{
  const trades=load();
  const {name:activeName}=getActiveProject();
  const projectName=activeName||'Jurnal Aktif';
  const stats=computeStats(trades);
  const html=buildReportHTML({
    projectName,
    createdAt:new Date().toLocaleString('id-ID'),
    stats
  });
  const fname=`rr-report-${slugify(projectName)}.html`;
  downloadTextFile(fname,html,'text/html');
});

/* ===== init ===== */
refresh();
updateActiveProjectUI();
calcSim();
