(()=>{
  if(window.__christmasHeartsRegistrationRoleLock)return;
  window.__christmasHeartsRegistrationRoleLock=true;

  const style=document.createElement('style');
  style.id='registrationRoleLockStyles';
  style.textContent=`
    body.registration-role-only .stats-grid,
    body.registration-role-only .module-grid{display:none!important}
    body.registration-role-only .workspace>.view:not(#view-register){display:none!important}
    body.registration-role-only #view-register{display:block!important}
    body.registration-role-only .workspace{margin-top:0}
    body.registration-role-only #view-register .section-heading{margin-top:0}
    body.registration-role-only .topbar-copy .subhead{font-weight:800;color:#103b2d}
  `;
  document.head.appendChild(style);

  function requestedStation(){
    try{return new URLSearchParams(location.search).get('station')||''}catch{return ''}
  }
  function sessionData(){
    try{if(typeof session!=='undefined'&&session)return session}catch{}
    try{return JSON.parse(sessionStorage.getItem('christmasHearts2026.session')||'null')||{}}catch{return {}}
  }
  function role(){
    try{if(typeof currentRole==='function')return currentRole()}catch{}
    return sessionData().role||'UNKNOWN';
  }
  function name(){
    try{if(typeof currentStaff==='function')return currentStaff()}catch{}
    return sessionData().name||'';
  }
  function hasSession(){return !!sessionData()?.name}
  function isRegistrationStation(){
    const requested=requestedStation().toLowerCase();
    if(requested==='food')return false;
    if(requested==='registration')return true;
    const r=String(role()||'').trim().toUpperCase();
    const n=String(name()||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    return r==='REGISTRATION'||n==='registration'||n==='registration encoder'||n==='registration staff';
  }

  function prepareLogin(){
    if(requestedStation().toLowerCase()!=='registration'||hasSession())return;
    const notice=document.querySelector('#loginForm .notice-box');
    if(notice)notice.innerHTML='<b>Registration Station Login</b><p>Log in to open Registration only. If a Registration Encoder account exists on this device, it is selected automatically.</p>';
    const select=document.getElementById('loginStaff');
    if(select){
      const reg=[...select.options].find(o=>/registration encoder/i.test(o.textContent||''));
      if(reg)select.value=reg.value;
    }
  }

  function apply(){
    const locked=isRegistrationStation();
    document.body.classList.toggle('registration-role-only',locked&&hasSession());
    if(!locked){return}
    if(!hasSession()){prepareLogin();return}

    document.querySelectorAll('.module-btn').forEach(btn=>{
      btn.hidden=btn.dataset.view!=='register';
      btn.classList.toggle('active',btn.dataset.view==='register');
    });
    document.querySelectorAll('.workspace>.view').forEach(view=>{
      const register=view.id==='view-register';
      view.hidden=!register;
      view.classList.toggle('active',register);
    });
    const roleLabel=document.getElementById('sessionRole');
    if(roleLabel)roleLabel.textContent='Registration';
    const sub=document.querySelector('.topbar-copy .subhead');
    if(sub)sub.textContent='REGISTRATION STATION • Parent/Guardian + Children';
    const heading=document.querySelector('#view-register .section-heading h2');
    if(heading)heading.textContent='Registration Station';
    try{if(typeof showView==='function')showView('register')}catch{}
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(()=>{prepareLogin();apply()}));
  function start(){
    prepareLogin();apply();
    observer.observe(document.body,{attributes:true,childList:true,subtree:true,attributeFilter:['class','hidden']});
    document.addEventListener('click',()=>setTimeout(apply,0),true);
    window.addEventListener('pageshow',()=>{prepareLogin();apply()});
    window.addEventListener('storage',()=>{prepareLogin();apply()});
    setTimeout(()=>{prepareLogin();apply()},100);
    setTimeout(()=>{prepareLogin();apply()},500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
