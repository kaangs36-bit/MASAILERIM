const STORE='mrl-personel-v1';
const seedPeople=[['Kaan Ceylan',44450],['Özgür Meral',76200],['Kenan Kasım Köstek',76200],['Muhammet Elcimu',40640],['Fırat Çiftçi',44450],['Muhammet Lofty',50000],['Mustafa',55000],['Kadir Bilgi',28075.5],['Yusuf Çelik',28075.5],['Zafer Köstek',28075.5],['Hamza',0],['Seyithan',40000],['Emre Meral',0]];
const seedEntries={
  0:[[8,8],[15,9],[29,10],[30,0,0,260,'yemek'],[31,0,0,1000,'ampul']],
  1:[[1,10,30000],[8,10],[14,3.5],[15,10],[29,10],[30,10]],
  2:[[1,10,0,57620,'geçen ay devreden'],[2,0,0,5685,'yemek toplu gün'],[3,0,0,1324.92,'ankraj ve epoksi çayırova'],[4,0,0,16620,'yemek ve malzeme'],[8,8],[15,10],[29,10]],
  3:[[1,10],[7,3.5],[8,10],[15,10],[29,10]],
  5:[[1,10],[7,3.5],[8,10],[15,10],[29,10]],
  6:[[1,0,1666.67],[2,0,1666.67],[3,0,15000],[8,10],[15,10],[29,10]],
  7:[[1,10],[7,3.5],[8,10],[15,10],[29,10]],
  8:[[30,10]],
  9:[[1,10],[8,8],[15,10],[28,0,935.83],[29,10],[31,0,935.83]],
  11:Array.from({length:16},(_,i)=>[i+1,0,1333])
};
const initial={employees:seedPeople.map(([name,salary],i)=>({id:`p${i+1}`,name,salary,normalHours:300})),records:Object.entries(seedEntries).flatMap(([i,rows])=>rows.map((r,j)=>({id:`r${i}-${j}`,employeeId:`p${+i+1}`,date:`2026-08-${String(r[0]).padStart(2,'0')}`,overtimeHours:r[1]||0,advance:r[2]||0,meal:r[3]||0,note:r[4]||''}))),payments:[]};
let db=load(), viewDate=new Date();
function load(){try{return JSON.parse(localStorage.getItem(STORE))||structuredClone(initial)}catch{return structuredClone(initial)}}
function save(){localStorage.setItem(STORE,JSON.stringify(db));renderAll()}
const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(n||0);
const ym=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const currentPeriod=()=>ym(viewDate);
function employeeCalc(e,period=currentPeriod()){
  const rs=db.records.filter(r=>r.employeeId===e.id&&r.date.startsWith(period));
  const overtime=rs.reduce((s,r)=>s+overtimePay(e,r),0), advance=rs.reduce((s,r)=>s+(+r.advance||0),0), meal=rs.reduce((s,r)=>s+(+r.meal||0),0);
  const payable=(+e.salary||0)+overtime-advance+meal;
  const paid=db.payments.filter(p=>p.employeeId===e.id&&p.period===period).reduce((s,p)=>s+(+p.amount||0),0);
  return {hours:rs.reduce((s,r)=>s+(+r.overtimeHours||0),0),overtime,advance,meal,payable,paid,remaining:payable-paid};
}
function overtimePay(e,r){const day=new Date(r.date+'T12:00:00').getDay(),factor=day===6?1.5:day===0?2:1;return (+r.overtimeHours||0)*((+e.salary||0)/(+e.normalHours||300))*factor}
function renderAll(){renderDashboard();renderEmployees();fillEmployeeSelects();renderRecords()}
function renderDashboard(){
  document.querySelector('#periodLabel').textContent=viewDate.toLocaleDateString('tr-TR',{month:'long',year:'numeric'});
  const all=db.employees.map(e=>({e,c:employeeCalc(e)}));
  const sum=k=>all.reduce((s,x)=>s+x.c[k],0);
  totalPay.textContent=money(sum('payable'));totalOvertime.textContent=money(sum('overtime'));totalAdvance.textContent=money(sum('advance'));totalRemaining.textContent=money(sum('remaining'));
  summaryList.innerHTML=all.length?all.map(({e,c})=>`<div class="row"><div class="row-main"><h3>${esc(e.name)}</h3><div class="meta">${c.hours} saat mesai · Avans ${money(c.advance)}</div></div><div class="amount"><b>${money(c.payable)}</b><small>Kalan ${money(c.remaining)}</small><button class="mini pay" data-id="${e.id}">Ödeme</button></div></div>`).join(''):'<div class="empty">Personel bulunamadı.</div>';
  document.querySelectorAll('.pay').forEach(b=>b.onclick=()=>openPayment(b.dataset.id));
}
function renderEmployees(){employeeList.innerHTML=db.employees.map(e=>{const c=employeeCalc(e);return `<div class="row"><div class="row-main"><h3>${esc(e.name)}</h3><div class="meta">Maaş ${money(e.salary)} · ${e.normalHours} saat/ay</div></div><button class="mini edit-employee" data-id="${e.id}">Düzenle</button><button class="mini danger delete-employee" data-id="${e.id}">Sil</button></div>`}).join('')||'<div class="empty">Henüz personel yok.</div>';document.querySelectorAll('.edit-employee').forEach(b=>b.onclick=()=>openEmployee(b.dataset.id));document.querySelectorAll('.delete-employee').forEach(b=>b.onclick=()=>deleteEmployee(b.dataset.id))}
function fillEmployeeSelects(){const options='<option value="">Tüm personel</option>'+db.employees.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');const old=recordEmployeeFilter.value;recordEmployeeFilter.innerHTML=options;recordEmployeeFilter.value=old;recordEmployee.innerHTML=db.employees.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('')}
function renderRecords(){const period=recordMonth.value||currentPeriod(),eid=recordEmployeeFilter.value;const rows=db.records.filter(r=>r.date.startsWith(period)&&(!eid||r.employeeId===eid)).sort((a,b)=>b.date.localeCompare(a.date));recordList.innerHTML=rows.map(r=>{const e=db.employees.find(x=>x.id===r.employeeId);return `<div class="row"><div class="row-main"><h3>${esc(e?.name||'Silinmiş personel')}</h3><div class="meta">${new Date(r.date+'T12:00').toLocaleDateString('tr-TR')} · ${r.overtimeHours||0} saat · Avans ${money(r.advance)} · Fiş ${money(r.meal)}${r.note?' · '+esc(r.note):''}</div></div><div class="amount"><b>${money(e?overtimePay(e,r):0)}</b><button class="mini danger delete-record" data-id="${r.id}">Sil</button></div></div>`}).join('')||'<div class="empty">Bu dönemde kayıt yok.</div>';document.querySelectorAll('.delete-record').forEach(b=>b.onclick=()=>{if(confirm('Bu kayıt silinsin mi?')){db.records=db.records.filter(r=>r.id!==b.dataset.id);save()}})}
function openEmployee(id){const e=db.employees.find(x=>x.id===id);employeeDialogTitle.textContent=e?'Personeli düzenle':'Personel ekle';employeeId.value=e?.id||'';employeeName.value=e?.name||'';employeeSalary.value=e?.salary||0;employeeHours.value=e?.normalHours||300;employeeDialog.showModal()}
function deleteEmployee(id){const e=db.employees.find(x=>x.id===id);if(confirm(`${e.name} ve bütün kayıtları silinsin mi?`)){db.employees=db.employees.filter(x=>x.id!==id);db.records=db.records.filter(x=>x.employeeId!==id);db.payments=db.payments.filter(x=>x.employeeId!==id);save();toast('Personel silindi')}}
function openPayment(id){const e=db.employees.find(x=>x.id===id);paymentEmployeeId.value=id;paymentPerson.textContent=`${e.name} · ${viewDate.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}`;paymentAmount.value=employeeCalc(e).paid||0;paymentDialog.showModal()}
employeeForm.addEventListener('submit',e=>{if(e.submitter?.value!=='save')return;e.preventDefault();const id=employeeId.value, obj={id:id||crypto.randomUUID(),name:employeeName.value.trim(),salary:+employeeSalary.value,normalHours:+employeeHours.value};if(id)db.employees[db.employees.findIndex(x=>x.id===id)]=obj;else db.employees.push(obj);save();employeeDialog.close();toast('Personel kaydedildi')});
recordForm.addEventListener('submit',e=>{if(e.submitter?.value!=='save')return;e.preventDefault();db.records.push({id:crypto.randomUUID(),employeeId:recordEmployee.value,date:recordDate.value,overtimeHours:+recordOvertimeHours.value,advance:+recordAdvance.value,meal:+recordMeal.value,note:recordNote.value.trim()});save();recordDialog.close();recordForm.reset();recordDate.value=new Date().toISOString().slice(0,10);toast('Günlük kayıt eklendi')});
paymentForm.addEventListener('submit',e=>{if(e.submitter?.value!=='save')return;e.preventDefault();db.payments=db.payments.filter(p=>!(p.employeeId===paymentEmployeeId.value&&p.period===currentPeriod()));db.payments.push({id:crypto.randomUUID(),employeeId:paymentEmployeeId.value,period:currentPeriod(),amount:+paymentAmount.value});save();paymentDialog.close();toast('Ödeme kaydedildi')});
document.querySelectorAll('.close').forEach(b=>b.onclick=()=>b.closest('dialog').close());document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===id));document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===id))}
prevMonth.onclick=()=>{viewDate.setMonth(viewDate.getMonth()-1);recordMonth.value=currentPeriod();renderAll()};nextMonth.onclick=()=>{viewDate.setMonth(viewDate.getMonth()+1);recordMonth.value=currentPeriod();renderAll()};addEmployeeBtn.onclick=()=>openEmployee();addRecordBtn.onclick=()=>{if(!db.employees.length)return toast('Önce personel ekleyin');recordDate.value=new Date().toISOString().slice(0,10);recordDialog.showModal()};recordEmployeeFilter.onchange=renderRecords;recordMonth.onchange=renderRecords;backupBtn.onclick=()=>showPage('settings');
exportJson.onclick=()=>download(`mrl-yedek-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(db,null,2),'application/json');
importJson.onchange=async e=>{try{const parsed=JSON.parse(await e.target.files[0].text());if(!Array.isArray(parsed.employees)||!Array.isArray(parsed.records))throw Error();if(confirm('Mevcut verilerin üzerine yedek yüklensin mi?')){db={employees:parsed.employees,records:parsed.records,payments:parsed.payments||[]};save();toast('Yedek geri yüklendi')}}catch{alert('Geçerli bir MRL yedek dosyası seçin.')}e.target.value=''};
exportCsv.onclick=()=>{const head=['Personel','Maaş','Mesai Saati','Mesai Ücreti','Avans','Yemek Fişi','Ödenecek','Ödenen','Kalan'];const rows=db.employees.map(e=>{const c=employeeCalc(e);return [e.name,e.salary,c.hours,c.overtime,c.advance,c.meal,c.payable,c.paid,c.remaining]});download(`mrl-ozet-${currentPeriod()}.csv`,'\ufeff'+[head,...rows].map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(';')).join('\n'),'text/csv')};
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}function toast(t){const x=document.querySelector('#toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1800)}function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
recordMonth.value=currentPeriod();recordDate.value=new Date().toISOString().slice(0,10);renderAll();
