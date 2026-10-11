(()=>{
  let currentPassId=null;
  const originalOpenPass=window.openPass;

  const style=document.createElement('style');
  style.textContent=`
    #passDialog{max-height:calc(100dvh - 20px);overflow:auto}
    #passDialog .dialog-close{z-index:100;width:52px;height:52px;display:grid;place-items:center;pointer-events:auto!important;touch-action:manipulation;user-select:none}
    #passDialog .eligibility-grid>div{cursor:pointer;touch-action:manipulation;user-select:none;transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease;min-height:92px;display:flex;flex-direction:column;align-items:center;justify-content:center}
    #passDialog .eligibility-grid>div.pass-action-ready{border-color:#c99a42;box-shadow:0 0 0 2px rgba(201,154,66,.10)}
    #passDialog .eligibility-grid>div.pass-action-ready:active{transform:scale(.97)}
    #passDialog .eligibility-grid>div.pass-action-disabled{cursor:default;opacity:.68}
    #passActionHint{margin:12px 0 0;font-size:.78rem;font-weight:700;color:#103b2d}
  `;
  document.head.appendChild(style);

  function role(){try{return typeof window.currentRole==='function'?window.currentRole():'UNKNOWN'}catch{return 'UNKNOWN'}}
  function say(message){try{if(typeof window.toast==='function')window.toast(message);else alert(message)}catch{alert(message)}}
  function attendee(){try{return currentPassId&&typeof window.byId==='function'?window.byId(currentPassId):null}catch{return null}}

  function closePass(){const d=document.getElementById('passDialog');if(d?.open){try{d.close()}catch{}}}
  function reopen(id){setTimeout(()=>{closePass();try{window.openPass(id)}catch{}},0)}

  function runAction(kind){
    const a=attendee();
    if(!a)return say('Attendee record not found.');
    const r=role();

    if(kind==='stub'){
      if(a.stubReleasedAt)return say('Digital stub is already released.');
      if(!['ADMIN','STUB'].includes(r))return say('Digital Stub Release staff access required.');
      closePass();
      if(typeof window.releaseStub==='function')window.releaseStub(a.id);
      return;
    }

    if(kind==='food'){
      if(a.foodClaimedAt)return say('Food has already been claimed.');
      if(!a.stubReleasedAt)return say('Digital stub must be released first.');
      if(!['ADMIN','FOOD'].includes(r))return say('Food Claiming staff access required.');
      if(typeof window.claimFood==='function')window.claimFood(a.id);
      reopen(a.id);
      return;
    }

    if(kind==='raffle'){
      if(a.type==='PARENT')return say('Parents / Guardians are not eligible for raffle.');
      if(a.raffleClaimedAt)return say('Raffle is already active.');
      if(!a.stubReleasedAt)return say('Digital stub must be released first.');
      if(!['ADMIN','RAFFLE'].includes(r))return say('Raffle Claiming staff access required.');
      if(typeof window.claimRaffle==='function')window.claimRaffle(a.id);
      reopen(a.id);
    }
  }

  function makePassClickable(){
    const d=document.getElementById('passDialog');
    const grid=d?.querySelector('.eligibility-grid');
    const a=attendee();
    if(!grid||!a)return;

    const cards=[...grid.children];
    const kinds=['stub','food','raffle'];
    cards.forEach((card,i)=>{
      const kind=kinds[i];
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.dataset.passAction=kind;
      card.onclick=()=>runAction(kind);
      card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();runAction(kind)}};
      const disabled=(kind==='stub'&&a.stubReleasedAt)||(kind==='food'&&a.foodClaimedAt)||(kind==='raffle'&&(a.type==='PARENT'||a.raffleClaimedAt));
      card.classList.toggle('pass-action-disabled',disabled);
      card.classList.toggle('pass-action-ready',!disabled);
      card.setAttribute('aria-disabled',disabled?'true':'false');
    });

    let hint=d.querySelector('#passActionHint');
    if(!hint){
      hint=document.createElement('p');
      hint.id='passActionHint';
      grid.insertAdjacentElement('afterend',hint);
    }
    hint.textContent='Tap DIGITAL STUB, FOOD, or RAFFLE to process the available action.';
  }

  if(typeof originalOpenPass==='function'){
    window.openPass=function(id){
      currentPassId=id;
      const result=originalOpenPass(id);
      setTimeout(makePassClickable,0);
      return result;
    };
  }

  const closeBtn=document.getElementById('closePassBtn');
  if(closeBtn){
    closeBtn.addEventListener('touchend',e=>{e.preventDefault();closePass()},{passive:false});
    closeBtn.addEventListener('click',closePass);
  }

  document.addEventListener('click',e=>{
    const passButton=e.target.closest('[data-action="pass"]');
    if(passButton){currentPassId=passButton.dataset.id;setTimeout(makePassClickable,0)}
  },true);
})();
