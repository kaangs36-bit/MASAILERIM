(function(){
  'use strict';
  const SUPABASE_URL='https://qwkvuaqkwszqlpunfxyi.supabase.co';
  const API_KEY='sb_publishable_O79eqSYgVGDJJRu3HX1H8g_prX3geZz';
  const SESSION_KEY='mesailerim-cloud-session-v1';
  const DIRTY_KEY='mesailerim-cloud-dirty-v1';
  let session=null,applying=false,pushing=false,timer=null,lastRemoteAt='';
  const el=id=>document.getElementById(id);

  function setStatus(text,type='offline'){
    el('syncStatus').textContent=text;
    el('syncStatus').className='sync-status '+type;
    el('syncDot').className='sync-dot '+(type==='online'?'online':type==='busy'?'busy':type==='error'?'error':'');
  }
  function showAuth(){
    const signed=!!(session&&session.access_token);
    el('authFields').hidden=signed;
    el('signedInActions').hidden=!signed;
    el('syncInfo').textContent=signed?(session.user.email+' hesabıyla bağlı. Kayıtlar otomatik eşitleniyor.'):'Aynı hesapla giriş yaptığında bütün kayıtların cihazların arasında otomatik eşitlenir.';
    if(!signed)setStatus(navigator.onLine?'Bağlı değil':'İnternet yok');
  }
  function saveSession(value){
    session=value;
    value?localStorage.setItem(SESSION_KEY,JSON.stringify(value)):localStorage.removeItem(SESSION_KEY);
    showAuth();
  }
  function authHeaders(token){return {'apikey':API_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'}}
  async function jsonRequest(path,options={}){
    const res=await fetch(SUPABASE_URL+path,options),text=await res.text();
    let body={};try{body=text?JSON.parse(text):{}}catch(_){body={message:text}}
    if(!res.ok)throw new Error(body.msg||body.message||body.error_description||('Sunucu hatası: '+res.status));
    return body;
  }
  async function refreshSession(){
    if(!session||!session.refresh_token)return false;
    try{
      const next=await jsonRequest('/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':API_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
      saveSession(next);return true;
    }catch(_){saveSession(null);return false}
  }
  async function validToken(){
    if(!session)return false;
    if(!session.expires_at||session.expires_at*1000-Date.now()>60000)return true;
    return refreshSession();
  }
  async function signIn(){
    const email=el('syncEmail').value.trim(),password=el('syncPassword').value;
    if(!email||password.length<6)return alert('E-posta adresini ve en az 6 karakterli şifreni gir.');
    setStatus('Giriş yapılıyor…','busy');
    try{
      const data=await jsonRequest('/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':API_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      saveSession(data);el('syncPassword').value='';await initialSync();toast('Bulut hesabına giriş yapıldı');
    }catch(e){setStatus('Giriş başarısız','error');alert('Giriş yapılamadı: '+e.message)}
  }
  async function signUp(){
    const email=el('syncEmail').value.trim(),password=el('syncPassword').value;
    if(!email||password.length<6)return alert('Geçerli bir e-posta ve en az 6 karakterli şifre gir.');
    setStatus('Hesap oluşturuluyor…','busy');
    try{
      const data=await jsonRequest('/auth/v1/signup',{method:'POST',headers:{'apikey':API_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      if(data.access_token){saveSession(data);el('syncPassword').value='';await initialSync();toast('Hesap oluşturuldu ve eşitlendi')}
      else{setStatus('E-posta onayı bekleniyor','busy');alert('Hesap oluşturuldu. E-postana gelen onay bağlantısına basıp ardından giriş yap.')}
    }catch(e){setStatus('Hesap oluşturulamadı','error');alert('Hesap oluşturulamadı: '+e.message)}
  }
  async function getRemote(){
    if(!await validToken())return null;
    const rows=await jsonRequest('/rest/v1/user_app_state?user_id=eq.'+encodeURIComponent(session.user.id)+'&select=data,updated_at',{headers:authHeaders(session.access_token)});
    return rows[0]||null;
  }
  async function push(){
    if(applying||pushing||!navigator.onLine||!await validToken())return false;
    pushing=true;setStatus('Eşitleniyor…','busy');
    try{
      const now=new Date().toISOString();
      const rows=await jsonRequest('/rest/v1/user_app_state?on_conflict=user_id',{method:'POST',headers:{...authHeaders(session.access_token),'Prefer':'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_id:session.user.id,data:db,updated_at:now})});
      lastRemoteAt=(rows[0]&&rows[0].updated_at)||now;
      localStorage.removeItem(DIRTY_KEY);
      setStatus('Eşitlendi · '+new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}),'online');
      return true;
    }catch(e){setStatus('Eşitleme bekliyor','error');console.warn('Cloud push',e);return false}
    finally{pushing=false}
  }
  function applyRemote(row){
    if(!row||!row.data||!Array.isArray(row.data.employees)||!Array.isArray(row.data.records))return false;
    applying=true;
    db={employees:row.data.employees,records:row.data.records,payments:Array.isArray(row.data.payments)?row.data.payments:[]};
    persist();
    applying=false;
    lastRemoteAt=row.updated_at||'';
    localStorage.removeItem(DIRTY_KEY);
    return true;
  }
  async function pull(){
    if(pushing||localStorage.getItem(DIRTY_KEY)==='1'||!navigator.onLine||!await validToken())return false;
    try{
      const row=await getRemote();
      if(row&&row.updated_at!==lastRemoteAt){
        applyRemote(row);
        setStatus('Güncellendi · '+new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}),'online');
        toast('Diğer cihazdaki kayıtlar alındı');
      }else setStatus('Eşitlendi','online');
      return true;
    }catch(e){setStatus('Bağlantı sorunu','error');console.warn('Cloud pull',e);return false}
  }
  async function initialSync(){
    if(!navigator.onLine)return setStatus('İnternet gelince eşitlenecek','busy');
    setStatus('İlk eşitleme…','busy');
    try{
      const row=await getRemote();
      if(row)applyRemote(row);else await push();
      setStatus('Eşitlendi','online');
    }catch(e){setStatus('Eşitleme başarısız','error');alert('Bulut eşitleme başlatılamadı: '+e.message)}
  }
  function localChanged(){
    if(applying)return;
    localStorage.setItem(DIRTY_KEY,'1');
    if(!session)return setStatus('Giriş yapınca eşitlenecek','busy');
    setStatus(navigator.onLine?'Eşitleme bekliyor':'İnternet gelince eşitlenecek','busy');
    clearTimeout(timer);timer=setTimeout(push,700);
  }
  async function syncNow(){
    if(!navigator.onLine)return alert('İnternet bağlantısı yok. Bağlantı gelince otomatik eşitlenecek.');
    if(localStorage.getItem(DIRTY_KEY)==='1')await push();else await pull();
  }
  function signOut(){
    if(!confirm('Bu cihazda bulut hesabından çıkılsın mı? Yerel kayıtlar silinmez.'))return;
    saveSession(null);lastRemoteAt='';toast('Hesaptan çıkıldı');
  }

  try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){session=null}
  window.cloudSync={localChanged,push,pull};
  el('signInBtn').onclick=signIn;
  el('signUpBtn').onclick=signUp;
  el('syncNowBtn').onclick=syncNow;
  el('signOutBtn').onclick=signOut;
  window.addEventListener('online',()=>session?syncNow():showAuth());
  window.addEventListener('offline',()=>setStatus('İnternet yok','busy'));
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session)syncNow()});
  showAuth();
  if(session)initialSync();
  setInterval(()=>{if(session&&document.visibilityState==='visible')pull()},15000);
})();
