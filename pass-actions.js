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
    #sharePassBtn{min-height:48px;touch-action:manipulation}
  `;
  document.head.appendChild(style);

  function role(){try{return typeof window.currentRole==='function'?window.currentRole():'UNKNOWN'}catch{return 'UNKNOWN'}}
  function say(message){try{if(typeof window.toast==='function')window.toast(message);else alert(message)}catch{alert(message)}}
  function attendee(){try{return currentPassId&&typeof window.byId==='function'?window.byId(currentPassId):null}catch{return null}}
  function typeLabel(a){return a?.type==='KID'?'Kid':'Parent / Guardian'}

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

  function roundRect(ctx,x,y,w,h,r,fill,stroke){
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}
  }

  function drawCentered(ctx,text,y,font,color){ctx.font=font;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,450,y)}

  async function buildPassPng(a){
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1400;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,900,1400);
    roundRect(ctx,35,35,830,1330,38,'#fffdf8','#e3dccf');

    drawCentered(ctx,'OFFICIAL DIGITAL EVENT PASS',110,'700 28px Arial','#22251f');
    drawCentered(ctx,'CHRISTmas in Our Hearts',175,'700 45px Georgia','#103b2d');
    drawCentered(ctx,a.code,245,'800 34px Arial','#9f2430');

    const qr=document.querySelector('#qrCode canvas, #qrCode img');
    if(qr){
      ctx.fillStyle='#fff';ctx.fillRect(235,300,430,430);
      try{ctx.drawImage(qr,260,325,380,380)}catch{}
    }else{
      drawCentered(ctx,a.code,510,'700 36px Arial','#103b2d');
    }

    drawCentered(ctx,a.fullName,790,'700 42px Arial','#111');
    drawCentered(ctx,`${typeLabel(a)} • Age ${a.age} • ${a.location||''}`,850,'400 28px Arial','#22251f');
    drawCentered(ctx,`Family / Household ID: ${a.familyId||'—'}`,905,'400 25px Arial','#6f756d');

    const cards=[
      {x:95,label:'DIGITAL STUB',value:'RELEASED'},
      {x:335,label:'FOOD',value:a.foodClaimedAt?'CLAIMED':'ELIGIBLE'},
      {x:575,label:'RAFFLE',value:a.type==='PARENT'?'NOT ELIGIBLE':(a.raffleClaimedAt?'ACTIVE':'ELIGIBLE')}
    ];
    cards.forEach(c=>{
      roundRect(ctx,c.x,980,210,145,24,'#ffffff','#e3dccf');
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='600 19px Arial';ctx.fillStyle='#6f756d';ctx.fillText(c.label,c.x+105,1025);
      ctx.font=c.value==='NOT ELIGIBLE'?'700 22px Arial':'700 27px Arial';ctx.fillStyle=c.value==='NOT ELIGIBLE'?'#9f2430':'#103b2d';ctx.fillText(c.value,c.x+105,1080);
    });

    drawCentered(ctx,'December 3, 2026 • 1:00 PM',1195,'600 24px Arial','#103b2d');
    drawCentered(ctx,'Philippine Heart Center',1235,'400 23px Arial','#6f756d');
    drawCentered(ctx,'Present this QR pass for food and raffle processing.',1295,'400 22px Arial','#6f756d');
    if(a.type==='PARENT')drawCentered(ctx,'Parents/Guardians are not eligible for raffle.',1330,'600 20px Arial','#9f2430');

    return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
  }

  async function sharePass(){
    const a=attendee();
    if(!a)return say('Attendee record not found.');
    if(!a.stubReleasedAt)return say('Release the digital stub before sending it.');

    const button=document.getElementById('sharePassBtn');
    const old=button?.textContent;
    if(button){button.disabled=true;button.textContent='Preparing…'}
    try{
      const blob=await buildPassPng(a);
      if(!blob)throw new Error('Could not create pass image');
      const safeName=String(a.fullName||'attendee').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase();
      const file=new File([blob],`christmas-hearts-${safeName||a.code}.png`,{type:'image/png'});
      const shareData={title:'CHRISTmas in Our Hearts Digital Pass',text:`Digital event pass for ${a.fullName} (${a.code}).`,files:[file]};

      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share(shareData);
        say('Pass ready to send.');
      }else{
        const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
        say('Sharing is not available here. The pass image was saved instead.');
      }
    }catch(err){
      if(err?.name!=='AbortError')say('Could not share the pass. Please try again.');
    }finally{
      if(button){button.disabled=false;button.textContent=old||'Share / Send Pass'}
    }
  }

  function ensureShareButton(){
    const actions=document.querySelector('#passDialog .dialog-actions');
    if(!actions)return;
    let button=document.getElementById('sharePassBtn');
    if(!button){
      button=document.createElement('button');
      button.id='sharePassBtn';button.type='button';button.className='primary-btn';button.textContent='Share / Send Pass';
      button.addEventListener('click',sharePass);
      actions.prepend(button);
    }
    const a=attendee();
    button.disabled=!a?.stubReleasedAt;
    button.title=a?.stubReleasedAt?'Send this QR pass to the attendee':'Release the digital stub first';
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
    if(!hint){hint=document.createElement('p');hint.id='passActionHint';grid.insertAdjacentElement('afterend',hint)}
    hint.textContent='Tap DIGITAL STUB, FOOD, or RAFFLE to process the available action.';
    ensureShareButton();
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

// Load the Family QR Wallet directly from a script that is already part of index.html.
// The Family QR opens separate Food and Raffle stubs on the first visit.
(()=>{
  if([...document.scripts].some(s=>(s.getAttribute('src')||'').split('?')[0].endsWith('family-wallet.js')))return;
  const s=document.createElement('script');
  s.src='family-wallet.js?v=24';
  s.async=false;
  document.head.appendChild(s);
})();
