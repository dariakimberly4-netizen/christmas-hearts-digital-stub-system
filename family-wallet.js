(()=>{
  const VERSION='24';
  let activeWalletTab='food';
  let decorating=false;
  let lastSignature='';

  const style=document.createElement('style');
  style.textContent=`
    .family-wallet{margin:14px 0 4px;border:1px solid #e3dccf;border-radius:18px;background:#fff;overflow:hidden}
    .family-wallet-title{padding:15px 16px 10px;text-align:center}
    .family-wallet-title h3{margin:0;color:#103b2d;font-size:1.05rem}
    .family-wallet-title p{margin:5px 0 0;color:#6f756d;font-size:.82rem;line-height:1.4}
    .family-wallet-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 12px 12px;background:#fffaf0;border-top:1px solid #eee4d4;border-bottom:1px solid #eee4d4;position:sticky;top:0;z-index:4}
    .family-wallet-tab{min-height:50px;border-radius:13px;border:1px solid #d8d4ca;background:#fff;color:#103b2d;font-weight:900;font-size:.92rem;touch-action:manipulation}
    .family-wallet-tab.active{background:#103b2d;color:#fff;border-color:#103b2d}
    .family-wallet-panel{padding:13px}
    .family-wallet-panel[hidden]{display:none!important}
    .wallet-member{border:1px solid #e3dccf;border-radius:17px;padding:14px;margin:0 0 12px;background:#fffdf8;text-align:center}
    .wallet-member:last-child{margin-bottom:0}
    .wallet-member-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;text-align:left;margin-bottom:8px}
    .wallet-member-head h4{margin:0;color:#22251f;font-size:1rem}
    .wallet-member-head small{display:block;color:#6f756d;margin-top:3px}
    .wallet-kind{display:inline-flex;align-items:center;justify-content:center;min-width:84px;padding:5px 8px;border-radius:999px;font-size:.67rem;font-weight:900;letter-spacing:.05em}
    .wallet-kind.food{background:#f5efe2;color:#7a5b20}
    .wallet-kind.raffle{background:#f9e7e9;color:#9f2430}
    .wallet-qr{width:184px;height:184px;margin:8px auto;display:grid;place-items:center;background:#fff;border:9px solid #fff;border-radius:15px;box-shadow:0 3px 12px rgba(0,0,0,.08)}
    .wallet-qr canvas,.wallet-qr img{max-width:100%;height:auto}
    .wallet-status{display:inline-block;margin:3px auto 8px;padding:6px 10px;border-radius:999px;font-size:.72rem;font-weight:900;background:#edf4ef;color:#103b2d}
    .wallet-status.pending{background:#f5efe2;color:#6a5427}
    .wallet-status.claimed{background:#e8f3eb;color:#0f5a35}
    .wallet-status.locked{background:#f9e7e9;color:#9f2430}
    .wallet-help{margin:0 0 12px;padding:10px 12px;border-radius:13px;background:#f5efe2;color:#4b504a;font-size:.8rem;line-height:1.45;text-align:center}
    .wallet-member .primary-btn,.wallet-member .ghost-btn{width:100%;min-height:46px;margin-top:5px}
    .family-member-list{display:none!important}
    @media(max-width:560px){
      .family-wallet-tabs{grid-template-columns:1fr 1fr}
      .wallet-qr{width:200px;height:200px}
      .family-wallet-panel{padding:10px}
    }
  `;
  document.head.appendChild(style);

  function safeEsc(v){
    try{return typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}catch{return String(v??'')}
  }
  function say(m){try{toast(m)}catch{alert(m)}}
  function familyId(){return document.getElementById('familyStubCode')?.textContent?.trim()||''}
  function list(){const id=familyId();try{return attendees.filter(a=>a.familyId===id).sort((a,b)=>a.type===b.type?String(a.fullName).localeCompare(String(b.fullName)):a.type==='PARENT'?-1:1)}catch{return []}}
  function role(){try{return currentRole()}catch{return 'UNKNOWN'}}

  function signature(items){
    return `${familyId()}|${items.map(a=>[a.id,a.stubReleasedAt||'',a.foodClaimedAt||'',a.raffleClaimedAt||'',a.type].join(':')).join('|')}`;
  }

  function foodCard(a){
    let status='',statusClass='',action='';
    if(a.foodClaimedAt){status='FOOD CLAIMED';statusClass='claimed'}
    else if(!a.stubReleasedAt){status='LOCKED — RELEASE FAMILY STUB FIRST';statusClass='locked'}
    else {status='FOOD AVAILABLE';statusClass='pending'}
    if(['ADMIN','FOOD'].includes(role())&&!a.foodClaimedAt){
      action=`<button class="primary-btn" type="button" data-wallet-claim-food="${safeEsc(a.id)}" ${!a.stubReleasedAt?'disabled':''}>${!a.stubReleasedAt?'Food Locked':'Claim Food'}</button>`;
    }
    const qrId=`wallet-food-qr-${a.id}`;
    return `<article class="wallet-member">
      <div class="wallet-member-head">
        <div><h4>${safeEsc(a.fullName)}</h4><small>${a.type==='KID'?'Child':'Parent / Guardian'} • ${safeEsc(a.code)}</small></div>
        <span class="wallet-kind food">FOOD STUB</span>
      </div>
      <div class="wallet-qr" id="${safeEsc(qrId)}"></div>
      <span class="wallet-status ${statusClass}">${status}</span>
      ${action}
    </article>`;
  }

  function raffleCard(a){
    let status='',statusClass='',action='';
    if(a.raffleClaimedAt){status='RAFFLE ACTIVE';statusClass='claimed'}
    else if(!a.stubReleasedAt){status='LOCKED — RELEASE FAMILY STUB FIRST';statusClass='locked'}
    else {status='RAFFLE AVAILABLE';statusClass='pending'}
    if(['ADMIN','RAFFLE'].includes(role())&&!a.raffleClaimedAt){
      action=`<button class="primary-btn" type="button" data-wallet-claim-raffle="${safeEsc(a.id)}" ${!a.stubReleasedAt?'disabled':''}>${!a.stubReleasedAt?'Raffle Locked':'Activate Raffle'}</button>`;
    }
    const qrId=`wallet-raffle-qr-${a.id}`;
    return `<article class="wallet-member">
      <div class="wallet-member-head">
        <div><h4>${safeEsc(a.fullName)}</h4><small>Child • ${safeEsc(a.code)}</small></div>
        <span class="wallet-kind raffle">RAFFLE STUB</span>
      </div>
      <div class="wallet-qr" id="${safeEsc(qrId)}"></div>
      <span class="wallet-status ${statusClass}">${status}</span>
      ${action}
    </article>`;
  }

  function drawQr(id,payload){
    const q=document.getElementById(id);if(!q)return;
    q.innerHTML='';
    if(window.QRCode){
      new QRCode(q,{text:payload,width:164,height:164,colorDark:'#103b2d',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
    }else q.innerHTML=`<b>${safeEsc(payload.split('|').pop())}</b>`;
  }

  function renderQrs(items){
    items.forEach(a=>drawQr(`wallet-food-qr-${a.id}`,`CHRISTMASHEARTS-FOOD|${a.code}`));
    items.filter(a=>a.type==='KID').forEach(a=>drawQr(`wallet-raffle-qr-${a.id}`,`CHRISTMASHEARTS-RAFFLE|${a.code}`));
  }

  function applyTab(){
    document.querySelectorAll('.family-wallet-tab').forEach(b=>b.classList.toggle('active',b.dataset.walletTab===activeWalletTab));
    const food=document.getElementById('familyWalletFoodPanel');
    const raffle=document.getElementById('familyWalletRafflePanel');
    if(food)food.hidden=activeWalletTab!=='food';
    if(raffle)raffle.hidden=activeWalletTab!=='raffle';
  }

  function enhance(force=false){
    if(decorating)return;
    const d=document.getElementById('familyStubDialog');
    const card=document.getElementById('familyStubCard');
    if(!d||!card)return;
    const items=list();if(!items.length)return;
    const sig=signature(items);
    if(!force&&sig===lastSignature&&document.getElementById('familyWallet')){applyTab();return}
    decorating=true;
    try{
      const kids=items.filter(a=>a.type==='KID');
      let wallet=document.getElementById('familyWallet');
      if(!wallet){
        wallet=document.createElement('section');
        wallet.id='familyWallet';wallet.className='family-wallet';
        const memberList=document.getElementById('familyMemberList');
        (memberList?.parentElement||card).insertBefore(wallet,memberList||null);
      }
      wallet.innerHTML=`
        <div class="family-wallet-title">
          <h3>Family QR Wallet</h3>
          <p>One family QR opens separate Food and Raffle stubs for the household.</p>
        </div>
        <div class="family-wallet-tabs">
          <button class="family-wallet-tab" type="button" data-wallet-tab="food">FOOD STUBS</button>
          <button class="family-wallet-tab" type="button" data-wallet-tab="raffle">RAFFLE STUBS</button>
        </div>
        <div class="family-wallet-panel" id="familyWalletFoodPanel">
          <p class="wallet-help">Parent/Guardian and children each have their own Food QR. One food claim per person.</p>
          ${items.map(foodCard).join('')}
        </div>
        <div class="family-wallet-panel" id="familyWalletRafflePanel" hidden>
          <p class="wallet-help">Raffle is for children only. Parents/Guardians do not receive a raffle stub.</p>
          ${kids.length?kids.map(raffleCard).join(''):'<p class="wallet-help">No child raffle stubs in this family.</p>'}
        </div>`;
      applyTab();
      renderQrs(items);
      lastSignature=sig;

      const instruction=card.querySelector('.family-instruction');
      if(instruction)instruction.textContent='Scan the Family QR to open this wallet. Choose FOOD STUBS or RAFFLE STUBS. Food is for every registered family member; raffle is for children only.';
    }finally{decorating=false}
  }

  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-wallet-tab]');
    if(tab){activeWalletTab=tab.dataset.walletTab==='raffle'?'raffle':'food';applyTab();return}

    const food=e.target.closest('[data-wallet-claim-food]');
    if(food){
      const id=food.dataset.walletClaimFood;
      try{
        const a=typeof byId==='function'?byId(id):null;
        if(!a)return say('Attendee record not found.');
        if(!['ADMIN','FOOD'].includes(role()))return say('Food Claiming staff access required.');
        if(!a.stubReleasedAt)return say('Family stub must be released first.');
        if(a.foodClaimedAt)return say('Food has already been claimed.');
        claimFood(id);
        lastSignature='';
        setTimeout(()=>enhance(true),30);
      }catch{return say('Could not process the food claim.')}
      return;
    }

    const raffle=e.target.closest('[data-wallet-claim-raffle]');
    if(raffle){
      const id=raffle.dataset.walletClaimRaffle;
      try{
        const a=typeof byId==='function'?byId(id):null;
        if(!a)return say('Attendee record not found.');
        if(a.type==='PARENT')return say('Parents / Guardians are not eligible for raffle.');
        if(!['ADMIN','RAFFLE'].includes(role()))return say('Raffle Claiming staff access required.');
        if(!a.stubReleasedAt)return say('Family stub must be released first.');
        if(a.raffleClaimedAt)return say('Raffle is already active.');
        claimRaffle(id);
        lastSignature='';
        activeWalletTab='raffle';
        setTimeout(()=>enhance(true),30);
      }catch{return say('Could not process the raffle stub.')}
    }
  });

  const originalOpenFamilyStub=window.openFamilyStub;
  if(typeof originalOpenFamilyStub==='function'){
    window.openFamilyStub=function(id,mode='general'){
      activeWalletTab=mode==='raffle'?'raffle':'food';
      lastSignature='';
      const out=originalOpenFamilyStub(id,mode);
      setTimeout(()=>enhance(true),0);
      setTimeout(()=>enhance(),80);
      return out;
    };
  }

  const originalHandleScan=window.handleScan;
  if(typeof originalHandleScan==='function'){
    window.handleScan=function(code){
      const raw=String(code||'').trim();
      const typed=raw.match(/^CHRISTMASHEARTS-(FOOD|RAFFLE)\|(CH-1203-[A-Z0-9-]+)$/i);
      if(typed){
        const kind=typed[1].toUpperCase();
        const attendeeCode=typed[2].toUpperCase();
        let a=null;
        try{a=byCode(attendeeCode)}catch{}
        if(!a)return say('Attendee code not found.');
        try{closeScanner()}catch{}
        if(kind==='FOOD'){
          try{showView('food');renderSearchResults('foodResults',a.code,'food')}catch{}
          return;
        }
        if(a.type==='PARENT')return say('Parents / Guardians are not eligible for raffle.');
        try{showView('raffle');renderSearchResults('raffleResults',a.code,'raffle')}catch{}
        return;
      }
      return originalHandleScan(code);
    };
  }

  const observer=new MutationObserver(()=>{
    const d=document.getElementById('familyStubDialog');
    if(d?.open&&!decorating)setTimeout(()=>enhance(),20);
  });
  observer.observe(document.body,{childList:true,subtree:true});

  window.refreshFamilyWallet=()=>{lastSignature='';enhance(true)};
})();
