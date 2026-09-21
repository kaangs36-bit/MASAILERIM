(function(){
  'use strict';
  const URL='https://qwkvuaqkwszqlpunfxyi.supabase.co',KEY='sb_publishable_O79eqSYgVGDJJRu3HX1H8g_prX3geZz';
  const SESSION='mrl-hakedis-session-v1',DIRTY='mrl-hakedis-dirty-v1';
  let session=null,applying=false,pushing=false,timer,lastRemote='';
  const el=id=>document.getElementById(id);
  function status(text,type=''){el('syncStatus').textContent=text;el('syncDot').className=type;el('cloudBadge').textContent=text;el('cloudBadge').className='badge '+(type==='online'?'online':'')}
  function showAuth(){
    const signed=!!session?.access_token;el('authFields').hidden=signed;el('signedInActions').hidden=!signed;
    el('syncInfo').textContent=signed?(session.user?.email||'Bulut hesabı')+' ile bağlı.':'Aynı hesapla bütün cihazlarda kullan.';
    if(!signed)status(navigator.onLine?'Bağlı değil':'İnternet yok');
  }
  function saveSession(s){session=s;s?localStorage.setItem(SESSION,JSON.stringify(s)):localStorage.removeItem(SESSION);showAuth()}
  const headers=token=>({'apikey':KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'});
  async function request(path,options={}){const r=await fetch(URL+path,options),t=await r.text();let b={};try{b=t?JSON.parse(t):{}}catch(_){b={message:t}}if(!r.ok)throw Error(b.msg||b.message||b.error_description||('Sunucu hatası '+r.status));return b}
  async function refresh(){if(!session?.refresh_token)return false;try{saveSession(await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})}));return true}catch(_){saveSession(null);return false}}
  async function valid(){if(!session)return false;if(!session.expires_at||session.expires_at*1000>Date.now()+60000)return true;return refresh()}
  async function signIn(){
    const email=el('syncEmail').value.trim(),password=el('syncPassword').value;if(!email||password.length<6)return alert('E-posta ve en az 6 karakterli şifre gir.');
    status('Giriş yapılıyor','busy');try{const s=await request('/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});saveSession(s);el('syncPassword').value='';await initial();toast('Bulut hesabına bağlandı')}catch(e){status('Giriş başarısız');alert('Giriş yapılamadı: '+e.message)}
  }
  async function signUp(){
    const email=el('syncEmail').value.trim(),password=el('syncPassword').value;if(!email||password.length<6)return alert('Geçerli e-posta ve en az 6 karakterli şifre gir.');
    status('Hesap oluşturuluyor','busy');try{const s=await request('/auth/v1/signup',{method:'POST',headers:{'apikey':KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(s.access_token){saveSession(s);await initial();toast('Hesap oluşturuldu')}else{status('E-posta onayı bekleniyor','busy');alert('E-postana gelen onay bağlantısına basıp giriş yap.')}}catch(e){status('Hesap oluşturulamadı');alert(e.message)}
  }
  async function remote(){if(!await valid())return null;const rows=await request('/rest/v1/hakedis_app_state?user_id=eq.'+encodeURIComponent(session.user.id)+'&select=data,updated_at',{headers:headers(session.access_token)});return rows[0]||null}
  async function push(){
    if(applying||pushing||!navigator.onLine||!await valid())return false;pushing=true;status('Eşitleniyor','busy');
    try{const now=new Date().toISOString(),rows=await request('/rest/v1/hakedis_app_state?on_conflict=user_id',{method:'POST',headers:{...headers(session.access_token),'Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_id:session.user.id,data:db,updated_at:now})});lastRemote=rows[0]?.updated_at||now;localStorage.removeItem(DIRTY);status('Eşitlendi','online');return true}catch(e){status('Eşitleme bekliyor');console.warn(e);return false}finally{pushing=false}
  }
  function apply(row){if(!row?.data||!Array.isArray(row.data.projects))return;applying=true;db=row.data;localStorage.setItem(STORE,JSON.stringify(db));activeProjectId=db.projects[0]?.id||null;activePeriodId=db.projects[0]?.periods?.[0]?.id||null;renderAll();applying=false;lastRemote=row.updated_at||'';localStorage.removeItem(DIRTY)}
  async function pull(){if(pushing||localStorage.getItem(DIRTY)==='1'||!navigator.onLine||!await valid())return;try{const r=await remote();if(r&&r.updated_at!==lastRemote){apply(r);toast('Diğer cihazdaki kayıtlar alındı')}status('Eşitlendi','online')}catch(e){status('Bağlantı sorunu');console.warn(e)}}
  async function initial(){if(!navigator.onLine)return status('İnternet gelince eşitlenecek','busy');status('İlk eşitleme','busy');try{const r=await remote();if(r)apply(r);else await push();status('Eşitlendi','online')}catch(e){status('Eşitleme başarısız');alert(e.message)}}
  function changed(){if(applying)return;localStorage.setItem(DIRTY,'1');if(!session)return status('Giriş yapınca eşitlenecek','busy');status(navigator.onLine?'Eşitleme bekliyor':'İnternet bekleniyor','busy');clearTimeout(timer);timer=setTimeout(push,800)}
  async function now(){if(!navigator.onLine)return alert('İnternet bağlantısı yok.');localStorage.getItem(DIRTY)==='1'?await push():await pull()}
  function signOut(){if(!confirm('Bu cihazda bulut hesabından çıkılsın mı? Yerel kayıtlar silinmez.'))return;saveSession(null);lastRemote='';toast('Hesaptan çıkıldı')}
  try{session=JSON.parse(localStorage.getItem(SESSION)||'null')}catch(_){session=null}
  window.cloudSync={localChanged:changed,push,pull};el('signInBtn').onclick=signIn;el('signUpBtn').onclick=signUp;el('syncNowBtn').onclick=now;el('signOutBtn').onclick=signOut;
  addEventListener('online',()=>session?now():showAuth());addEventListener('offline',()=>status('İnternet yok','busy'));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session)now()});
  showAuth();if(session)initial();setInterval(()=>{if(session&&document.visibilityState==='visible')pull()},15000);
})();
