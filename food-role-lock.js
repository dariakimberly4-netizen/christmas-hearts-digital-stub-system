(()=>{
  if(window.__christmasHeartsFoodRoleLock)return;
  window.__christmasHeartsFoodRoleLock=true;

  const style=document.createElement('style');
  style.id='foodRoleLockStyles';
  style.textContent=`
    body.food-role-only .stats-grid,
    body.food-role-only .module-grid{display:none!important}
    body.food-role-only .workspace>.view:not(#view-food){display:none!important}
    body.food-role-only #view-food{display:block!important}
    body.food-role-only .workspace{margin-top:0}
    body.food-role-only #view-food .section-heading{margin-top:0}
    body.food-role-only .topbar-copy .subhead{font-weight:800;color:#103b2d}
  `;
  document.head.appendChild(style);

  function sessionData(){
    try{
      if(typeof session!=='undefined'&&session)return session;
    }catch{}
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

  function isFoodStation(){
    const r=String(role()||'').trim().toUpperCase();
    const n=String(name()||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');
    // Proper FOOD role is always locked to Food Claim. For the existing demo
    // account, also treat an account named "food claim" / "food claiming" as
    // the Food station even if it was accidentally created as Administrator.
    return r==='FOOD'||/^food claim(?:ing)?$/.test(n)||n==='food claim staff';
  }

  function apply(){
    const isFood=isFoodStation();
    document.body.classList.toggle('food-role-only',isFood);
    if(!isFood)return;

    document.querySelectorAll('.module-btn').forEach(btn=>{
      btn.hidden=btn.dataset.view!=='food';
      btn.classList.toggle('active',btn.dataset.view==='food');
    });

    document.querySelectorAll('.workspace>.view').forEach(view=>{
      const food=view.id==='view-food';
      view.hidden=!food;
      view.classList.toggle('active',food);
    });

    const roleLabel=document.getElementById('sessionRole');
    if(roleLabel)roleLabel.textContent='Food Claiming';

    const sub=document.querySelector('.topbar-copy .subhead');
    if(sub)sub.textContent='FOOD CLAIM STATION • One meal per registered person';

    const heading=document.querySelector('#view-food .section-heading h2');
    if(heading)heading.textContent='Food Claim Station';

    try{if(typeof showView==='function')showView('food')}catch{}
  }

  const observer=new MutationObserver(()=>{
    if(isFoodStation())requestAnimationFrame(apply);
  });

  function start(){
    apply();
    observer.observe(document.body,{attributes:true,childList:true,subtree:true,attributeFilter:['class','hidden']});
    document.addEventListener('click',()=>setTimeout(apply,0),true);
    window.addEventListener('pageshow',apply);
    window.addEventListener('storage',apply);
    setTimeout(apply,100);
    setTimeout(apply,500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
