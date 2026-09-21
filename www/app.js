const STORE='mrl-hakedis-v1',HISTORY='mrl-hakedis-history-v1',$=id=>document.getElementById(id);
const uid=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
const clone=x=>JSON.parse(JSON.stringify(x));
const money=v=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(+v||0);
const num=v=>new Intl.NumberFormat('tr-TR',{maximumFractionDigits:3}).format(+v||0);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);

const sampleProject={
  id:'sample-uskudar-niyazi',name:'ÜSKÜDAR VE NİYAZİ SAYIN KÜLTÜR MERKEZİ',employer:'GÜNER İNŞAAT',contractor:'MERAL MOBİLYA',workName:'BAKIM ONARIM TADİLAT VE İMALAT',contractDate:'',deliveryDate:'',endDate:'',createdAt:new Date().toISOString(),
  items:[
    ['i1','NİYAZİ SAYIN KÜLTÜR MERKEZİ','','KAPI','M2',15500],
    ['i2','NİYAZİ SAYIN KÜLTÜR MERKEZİ','','MUTFAK DOLAPLARI','MT',10500],
    ['i3','NİYAZİ SAYIN KÜLTÜR MERKEZİ','','MUTFAK TEZGAHLARI','MT',10000],
    ['i4','NİYAZİ SAYIN KÜLTÜR MERKEZİ','','MUTFAK TEZGAH ARASI','MT',10000],
    ['i5','NİYAZİ SAYIN KÜLTÜR MERKEZİ','','BOY DOLAP','M',13000],
    ['i6','NİYAZİ SAYIN KÜLTÜR MERKEZİ','','KAPI SÖK TAK','AD',4000],
    ['i7','ÜSKÜDAR','','KAPI','AD',15500],
    ['i8','ÜSKÜDAR','','YEVMİYELİ İŞLER','AD',0]
  ].map(([id,group,code,name,unit,unitPrice],sort)=>({id,group,code,name,unit,unitPrice,sort})),
  periods:[{
    id:'h1',no:1,date:'2026-09-21',vatRate:20,discountRate:0,priceDifference:0,extraWorks:0,retentionReturn:0,deductions:0,deductionNote:'',createdAt:new Date().toISOString(),
    measurements:[
      ['m1','i1',5],['m2','i2',14.18],['m3','i3',11.68],['m4','i4',7.14],['m5','i5',7.4],['m6','i6',1],['m7','i7',1],['m8','i8',0]
    ].map(([id,itemId,manualQty])=>({id,itemId,section:'',description:'Excel aktarımı',count:1,width:1,length:1,height:1,factor:1,manualEnabled:true,manualQty}))
  }]
};
const initial={projects:[sampleProject]};
function load(){try{const x=JSON.parse(localStorage.getItem(STORE));if(x&&Array.isArray(x.projects))return x}catch(e){console.warn(e)}return clone(initial)}
let db=load(),activeProjectId=db.projects[0]?.id||null,activePeriodId=db.projects[0]?.periods?.[0]?.id||null,suppressHistory=false;

function pushHistory(){
  if(suppressHistory)return;
  try{const h=JSON.parse(localStorage.getItem(HISTORY)||'[]');h.unshift(JSON.stringify(db));localStorage.setItem(HISTORY,JSON.stringify(h.slice(0,20)))}catch(e){console.warn(e)}
}
function persist(message,{history=true}={}){
  try{if(history)pushHistory();localStorage.setItem(STORE,JSON.stringify(db));renderAll();if(window.cloudSync)window.cloudSync.localChanged();if(message)toast(message)}
  catch(e){alert('Kayıt cihaz hafızasına yazılamadı.')}
}
function undo(){
  const h=JSON.parse(localStorage.getItem(HISTORY)||'[]');if(!h.length)return toast('Geri alınacak işlem yok');
  suppressHistory=true;db=JSON.parse(h.shift());localStorage.setItem(HISTORY,JSON.stringify(h));localStorage.setItem(STORE,JSON.stringify(db));suppressHistory=false;
  activeProjectId=db.projects[0]?.id||null;activePeriodId=db.projects[0]?.periods?.[0]?.id||null;renderAll();if(window.cloudSync)window.cloudSync.localChanged();toast('Son işlem geri alındı');
}
const project=()=>db.projects.find(x=>x.id===activeProjectId);
const period=()=>project()?.periods.find(x=>x.id===activePeriodId);
const sortedPeriods=p=>p.periods.slice().sort((a,b)=>(+a.no)-(+b.no));
function qtyOf(m){return m.manualEnabled?(+m.manualQty||0):(+m.count||0)*(+m.width||0)*(+m.length||0)*(+m.height||0)*(+m.factor||0)}
function itemQty(p,h,itemId){return h.measurements.filter(m=>m.itemId===itemId).reduce((s,m)=>s+qtyOf(m),0)}
function periodCalc(p,h){
  const ordered=sortedPeriods(p),idx=ordered.findIndex(x=>x.id===h.id),prior=ordered.slice(0,idx);
  const rows=p.items.slice().sort((a,b)=>(a.sort||0)-(b.sort||0)).map(i=>{
    const previous=prior.reduce((s,x)=>s+itemQty(p,x,i.id),0),current=itemQty(p,h,i.id),total=previous+current;
    return{item:i,previous,current,total,currentAmount:current*(+i.unitPrice||0),totalAmount:total*(+i.unitPrice||0)};
  });
  const previousGross=rows.reduce((s,r)=>s+r.previous*(+r.item.unitPrice||0),0);
  const cumulativeGross=rows.reduce((s,r)=>s+r.totalAmount,0);
  const grossBeforeDiscount=cumulativeGross-previousGross;
  const discount=grossBeforeDiscount*(+h.discountRate||0)/100;
  const currentGross=grossBeforeDiscount-discount;
  const vat=currentGross*(+h.vatRate||0)/100;
  const additions=(+h.priceDifference||0)+(+h.extraWorks||0)+vat+(+h.retentionReturn||0);
  const deductions=+h.deductions||0;
  return{rows,previousGross,cumulativeGross,grossBeforeDiscount,discount,currentGross,vat,additions,deductions,accrual:currentGross+additions,net:currentGross+additions-deductions};
}
function projectCalc(p){const last=sortedPeriods(p).at(-1);if(!last)return{gross:0,vat:0,net:0};const c=periodCalc(p,last);return{gross:c.cumulativeGross,vat:p.periods.reduce((s,h)=>s+periodCalc(p,h).vat,0),net:p.periods.reduce((s,h)=>s+periodCalc(p,h).net,0)}}

function showPage(id){
  document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('active',x.dataset.page===id));
  window.scrollTo(0,0);
}
function renderDashboard(){
  const q=$('projectSearch').value.trim().toLocaleLowerCase('tr-TR'),list=db.projects.filter(p=>p.name.toLocaleLowerCase('tr-TR').includes(q)||p.employer.toLocaleLowerCase('tr-TR').includes(q));
  const totals=db.projects.map(projectCalc);
  $('grandTotal').textContent=money(totals.reduce((s,x)=>s+x.gross,0));$('grossTotal').textContent=money(totals.reduce((s,x)=>s+x.gross,0));$('vatTotal').textContent=money(totals.reduce((s,x)=>s+x.vat,0));$('netTotal').textContent=money(totals.reduce((s,x)=>s+x.net,0));$('projectCount').textContent=db.projects.length+' proje';
  $('projectList').innerHTML=list.length?list.map(p=>{const c=projectCalc(p),last=sortedPeriods(p).at(-1);return `<button class="project-card open-project" data-id="${p.id}"><small>${esc(p.employer)}</small><h3>${esc(p.name)}</h3><div class="meta">${p.periods.length} hakediş · ${p.items.length} iş kalemi</div><div class="amount">${money(c.gross)}</div><footer><span>Toplam imalat</span><span>${last?'Son: No '+last.no:'Henüz hakediş yok'}</span></footer></button>`}).join(''):'<div class="empty">Proje bulunamadı.</div>';
}
function renderProject(){
  const p=project();if(!p)return;
  const pc=projectCalc(p),periods=sortedPeriods(p);
  $('projectEmployer').textContent=p.employer;$('projectName').textContent=p.name;$('projectMeta').textContent=p.contractor+' · '+p.workName;
  $('projectStats').innerHTML=`<article><span>İş kalemi</span><b>${p.items.length}</b></article><article><span>Hakediş</span><b>${p.periods.length}</b></article><article><span>Toplam imalat</span><b>${money(pc.gross)}</b></article><article><span>Toplam net ödeme</span><b>${money(pc.net)}</b></article>`;
  $('periodList').innerHTML=periods.length?periods.map(h=>{const c=periodCalc(p,h);return `<button class="period-card open-period" data-id="${h.id}"><small>HAKEDİŞ NO ${h.no}</small><h3>${h.date?new Date(h.date+'T12:00:00').toLocaleDateString('tr-TR'):'Tarih yok'}</h3><div class="amount">${money(c.net)}</div><footer><span>Bu dönem ${money(c.currentGross)}</span><span>KDV ${money(c.vat)}</span></footer></button>`}).join(''):'<div class="empty">İlk hakedişi oluşturun.</div>';
  $('itemList').innerHTML=p.items.length?p.items.slice().sort((a,b)=>(a.sort||0)-(b.sort||0)).map(i=>`<div class="row"><div class="row-main"><h3>${esc(i.name)}</h3><div class="meta">${esc(i.group)} · ${esc(i.code||'Poz no yok')} · ${i.unit}</div></div><div class="row-amount"><b>${money(i.unitPrice)}</b><div class="row-actions"><button class="mini edit-item" data-id="${i.id}">Düzenle</button><button class="mini danger delete-item" data-id="${i.id}">Sil</button></div></div></div>`).join(''):'<div class="empty">İş kalemi ekleyin.</div>';
}
function renderPeriod(){
  const p=project(),h=period();if(!p||!h)return;const c=periodCalc(p,h);
  $('periodProject').textContent=p.name;$('periodTitle').textContent='Hakediş No '+h.no;$('periodDate').textContent=h.date?new Date(h.date+'T12:00:00').toLocaleDateString('tr-TR'):'Tarih yok';
  $('periodStats').innerHTML=`<article><span>Önceki hakediş</span><b>${money(c.previousGross)}</b></article><article><span>Bu dönem</span><b>${money(c.currentGross)}</b></article><article><span>KDV</span><b>${money(c.vat)}</b></article><article><span>Net ödeme</span><b>${money(c.net)}</b></article>`;
  $('periodItems').innerHTML=c.rows.length?c.rows.map(r=>{const ms=h.measurements.filter(m=>m.itemId===r.item.id);return `<div class="row"><div class="row-main"><h3>${esc(r.item.name)}</h3><div class="meta">${esc(r.item.group)} · Önceki ${num(r.previous)} · Bu dönem ${num(r.current)} · Toplam ${num(r.total)} ${r.item.unit}</div><div class="meta">${ms.length} metraj kaydı</div></div><div class="row-amount"><b>${money(r.currentAmount)}</b><div class="row-actions"><button class="mini add-for-item" data-id="${r.item.id}">+ Metraj</button><button class="mini view-measures" data-id="${r.item.id}">Detay</button></div></div></div>`}).join(''):'<div class="empty">Önce iş kalemi ekleyin.</div>';
  $('paymentSummary').innerHTML=`<div class="summary-grid"><div><span>Brüt imalat</span><b>${money(c.grossBeforeDiscount)}</b></div><div><span>İhale indirimi</span><b>-${money(c.discount)}</b></div><div><span>Fiyat farkı</span><b>${money(h.priceDifference)}</b></div><div><span>İlave işler</span><b>${money(h.extraWorks)}</b></div><div><span>KDV (%${num(h.vatRate)})</span><b>${money(c.vat)}</b></div><div><span>Teminat iadesi</span><b>${money(h.retentionReturn)}</b></div><div><span>Kesintiler</span><b>-${money(c.deductions)}</b></div><div><span>Tahakkuk</span><b>${money(c.accrual)}</b></div></div><div class="summary-total"><span>Taşerona ödenecek</span><b>${money(c.net)}</b></div>`;
}
function fillReportSelects(){
  const old=$('reportProject').value;$('reportProject').innerHTML=db.projects.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');$('reportProject').value=db.projects.some(p=>p.id===old)?old:(activeProjectId||db.projects[0]?.id||'');fillReportPeriods();
}
function fillReportPeriods(){const p=db.projects.find(x=>x.id===$('reportProject').value);$('reportPeriod').innerHTML=p?sortedPeriods(p).map(h=>`<option value="${h.id}">Hakediş No ${h.no} · ${h.date||''}</option>`).join(''):''}
function renderAll(){renderDashboard();renderProject();renderPeriod();fillReportSelects()}

function openDialog(id){const d=$(id);if(d.showModal)d.showModal()}
function openProject(id){
  const p=db.projects.find(x=>x.id===id);$('projectDialogTitle').textContent=p?'Projeyi düzenle':'Yeni proje';$('projectId').value=p?.id||'';$('pName').value=p?.name||'';$('pEmployer').value=p?.employer||'';$('pContractor').value=p?.contractor||'MERAL MOBİLYA';$('pWorkName').value=p?.workName||'BAKIM ONARIM TADİLAT VE İMALAT';$('pContractDate').value=p?.contractDate||'';$('pDeliveryDate').value=p?.deliveryDate||'';$('pEndDate').value=p?.endDate||'';openDialog('projectDialog');
}
function openItem(id){
  const p=project(),i=p?.items.find(x=>x.id===id);$('itemId').value=i?.id||'';$('itemGroup').value=i?.group||'';$('itemCode').value=i?.code||'';$('itemName').value=i?.name||'';$('itemUnit').value=i?.unit||'M2';$('itemPrice').value=i?.unitPrice||0;openDialog('itemDialog');
}
function openPeriod(id){
  const p=project(),h=p?.periods.find(x=>x.id===id);$('periodId').value=h?.id||'';$('hNo').value=h?.no||(Math.max(0,...(p?.periods||[]).map(x=>+x.no||0))+1);$('hDate').value=h?.date||today();$('hVat').value=h?.vatRate??20;$('hDiscount').value=h?.discountRate||0;$('hPriceDiff').value=h?.priceDifference||0;$('hExtra').value=h?.extraWorks||0;$('hRetention').value=h?.retentionReturn||0;$('hDeductions').value=h?.deductions||0;$('hDeductionNote').value=h?.deductionNote||'';openDialog('periodDialog');
}
function openMeasurement(itemId,measurementId){
  const p=project(),h=period(),m=h?.measurements.find(x=>x.id===measurementId);
  $('measurementId').value=m?.id||'';$('mItem').innerHTML=p.items.map(i=>`<option value="${i.id}">${esc(i.group+' · '+i.name)}</option>`).join('');$('mItem').value=m?.itemId||itemId||p.items[0]?.id||'';$('mSection').value=m?.section||'';$('mDescription').value=m?.description||'';$('mCount').value=m?.count??1;$('mWidth').value=m?.width??1;$('mLength').value=m?.length??1;$('mHeight').value=m?.height??1;$('mFactor').value=m?.factor??1;$('mManualEnabled').checked=!!m?.manualEnabled;$('mManual').value=m?.manualQty||0;previewMeasurement();openDialog('measurementDialog');
}
function previewMeasurement(){const m={count:+$('mCount').value,width:+$('mWidth').value,length:+$('mLength').value,height:+$('mHeight').value,factor:+$('mFactor').value,manualEnabled:$('mManualEnabled').checked,manualQty:+$('mManual').value};$('mPreview').textContent=num(qtyOf(m))}
function openDirect(){
  const p=project(),h=period();if(!p||!h)return;$('directList').innerHTML=p.items.map(i=>`<label class="direct-row"><span>${esc(i.name)} <small>(${i.unit})</small></span><input data-id="${i.id}" type="number" step="0.001" value="${itemQty(p,h,i.id)}"></label>`).join('');openDialog('directDialog');
}

$('projectForm').onsubmit=e=>{e.preventDefault();const id=$('projectId').value,p={id:id||uid(),name:$('pName').value.trim(),employer:$('pEmployer').value.trim(),contractor:$('pContractor').value.trim(),workName:$('pWorkName').value.trim(),contractDate:$('pContractDate').value,deliveryDate:$('pDeliveryDate').value,endDate:$('pEndDate').value,createdAt:new Date().toISOString(),items:[],periods:[]};if(id){const old=db.projects.find(x=>x.id===id);p.items=old.items;p.periods=old.periods;p.createdAt=old.createdAt;db.projects[db.projects.findIndex(x=>x.id===id)]=p}else{db.projects.push(p);activeProjectId=p.id}e.target.closest('dialog').close();persist('Proje kaydedildi')};
$('itemForm').onsubmit=e=>{e.preventDefault();const p=project(),id=$('itemId').value,i={id:id||uid(),group:$('itemGroup').value.trim(),code:$('itemCode').value.trim(),name:$('itemName').value.trim(),unit:$('itemUnit').value,unitPrice:+$('itemPrice').value,sort:id?p.items.find(x=>x.id===id).sort:p.items.length};if(id)p.items[p.items.findIndex(x=>x.id===id)]=i;else p.items.push(i);e.target.closest('dialog').close();persist('İş kalemi kaydedildi')};
$('periodForm').onsubmit=e=>{e.preventDefault();const p=project(),id=$('periodId').value,h={id:id||uid(),no:+$('hNo').value,date:$('hDate').value,vatRate:+$('hVat').value,discountRate:+$('hDiscount').value,priceDifference:+$('hPriceDiff').value,extraWorks:+$('hExtra').value,retentionReturn:+$('hRetention').value,deductions:+$('hDeductions').value,deductionNote:$('hDeductionNote').value.trim(),measurements:[],createdAt:new Date().toISOString()};if(p.periods.some(x=>x.id!==id&&+x.no===h.no))return alert('Bu hakediş numarası zaten kullanılıyor.');if(id){const old=p.periods.find(x=>x.id===id);h.measurements=old.measurements;h.createdAt=old.createdAt;p.periods[p.periods.findIndex(x=>x.id===id)]=h}else{p.periods.push(h);activePeriodId=h.id}e.target.closest('dialog').close();persist('Hakediş kaydedildi')};
$('measurementForm').onsubmit=e=>{e.preventDefault();const h=period(),id=$('measurementId').value,m={id:id||uid(),itemId:$('mItem').value,section:$('mSection').value.trim(),description:$('mDescription').value.trim(),count:+$('mCount').value,width:+$('mWidth').value,length:+$('mLength').value,height:+$('mHeight').value,factor:+$('mFactor').value,manualEnabled:$('mManualEnabled').checked,manualQty:+$('mManual').value};if(id)h.measurements[h.measurements.findIndex(x=>x.id===id)]=m;else h.measurements.push(m);e.target.closest('dialog').close();persist('Metraj kaydedildi')};
$('directForm').onsubmit=e=>{e.preventDefault();const h=period();document.querySelectorAll('#directList input').forEach(input=>{const itemId=input.dataset.id,value=+input.value||0;h.measurements=h.measurements.filter(m=>!(m.itemId===itemId&&m.description==='Hızlı miktar girişi'));h.measurements.push({id:uid(),itemId,section:'',description:'Hızlı miktar girişi',count:1,width:1,length:1,height:1,factor:1,manualEnabled:true,manualQty:value})});e.target.closest('dialog').close();persist('Miktarlar kaydedildi')};

document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.page)showPage(b.dataset.page);
  if(b.classList.contains('close'))b.closest('dialog').close();
  if(b.classList.contains('open-project')){activeProjectId=b.dataset.id;activePeriodId=sortedPeriods(project()).at(-1)?.id||null;renderProject();showPage('project')}
  if(b.classList.contains('open-period')){activePeriodId=b.dataset.id;renderPeriod();showPage('period')}
  if(b.classList.contains('edit-item'))openItem(b.dataset.id);
  if(b.classList.contains('add-for-item'))openMeasurement(b.dataset.id);
  if(b.classList.contains('view-measures'))showMeasurements(b.dataset.id);
  if(b.classList.contains('delete-item')){const p=project(),i=p.items.find(x=>x.id===b.dataset.id);if(confirm(i.name+' ve bütün metrajları silinsin mi?')){p.items=p.items.filter(x=>x.id!==i.id);p.periods.forEach(h=>h.measurements=h.measurements.filter(m=>m.itemId!==i.id));persist('İş kalemi silindi')}}
  if(b.classList.contains('edit-measure'))openMeasurement(null,b.dataset.id);
  if(b.classList.contains('delete-measure')&&confirm('Metraj kaydı silinsin mi?')){period().measurements=period().measurements.filter(x=>x.id!==b.dataset.id);persist('Metraj silindi')}
});
function showMeasurements(itemId){const i=project().items.find(x=>x.id===itemId),ms=period().measurements.filter(x=>x.itemId===itemId);$('directList').innerHTML=`<h4>${esc(i.name)}</h4>`+(ms.length?ms.map(m=>`<div class="row"><div class="row-main"><b>${num(qtyOf(m))} ${i.unit}</b><div class="meta">${esc(m.section||'Bölüm yok')} · ${esc(m.description||'Açıklama yok')}</div></div><div class="row-actions"><button type="button" class="mini edit-measure" data-id="${m.id}">Düzenle</button><button type="button" class="mini danger delete-measure" data-id="${m.id}">Sil</button></div></div>`).join(''):'<div class="empty">Metraj kaydı yok.</div>');openDialog('directDialog')}

$('newProjectBtn').onclick=()=>openProject();$('editProjectBtn').onclick=()=>openProject(activeProjectId);$('newItemBtn').onclick=()=>openItem();$('newPeriodBtn').onclick=()=>openPeriod();$('editPeriodBtn').onclick=()=>openPeriod(activePeriodId);$('addMeasurementBtn').onclick=()=>project().items.length?openMeasurement():alert('Önce iş kalemi ekleyin.');$('directEntryBtn').onclick=openDirect;$('projectSearch').oninput=renderDashboard;$('undoBtn').onclick=undo;$('reportProject').onchange=fillReportPeriods;['mCount','mWidth','mLength','mHeight','mFactor','mManual','mManualEnabled'].forEach(id=>$(id).addEventListener('input',previewMeasurement));

function trWords(n){
  const ones=['','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'],tens=['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
  function three(x){let s='';const h=Math.floor(x/100),r=x%100;if(h)s+=(h>1?ones[h]:'')+'yüz';if(Math.floor(r/10))s+=tens[Math.floor(r/10)];s+=ones[r%10];return s}
  n=Math.floor(Math.abs(n));if(!n)return'sıfır';const scales=['','bin','milyon','milyar','trilyon'];let out='',i=0;while(n){const part=n%1000;if(part)out=(part===1&&i===1?'':three(part))+scales[i]+out;n=Math.floor(n/1000);i++}return out.charAt(0).toLocaleUpperCase('tr-TR')+out.slice(1)
}
async function shareFile(name,content,type){const f=new File([content],name,{type});try{if(navigator.share&&navigator.canShare?.({files:[f]}))return await navigator.share({files:[f],title:name})}catch(e){if(e.name==='AbortError')return}const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function reportSelection(){const p=db.projects.find(x=>x.id===$('reportProject').value),h=p?.periods.find(x=>x.id===$('reportPeriod').value);return{p,h,c:p&&h?periodCalc(p,h):null}}
function exportPdf(){
  if(typeof pdfMake==='undefined')return alert('PDF motoru yüklenemedi.');const{p,h,c}=reportSelection();if(!p||!h)return alert('Proje ve hakediş seçin.');
  const grouped={};c.rows.forEach(r=>(grouped[r.item.group]??=[]).push(r));
  const itemBody=[['Grup','İş kalemi','Birim','Önceki','Bu dönem','Toplam','Birim fiyat','Tutar'],...c.rows.map(r=>[r.item.group,r.item.name,r.item.unit,num(r.previous),num(r.current),num(r.total),money(r.item.unitPrice),money(r.currentAmount)])];
  const measureBody=[['İş kalemi','Bölüm','Açıklama','Adet','En','Boy','Yük.','Miktar'],...h.measurements.map(m=>{const i=p.items.find(x=>x.id===m.itemId);return[i?.name||'',m.section||'',m.description||'',num(m.count),num(m.width),num(m.length),num(m.height),num(qtyOf(m))]})];
  const content=[
    {text:'MRL MOBİLYA',style:'brand'},{text:'TAŞERON HAKEDİŞ RAPORU',style:'title'},{text:p.name,style:'project'},
    {columns:[[{text:'İşveren',style:'label'},{text:p.employer,bold:true},{text:'Taşeron',style:'label',margin:[0,7,0,0]},{text:p.contractor,bold:true}],[{text:'Hakediş no',style:'label'},{text:String(h.no),bold:true},{text:'Hakediş tarihi',style:'label',margin:[0,7,0,0]},{text:h.date?new Date(h.date+'T12:00:00').toLocaleDateString('tr-TR'):'',bold:true}]],columnGap:20,margin:[0,10,0,15]},
    {text:'Hakediş özeti',style:'heading'},{table:{widths:['*','auto'],body:[['Önceki hakediş',money(c.previousGross)],['Bu dönem imalat',money(c.currentGross)],['KDV (%'+num(h.vatRate)+')',money(c.vat)],['İlaveler toplamı',money(c.additions)],['Kesintiler',money(c.deductions)],[{text:'TAŞERONA ÖDENECEK',bold:true},{text:money(c.net),bold:true,color:'#0d756d'}]]},layout:'lightHorizontalLines',margin:[0,0,0,14]},
    {text:'İcmal ve çarşaf',style:'heading'},{table:{headerRows:1,widths:[70,'*',35,45,45,45,60,65],body:itemBody},layout:'lightHorizontalLines',fontSize:7},
    {text:'Metraj cetveli',style:'heading',pageBreak:'before'},{table:{headerRows:1,widths:[75,60,'*',35,35,35,35,45],body:measureBody},layout:'lightHorizontalLines',fontSize:7},
    {text:'Yalnız: '+trWords(c.net)+' Türk Lirası',italics:true,margin:[0,20,0,0]},
    {columns:[{text:'TAŞERON\n\n\n'+p.contractor,alignment:'center'},{text:'İŞVEREN\n\n\n'+p.employer,alignment:'center'}],margin:[0,35,0,0]}
  ];
  const doc={pageSize:'A4',pageOrientation:'landscape',pageMargins:[28,28,28,28],defaultStyle:{font:'Roboto',fontSize:9,color:'#172b3a'},content,styles:{brand:{fontSize:9,bold:true,color:'#16a293',characterSpacing:2},title:{fontSize:20,bold:true,color:'#102a43',margin:[0,4,0,2]},project:{fontSize:12,bold:true,color:'#536b7b'},heading:{fontSize:13,bold:true,color:'#102a43',margin:[0,12,0,6]},label:{fontSize:8,color:'#718290'}}};
  pdfMake.createPdf(doc).getBlob(blob=>shareFile('MRL-Hakedis-'+p.name.replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi,'-')+'-No-'+h.no+'.pdf',blob,'application/pdf'));
}
function exportExcel(){
  if(typeof XLSX==='undefined')return alert('Excel motoru yüklenemedi.');const{p,h,c}=reportSelection();if(!p||!h)return alert('Proje ve hakediş seçin.');
  const wb=XLSX.utils.book_new();
  const cover=[['MRL MOBİLYA - TAŞERON HAKEDİŞ RAPORU'],['İşin adı',p.workName],['Proje',p.name],['İşveren',p.employer],['Taşeron',p.contractor],['Hakediş no',h.no],['Hakediş tarihi',h.date],[],['Önceki hakediş',c.previousGross],['Bu dönem hakediş',c.currentGross],['KDV',c.vat],['İlaveler',c.additions],['Kesintiler',c.deductions],['Taşerona ödenecek',c.net],['Yalnız',trWords(c.net)+' Türk Lirası']];
  const items=[['Grup','Poz No','İş Kalemi','Birim','Önceki Miktar','Bu Dönem','Toplam','Birim Fiyat','Bu Dönem Tutar'],...c.rows.map(r=>[r.item.group,r.item.code,r.item.name,r.item.unit,r.previous,r.current,r.total,r.item.unitPrice,r.currentAmount])];
  const measures=[['İş Kalemi','Bölüm','Açıklama','Adet','En','Boy','Yükseklik','Çarpan','Miktar'],...h.measurements.map(m=>{const i=p.items.find(x=>x.id===m.itemId);return[i?.name||'',m.section,m.description,m.count,m.width,m.length,m.height,m.factor,qtyOf(m)]})];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(cover),'Kapak');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(items),'Çarşaf');XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(measures),'Metrajlar');
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});shareFile('MRL-Hakedis-'+h.no+'.xlsx',out,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function importLegacy(workbook){
  const sheet=workbook.Sheets['ÇARŞAF']||workbook.Sheets['Çarşaf']||workbook.Sheets[workbook.SheetNames.find(n=>n.toLocaleUpperCase('tr-TR').includes('ÇARŞAF'))];if(!sheet)throw Error('ÇARŞAF sayfası bulunamadı');
  const cover=workbook.Sheets[' kapak']||workbook.Sheets['kapak'];const val=(s,cell)=>s?.[cell]?.v??'';
  const p={id:uid(),name:String(val(cover,'N35')||'Excel Hakediş Projesi'),employer:String(val(cover,'J11')||'İŞVEREN'),contractor:String(val(cover,'N38')||'MERAL MOBİLYA'),workName:String(val(cover,'N35')||'BAKIM ONARIM TADİLAT VE İMALAT'),contractDate:'',deliveryDate:'',endDate:'',createdAt:new Date().toISOString(),items:[],periods:[]};
  let group='GENEL',sort=0;const measurements=[];for(let r=5;r<=200;r++){const name=val(sheet,'C'+r),unit=val(sheet,'D'+r),qty=+val(sheet,'F'+r)||0,price=+val(sheet,'H'+r)||0;if(!name)continue;if(!unit&&(!price||String(name).toLocaleUpperCase('tr-TR').includes('KÜLTÜR')||String(name).toLocaleUpperCase('tr-TR')==='ÜSKÜDAR')){group=String(name);continue}if(unit){const item={id:uid(),group,code:String(val(sheet,'B'+r)||''),name:String(name),unit:String(unit),unitPrice:price,sort:sort++};p.items.push(item);measurements.push({id:uid(),itemId:item.id,section:'',description:'Excel aktarımı',count:1,width:1,length:1,height:1,factor:1,manualEnabled:true,manualQty:qty})}}
  p.periods.push({id:uid(),no:+val(sheet,'I1')||1,date:today(),vatRate:20,discountRate:0,priceDifference:0,extraWorks:0,retentionReturn:0,deductions:0,deductionNote:'',measurements,createdAt:new Date().toISOString()});
  db.projects.push(p);activeProjectId=p.id;activePeriodId=p.periods[0].id;persist('Excel projesi içe aktarıldı');showPage('project');
}
$('exportPdfBtn').onclick=exportPdf;$('exportExcelBtn').onclick=exportExcel;$('exportJsonBtn').onclick=()=>shareFile('MRL-Hakedis-Yedek-'+today()+'.json',JSON.stringify(db,null,2),'application/json');
$('importJson').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const x=JSON.parse(await f.text());if(!Array.isArray(x.projects))throw Error();if(confirm('Mevcut kayıtların üzerine bu yedek yüklensin mi?')){db=x;activeProjectId=db.projects[0]?.id||null;activePeriodId=db.projects[0]?.periods?.[0]?.id||null;persist('Yedek geri yüklendi')}}catch(_){alert('Geçerli bir MRL Hakediş yedeği seçin.')}e.target.value=''};
$('importExcel').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});importLegacy(wb)}catch(err){alert('Excel aktarılamadı: '+err.message)}e.target.value=''};
function toast(message){const x=$('toast');x.textContent=message;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1900)}
renderAll();
