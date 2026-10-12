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

  function role(){
    try{if(typeof currentRole==='function')return currentRole()}catch{}
    try{return JSON.parse(sessionStorage.getItem('christmasHearts2026.session')||'null')?.role||'UNKNOWN'}catch{return 'UNKNOWN'}
  }

  function apply(){
    const isFood=role()==='FOOD';
    document.body.classList.toggle('food-role-only',isFood);
    if(!isFood)return;

    document.querySelectorAll('.module-btn').forEach(btn=>{
      btn.hidden=btn.dataset.view!=='food';
      btn.classList.toggle('active',btn.dataset.view==='food');
    });

    document.querySelectorAll('.workspace>.view').forEach(view=>{
      view.classList.toggle('active',view.id==='view-food');
    });

    const roleLabel=document.getElementById('sessionRole');
    if(roleLabel)roleLabel.textContent='Food Claiming';

    const sub=document.querySelector('.topbar-copy .subhead');
    if(sub)sub.textContent='FOOD CLAIM STATION • One meal per registered person';

    const heading=document.querySelector('#view-food .section-heading h2');
    if(heading)heading.textContent='Food Claim Station';
  }

  // Re-apply after login and after any app render that could switch views.
  const observer=new MutationObserver(()=>{
    if(role()==='FOOD')requestAnimationFrame(apply);
  });

  function start(){
    apply();
    observer.observe(document.body,{attributes:true,childList:true,subtree:true,attributeFilter:['class','hidden']});
    document.addEventListener('click',()=>setTimeout(apply,0),true);
    window.addEventListener('pageshow',apply);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
