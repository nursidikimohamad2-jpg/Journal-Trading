/* =========================
   RR JOURNAL — APP.JS (HYBRID FINAL)
   ========================= */

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
const baseInput = $('#baseInput'), riskInput = $('#riskInput'), rValBox = $('#rValBox'), simBalBox = $('#simBalBox'), pnlMoneyBox = $('#pnlMoneyBox');
const saveProjectBtn = $('#saveProjectBtn'), openProjectsBtn = $('#openProjectsBtn'), saveToActiveBtn = $('#saveToActiveBtn');
const projectsModal = $('#projectsModal'), projectsList = $('#projectsList'), closeProjects = $('#closeProjects');
const saveProjectModal = $('#saveProjectModal');
const saveProjectName = $('#saveProjectName'), saveProjectNotes = $('#saveProjectNotes');
const cancelSaveProject = $('#cancelSaveProject'), confirmSaveProject = $('#confirmSaveProject');
const editModal = $('#editModal'), editForm = $('#editForm'), editCancel = $('#editCancel');

/* ===== storage keys ===== */
const STORE='rr_journal_active_v1',STORE_PROJ='rr_journal_projects_v1',ACTIVE_ID_KEY='rr_active_project_id',ACTIVE_NAME_KEY='rr_active_project_name',STORE_SETTINGS='rr_journal_settings_v1';

/* ===== helpers ===== */
const load=()=>JSON.parse(localStorage.getItem(STORE)||'[]');
const save=d=>localStorage.setItem(STORE,JSON.stringify(d));
const loadProj=()=>{try{return JSON.parse(localStorage.getItem(STORE_PROJ)||'[]')}catch{return[]}};
const saveProj=p=>localStorage.setItem(STORE_PROJ,JSON.stringify(p));
const loadSettings=()=>{try{return JSON.parse(localStorage.getItem(STORE_SETTINGS)||'{}')}catch{return{}}};
const saveSettings=s=>localStorage.setItem(STORE_SETTINGS,JSON.stringify(s));
const fmtDT=s=>s?s.replace('T',' '):'';
const toDTInput=s=>!s?'':(s.includes('T')?s:s.replace(' ','T'));
const nowISO=()=>new Date().toISOString();
const fmtMoney=n=>(isFinite(n)?n.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2}):'0.00');
const slugify=s=>(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')||'report';

/* =========================================================
   SYMBOLS HYBRID (LIST + MANUAL)
   ========================================================= */
const SYMBOLS=[
"EURUSD","GBPUSD","AUDUSD","NZDUSD","USDJPY","USDCHF","USDCAD",
"EURGBP","EURCHF","EURJPY","EURCAD","EURAUD","EURNZD",
"GBPJPY","GBPCHF","GBPAUD","GBPCAD","GBPNZD",
"AUDJPY","AUDNZD","AUDCAD","AUDCHF",
"NZDJPY","NZDCAD","NZDCHF",
"CADJPY","CHFJPY","CADCHF",
"XAUUSD","XAGUSD","US100"
];
function ensureSymbolInputHybrid(formEl){
  if(!formEl)return;
  const input=formEl.querySelector('input[name="symbol"]');
  if(!input)return;
  if(formEl.querySelector('datalist#symbolList'))return;
  const dl=document.createElement('datalist');
  dl.id='symbolList';
  SYMBOLS.forEach(s=>{
    const o=document.createElement('option');
    o.value=s;
    dl.appendChild(o);
  });
  input.setAttribute('list','symbolList');
  formEl.appendChild(dl);
}

/* =========================================================
   FAIR FOREX PRECISION
   ========================================================= */
function normalizeSymbol(s){return(s||'').toUpperCase().replace(/[^A-Z]/g,'').trim();}
function precisionForSymbol(symRaw){
  const s=normalizeSymbol(symRaw);
  if(!s)return 5;
  if(s.startsWith('XAU'))return 2;
  if(s.endsWith('JPY'))return 3;
  if(s==='US100'||s.startsWith('XAG'))return 2;
  return 5;
}
function stepForPrecision(p){return Number(`1e-${p}`);}
function roundTo(n,prec){const f=Math.pow(10,prec);return Math.round(Number(n||0)*f)/f;}
function toFixedBy(n,prec){return Number.isFinite(n)?Number(n).toFixed(prec):(0).toFixed(prec);}

/* =========================================================
   ACTIVE PROJECT
   ========================================================= */
function setActiveProject(id='',name=''){localStorage.setItem(ACTIVE_ID_KEY,id||'');localStorage.setItem(ACTIVE_NAME_KEY,name||'');updateActiveProjectUI();}
function getActiveProject(){return{id:localStorage.getItem(ACTIVE_ID_KEY)||'',name:localStorage.getItem(ACTIVE_NAME_KEY)||''};}
function updateActiveProjectUI(){
  const{id,name}=getActiveProject();
  if(id){saveToActiveBtn.classList.remove('hidden');saveToActiveBtn.textContent=`Simpan (${name})`;}
  else{saveToActiveBtn.classList.add('hidden');}
}

/* =========================================================
   PREVIEW & R LOGIC
   ========================================================= */
function calcPreview(entry,sl,side,prec=2){
  if(!Number.isFinite(entry)||!Number.isFinite(sl)){
    rPointEl.textContent='0.00';tp1El.textContent=tp2El.textContent=tp3El.textContent='0.00';return;
  }
  const d=Math.abs(entry-sl);
  rPointEl.textContent=toFixedBy(d,prec);
  const tp1=side==='LONG'?entry+d:entry-d;
  const tp2=side==='LONG'?entry+2*d:entry-2*d;
  const tp3=side==='LONG'?entry+3*d:entry-3*d;
  tp1El.textContent=toFixedBy(tp1,prec);tp2El.textContent=toFixedBy(tp2,prec);tp3El.textContent=toFixedBy(tp3,prec);
}
function rByResult(res){switch(res){case'SL':return[-1,-1,-1];case'TP1':return[1,-1,-1];case'TP2':return[1,2,-1];case'TP3':return[1,2,3];default:return[0,0,0];}}
function netROf(res){return res==='SL'?-1:res==='TP1'?1:res==='TP2'?2:res==='TP3'?3:0;}
function levelFromResult(res){return res==='TP3'?3:res==='TP2'?2:res==='TP1'?1:res==='SL'?0:null;}
function rCell(n){const c=n>0?'text-emerald-400':(n<0?'text-rose-400':'text-slate-400');return`<span class="${c}">${String(n)}</span>`;}

/* =========================================================
   TABLE + REFRESH
   ========================================================= */
function rowHTML(t){
  const[r1,r2,r3]=rByResult(t.result||'');const prec=precisionForSymbol(t.symbol);
  const fmt=v=>toFixedBy(v,prec);
  const resultSel=`<select data-id="${t.id}" data-field="result" class="bg-slate-900/70 border border-slate-700 rounded-lg px-2 py-1">
  <option value=""${!t.result?'selected':''}>-</option><option value="SL"${t.result==='SL'?'selected':''}>SL</option>
  <option value="TP1"${t.result==='TP1'?'selected':''}>TP1</option><option value="TP2"${t.result==='TP2'?'selected':''}>TP2</option>
  <option value="TP3"${t.result==='TP3'?'selected':''}>TP3</option></select>`;
  const buttons=`<div class="flex gap-2 justify-center"><button data-id="${t.id}" data-action="edit" class="bg-slate-900/70 border border-slate-700 rounded-lg px-2 py-1">✏️</button>
  <button data-id="${t.id}" data-action="del" class="bg-slate-900/70 border border-slate-700 rounded-lg px-2 py-1 hover:bg-rose-600 hover:text-white">🗑</button></div>`;
  return `<td>${fmtDT(t.setup_date||'')}</td><td>${normalizeSymbol(t.symbol)}</td><td class="text-center">${t.side}</td>
  <td class="text-right">${fmt(t.entry_price)}</td><td class="text-right">${fmt(t.stop_loss)}</td>
  <td class="text-right">${rCell(r1)}</td><td class="text-right">${rCell(r2)}</td><td class="text-right">${rCell(r3)}</td>
  <td>${resultSel}</td><td>${t.note||''}</td><td>${buttons}</td>`;
}
function refresh(){
  const data=load();tradeList.innerHTML='';totalTxBox.textContent=data.length;
  let tR1=0,tR2=0,tR3=0,nDone=0,n1=0,n2=0,n3=0,rnet=0;
  for(const t of data){
    const tr=document.createElement('tr');tr.className='hover:bg-slate-900/40';tr.innerHTML=rowHTML(t);tradeList.appendChild(tr);
    const[r1,r2,r3]=rByResult(t.result||'');tR1+=r1;tR2+=r2;tR3+=r3;rnet+=netROf(t.result||'');
    const lvl=levelFromResult(t.result||'');if(lvl!==null){nDone++;if(lvl>=1)n1++;if(lvl>=2)n2++;if(lvl>=3)n3++;}
  }
  totR1El.textContent=tR1;totR2El.textContent=tR2;totR3El.textContent=tR3;
  pBox1.textContent=nDone?Math.round(n1/nDone*100)+'%':'0%';
  pBox2.textContent=nDone?Math.round(n2/nDone*100)+'%':'0%';
  pBox3.textContent=nDone?Math.round(n3/nDone*100)+'%':'0%';
  calcSim(rnet);
}

/* =========================================================
   CRUD + EDIT MODAL
   ========================================================= */
function addTrade(o){const d=load();d.unshift(o);save(d);}
function updateTrade(id,p){const d=load();const i=d.findIndex(x=>x.id===id);if(i<0)return;d[i]={...d[i],...p};save(d);}
function deleteTrade(id){save(load().filter(x=>x.id!==id));}
function openEdit(id){
  const t=load().find(x=>x.id===id);if(!t)return;
  ensureSymbolInputHybrid(editForm);
  editForm.id.value=id;
  editForm.setup_date.value=toDTInput(t.setup_date||'');
  editForm.symbol.value=t.symbol||'';
  editForm.side.value=t.side||'LONG';
  editForm.entry_price.value=t.entry_price??0;
  editForm.stop_loss.value=t.stop_loss??0;
  editModal.classList.remove('hidden');editModal.classList.add('flex');
}
function closeEdit(){editModal.classList.add('hidden');editModal.classList.remove('flex');}

/* =========================================================
   SIMULASI & SETTINGS
   ========================================================= */
function getSettings(){return{base:parseFloat(baseInput?.value)||0,risk:parseFloat(riskInput?.value)||0};}
function setSettings({base=0,risk=0}={}){if(baseInput)baseInput.value=base;if(riskInput)riskInput.value=risk;saveSettings({base,risk});}
function currentOneR(){const s=getSettings();return s.base*(s.risk/100);}
function calcSim(){const s=getSettings();saveSettings(s);
  const oneR=currentOneR();const rTotal=load().reduce((a,t)=>a+netROf(t.result||''),0);
  const pnl=oneR*rTotal,eq=s.base+pnl;
  rValBox.textContent=fmtMoney(oneR);
  pnlMoneyBox.textContent=(pnl>=0?'+':'')+fmtMoney(pnl);
  simBalBox.textContent=fmtMoney(eq);
  [pnlMoneyBox,simBalBox].forEach(el=>{el.classList.remove('text-emerald-400','text-rose-400');const v=el===pnlMoneyBox?pnl:eq-s.base;el.classList.add(v>=0?'text-emerald-400':'text-rose-400');});
}

/* =========================================================
   EXPORT HTML (Tetap utuh)
   ========================================================= */
function computeStats(trades){
  let rnet=0;for(const t of trades)rnet+=netROf(t.result||'');
  const{base,risk}=getSettings();const oneR=base*(risk/100);const pnl=oneR*rnet;const eq=base+pnl;
  return{base,risk,oneR,rnet,pnl,eq};
}
function buildReportHTML({projectName,createdAt,stats}){
  return`<!doctype html><html lang='id'><head><meta charset='utf-8'><title>${projectName}</title></head>
  <body style="font-family:Inter,system-ui;background:#0b1220;color:#e2e8f0;padding:24px">
  <h1>${projectName}</h1><p>Dibuat: ${createdAt}</p>
  <p>Modal: $${stats.base.toFixed(2)} | Risk: ${stats.risk}% | 1R = $${stats.oneR.toFixed(2)}</p>
  <p>Total R: ${stats.rnet} | PnL: $${stats.pnl.toFixed(2)} | Equity: $${stats.eq?.toFixed?.(2)||stats.eq}</p>
  </body></html>`;
}
exportHtmlBtn?.addEventListener('click',()=>{
  try{
    const trades=load();const{name}=getActiveProject();const projectName=name||'Jurnal Aktif';
    const stats=computeStats(trades);
    const html=buildReportHTML({projectName,createdAt:new Date().toLocaleString('id-ID'),stats});
    const blob=new Blob([html],{type:'text/html'});const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=`rr-report-${slugify(projectName)}.html`;a.click();
    URL.revokeObjectURL(a.href);
  }catch(err){alert('Gagal export HTML: '+err.message);}
});

/* =========================================================
   EVENTS & INIT
   ========================================================= */
ensureSymbolInputHybrid(form);
form.addEventListener('input',()=>{
  const p=precisionForSymbol(form.symbol.value);
  form.entry_price.step=stepForPrecision(p);
  form.stop_loss.step=stepForPrecision(p);
  calcPreview(Number(form.entry_price.value),Number(form.stop_loss.value),form.side.value,p);
});
form.addEventListener('submit',e=>{
  e.preventDefault();
  const s=normalizeSymbol(form.symbol.value);
  const p=precisionForSymbol(s);
  const entry=Number(form.entry_price.value),sl=Number(form.stop_loss.value);
  if(!s||!Number.isFinite(entry)||!Number.isFinite(sl)){alert('Isi data valid.');return;}
  addTrade({id:uid(),symbol:s,side:form.side.value,entry_price:roundTo(entry,p),stop_loss:roundTo(sl,p),precision:p,setup_date:form.setup_date.value||'',note:form.note.value||'',result:''});
  form.reset();calcSim();refresh();
});
tradeList.addEventListener('click',e=>{
  const b=e.target.closest('button[data-action]');if(!b)return;
  const id=b.dataset.id;if(b.dataset.action==='del'){deleteTrade(id);refresh();}
  if(b.dataset.action==='edit'){openEdit(id);}
});
tradeList.addEventListener('change',e=>{
  const s=e.target.closest('select[data-id]');if(s){updateTrade(s.dataset.id,{[s.dataset.field]:s.value});refresh();}
});
editCancel.addEventListener('click',closeEdit);
editForm.addEventListener('input',()=>{
  const p=precisionForSymbol(editForm.symbol.value);
  editForm.entry_price.step=stepForPrecision(p);
  editForm.stop_loss.step=stepForPrecision(p);
});
editForm.addEventListener('submit',e=>{
  e.preventDefault();
  const s=normalizeSymbol(editForm.symbol.value);const p=precisionForSymbol(s);
  updateTrade(editForm.id.value,{setup_date:editForm.setup_date.value,symbol:s,side:editForm.side.value,entry_price:roundTo(Number(editForm.entry_price.value),p),stop_loss:roundTo(Number(editForm.stop_loss.value),p),precision:p});
  closeEdit();refresh();
});

/* ===== init ===== */
setSettings(loadSettings());
refresh();
updateActiveProjectUI();
ensureSymbolInputHybrid(editForm);
calcSim();
