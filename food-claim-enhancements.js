(()=>{
  if(window.__christmasHeartsFoodClaimEnhancements)return;
  window.__christmasHeartsFoodClaimEnhancements=true;

  const style=document.createElement('style');
  style.id='foodClaimEnhancementStyles';
  style.textContent=`
    #foodCommandPanel{margin:14px 0 16px;padding:14px;border:1px solid #d8dfd8;border-radius:18px;background:#fffdf8}
    .food-command-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
    .food-command-stat{padding:12px 8px;border:1px solid #e3dccf;border-radius:14px;background:#fff;text-align:center}
    .food-command-stat span{display:block;font-size:.68rem;font-weight:800;letter-spacing:.05em;color:#6f756d;text-transform:uppercase}
    .food-command-stat b{display:block;margin-top:4px;font-size:1.25rem;color:#103b2d}
    #foodInventoryAlert{margin:10px 0 0;padding:10px 12px;border-radius:12px;background:#edf4ef;color:#103b2d;font-size:.82rem;font-weight:800;text-align:center}
    #foodInventoryAlert.low{background:#fff2d8;color:#7b5500}
    #foodInventoryAlert.urgent{background:#f9e7e9;color:#9f2430}
    #foodResults [data-action="food"]{min-height:58px;min-width:170px;font-size:1rem;font-weight:900}
    .family-food-progress{margin:9px 0 0;padding:9px 11px;border-radius:12px;background:#edf4ef;color:#103b2d;font-size:.8rem;font-weight:800}
    #foodRecentClaims{margin-top:16px}
    #foodRecentClaims h3{margin:0 0 8px;color:#103b2d;font-size:1rem}
    .food-recent-list{display:grid;gap:8px}
    .food-recent-row{display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #e3dccf;border-radius:13px;background:#fff}
    .food-recent-row b{display:block;color:#22251f}
    .food-recent-row small{display:block;margin-top:2px;color:#6f756d;line-height:1.35}
    .food-recent-time{white-space:nowrap;text-align:right;color:#103b2d;font-size:.75rem;font-weight:800}
    #foodClaimConfirmation{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(24px);z-index:99999;width:min(520px,calc(100% - 24px));padding:16px 18px;border-radius:18px;background:#103b2d;color:#fff;box-shadow:0 12px 34px rgba(0,0,0,.24);opacity:0;pointer-events:none;transition:.2s ease;text-align:center}
    #foodClaimConfirmation.show{opacity:1;transform:translateX(-50%) translateY(0)}
    #foodClaimConfirmation b{display:block;font-size:1.02rem}
    #foodClaimConfirmation small{display:block;margin-top:5px;opacity:.9}
    @media(max-width:560px){
      .food-command-grid{grid-template-columns:1fr 1fr 1fr}
      .food-command-stat{padding:10px 4px}
      .food-command-stat b{font-size:1.05rem}
      .food-recent-row{align-items:flex-start}
      #foodResults [data-action="food"]{width:100%;min-width:0}
    }
  `;
  document.head.appendChild(style);

  function safe(v){try{return typeof esc==='function'?esc(v):String(v??'')}catch{return String(v??'')}}
  function fmt(v){try{return v?new Date(v).toLocaleString([], {dateStyle:'medium',timeStyle:'short'}):'—'}catch{return '—'}}
  function foodClaims(){try{return attendees.filter(a=>a.foodClaimedAt)}catch{return []}}
  function capacity(){try{return Math.max(0,Number(settings?.foodCapacity)||0)}catch{return 0}}
  function remaining(){const c=capacity();return c?Math.max(c-foodClaims().length,0):null}

  function ensurePanel(){
    const view=document.getElementById('view-food');
    if(!view)return;
    if(!document.getElementById('foodCommandPanel')){
      const panel=document.createElement('section');
      panel.id='foodCommandPanel';
      panel.innerHTML=`
        <div class="food-command-grid">
          <div class="food-command-stat"><span>Food Claimed</span><b id="foodClaimedLive">0</b></div>
          <div class="food-command-stat"><span>Meals Remaining</span><b id="foodRemainingLive">—</b></div>
          <div class="food-command-stat"><span>Registered</span><b id="foodRegisteredLive">0</b></div>
        </div>
        <div id="foodInventoryAlert">Food inventory is not set yet.</div>`;
      const scanner=view.querySelector('.scanner-actions');
      scanner?.insertAdjacentElement('beforebegin',panel);
    }
    if(!document.getElementById('foodRecentClaims')){
      const recent=document.createElement('section');
      recent.id='foodRecentClaims';
      recent.innerHTML='<h3>Recent Food Claims</h3><div class="food-recent-list" id="foodRecentList"></div>';
      const results=document.getElementById('foodResults');
      results?.insertAdjacentElement('afterend',recent);
    }
    const input=document.getElementById('foodSearch');
    if(input){
      input.type='search';
      input.autocomplete='off';
      input.placeholder='Name, attendee code, Parent, or Family ID';
      input.setAttribute('aria-label','Search food claim by name, attendee code, parent, or family ID');
    }
    const note=view.querySelector('.rule-note');
    if(note)note.textContent='Scan the Family QR or Food QR, or search by name / Family ID. One food claim per registered person.';
  }

  function renderInventory(){
    ensurePanel();
    const claimed=foodClaims().length;
    const cap=capacity();
    const left=remaining();
    const claimedEl=document.getElementById('foodClaimedLive');
    const remainingEl=document.getElementById('foodRemainingLive');
    const registeredEl=document.getElementById('foodRegisteredLive');
    if(claimedEl)claimedEl.textContent=claimed;
    if(remainingEl)remainingEl.textContent=left===null?'—':left;
    if(registeredEl){try{registeredEl.textContent=attendees.length}catch{registeredEl.textContent='0'}}
    const alert=document.getElementById('foodInventoryAlert');
    if(!alert)return;
    alert.className='';
    if(!cap){alert.textContent='Food inventory is not set yet. Admin can set the total meal capacity.';return}
    if(left===0){alert.className='urgent';alert.textContent='NO MEALS REMAINING — stop food claiming until inventory is corrected.';return}
    if(left<=5){alert.className='urgent';alert.textContent=`URGENT: Only ${left} meal${left===1?'':'s'} remaining.`;return}
    if(left<=10){alert.className='low';alert.textContent=`LOW INVENTORY: ${left} meals remaining.`;return}
    alert.textContent=`Inventory OK — ${left} meals remaining.`;
  }

  function renderRecent(){
    ensurePanel();
    const el=document.getElementById('foodRecentList');
    if(!el)return;
    let list=[];
    try{list=[...attendees].filter(a=>a.foodClaimedAt).sort((a,b)=>String(b.foodClaimedAt).localeCompare(String(a.foodClaimedAt))).slice(0,8)}catch{}
    if(!list.length){el.innerHTML='<div class="food-recent-row"><div><b>No food claims yet.</b><small>The latest claims will appear here.</small></div></div>';return}
    el.innerHTML=list.map(a=>`<div class="food-recent-row"><div><b>${safe(a.fullName)}</b><small>${a.type==='KID'?'Child':'Parent / Guardian'} • ${safe(a.code)} • Staff: ${safe(a.foodClaimedBy||'—')}</small></div><div class="food-recent-time">${safe(fmt(a.foodClaimedAt))}</div></div>`).join('');
  }

  function decorateFoodResults(){
    const root=document.getElementById('foodResults');if(!root)return;
    root.querySelectorAll('.result-card').forEach(card=>{
      const pass=card.querySelector('[data-action="pass"]');
      const button=card.querySelector('[data-action="food"]');
      if(!pass&&!button)return;
      const id=(button||pass)?.dataset.id;
      let a=null;try{a=typeof byId==='function'?byId(id):attendees.find(x=>String(x.id)===String(id))}catch{}
      if(!a?.familyId)return;
      let family=[];try{family=attendees.filter(x=>x.familyId===a.familyId)}catch{}
      const done=family.filter(x=>x.foodClaimedAt).length;
      const old=card.querySelector('.family-food-progress');if(old)old.remove();
      const info=card.firstElementChild||card;
      info.insertAdjacentHTML('beforeend',`<div class="family-food-progress">Family food progress: ${done}/${family.length} claimed</div>`);
      if(button){
        button.textContent=a.foodClaimedAt?'FOOD CLAIMED':`CLAIM FOOD — ${a.fullName}`;
        button.disabled=!!a.foodClaimedAt;
      }
    });
  }

  function scopeFamilyWallet(){
    const dialog=document.getElementById('familyStubDialog');if(!dialog?.open)return;
    const active=document.querySelector('.view.active')?.id||'';
    const foodTab=dialog.querySelector('[data-wallet-tab="food"]');
    const raffleTab=dialog.querySelector('[data-wallet-tab="raffle"]');
    if(foodTab)foodTab.hidden=active==='view-raffle';
    if(raffleTab)raffleTab.hidden=active==='view-food';
    if(active==='view-food'&&foodTab&&!foodTab.classList.contains('active'))foodTab.click();
    if(active==='view-raffle'&&raffleTab&&!raffleTab.classList.contains('active'))raffleTab.click();
    if(active!=='view-food'&&active!=='view-raffle'){if(foodTab)foodTab.hidden=false;if(raffleTab)raffleTab.hidden=false}

    if(active==='view-food'){
      const panel=dialog.querySelector('#familyWalletFoodPanel');
      const id=document.getElementById('familyStubCode')?.textContent?.trim();
      if(panel&&id){
        let fam=[];try{fam=attendees.filter(a=>a.familyId===id)}catch{}
        const done=fam.filter(a=>a.foodClaimedAt).length;
        let progress=panel.querySelector('.family-food-progress');
        if(!progress){progress=document.createElement('div');progress.className='family-food-progress';panel.prepend(progress)}
        progress.textContent=`Family food progress: ${done}/${fam.length} claimed • ${Math.max(fam.length-done,0)} pending`;
      }
    }
  }

  function showConfirmation(a){
    let box=document.getElementById('foodClaimConfirmation');
    if(!box){box=document.createElement('div');box.id='foodClaimConfirmation';document.body.appendChild(box)}
    box.innerHTML=`<b>✓ Food successfully claimed for ${safe(a.fullName)}</b><small>${safe(fmt(a.foodClaimedAt))} • Staff: ${safe(a.foodClaimedBy||'—')}</small>`;
    box.classList.add('show');
    clearTimeout(box._timer);box._timer=setTimeout(()=>box.classList.remove('show'),3200);
  }

  function renderAll(){renderInventory();renderRecent();decorateFoodResults();scopeFamilyWallet()}

  // Wrap claimFood so every successful claim produces a strong confirmation and refreshes all food UI.
  try{
    const baseClaim=window.claimFood;
    if(typeof baseClaim==='function'&&!baseClaim.__foodEnhanced){
      const wrapped=function(id){
        let before=null,a=null;try{a=typeof byId==='function'?byId(id):null;before=a?.foodClaimedAt||null}catch{}
        const out=baseClaim(id);
        try{a=typeof byId==='function'?byId(id):a}catch{}
        if(a&&!before&&a.foodClaimedAt)showConfirmation(a);
        setTimeout(renderAll,20);
        return out;
      };
      wrapped.__foodEnhanced=true;
      window.claimFood=wrapped;
    }
  }catch{}

  // Keep counters/history current after any save, undo, restore, or cross-tab update.
  try{
    const baseSave=window.save;
    if(typeof baseSave==='function'&&!baseSave.__foodUiEnhanced){
      const wrappedSave=function(){const out=baseSave();setTimeout(renderAll,0);return out};
      wrappedSave.__foodUiEnhanced=true;
      window.save=wrappedSave;
    }
  }catch{}

  const observer=new MutationObserver(()=>setTimeout(renderAll,15));
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="food"],[data-action="food"],[data-wallet-claim-food],[data-family-stub]'))setTimeout(renderAll,30);
  },true);
  window.addEventListener('storage',()=>setTimeout(renderAll,20));

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderAll,{once:true});
  else renderAll();
})();
