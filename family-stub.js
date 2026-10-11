(()=>{
  let currentFamilyId='';
  let currentMode='general';

  const style=document.createElement('style');
  style.textContent=`
    #familyStubDialog{max-width:680px;width:calc(100% - 20px);max-height:calc(100dvh - 20px);overflow:auto}
    #familyStubDialog .dialog-close{z-index:100;width:54px;height:54px;display:grid;place-items:center;pointer-events:auto!important;touch-action:manipulation}
    .family-stub-card{padding:28px 22px 20px;background:linear-gradient(180deg,#fffaf0,#fff)}
    .family-stub-card h2{margin:0;color:#103b2d;font-family:Georgia,serif;text-align:center}
    .family-stub-code{text-align:center;font-weight:900;letter-spacing:.12em;color:#9f2430;margin:8px 0}
    .family-qr{width:220px;height:220px;margin:14px auto;display:grid;place-items:center;background:#fff;border:10px solid #fff;border-radius:16px;box-shadow:0 4px 16px rgba(0,0,0,.10)}
    .family-qr img,.family-qr canvas{max-width:100%;height:auto}
    .family-summary{text-align:center;color:#6f756d;margin:6px 0 16px}
    .family-instruction{background:#f5efe2;border:1px solid #e3d5b8;border-radius:14px;padding:12px;margin:12px 0;color:#4b504a;font-size:.88rem;text-align:center}
    .family-member-list{display:grid;gap:10px;margin-top:14px}
    .family-member{border:1px solid #e3dccf;border-radius:16px;padding:13px;background:#fff}
    .family-member-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    .family-member h3{margin:0;color:#22251f;font-size:1rem}
    .family-member small{color:#6f756d}
    .family-member-status{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}
    .family-status{border:1px solid #e3dccf;border-radius:11px;padding:8px;text-align:center;font-size:.72rem}
    .family-status span{display:block;color:#6f756d;font-size:.65rem;letter-spacing:.08em}
    .family-status b{display:block;margin-top:3px;color:#103b2d}
    .family-status.no b{color:#9f2430}
    .family-member-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .family-member-actions button,.family-release-btn{min-height:46px;touch-action:manipulation}
    .family-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;padding:14px 18px 20px;background:#fff}
    @media(max-width:560px){.family-stub-card{padding:24px 14px 18px}.family-member-status{grid-template-columns:1fr 1fr 1fr}.family-actions>*{width:100%}.family-qr{width:200px;height:200px}}
  `;
  document.head.appendChild(style);

  function say(message){try{toast(message)}catch{alert(message)}}
  function role(){try{return currentRole()}catch{return 'UNKNOWN'}}
  function members(familyId){
    try{return attendees.filter(a=>a.familyId===familyId).sort((a,b)=>a.type===b.type?String(a.fullName).localeCompare(String(b.fullName)):a.type==='PARENT'?-1:1)}catch{return []}
  }
  function parentOf(list){return list.find(a=>a.type==='PARENT')||list[0]}
  function activeMode(){
    const id=document.querySelector('.view.active')?.id||'';
    if(id==='view-release')return 'release';
    if(id==='view-food')return 'food';
    if(id==='view-raffle')return 'raffle';
    return 'general';
  }
  function allReleased(list){return list.length>0&&list.every(a=>a.stubReleasedAt)}

  function ensureDialog(){
    if(document.getElementById('familyStubDialog'))return;
    const d=document.createElement('dialog');
    d.id='familyStubDialog';
    d.innerHTML=`
      <button class="dialog-close" id="closeFamilyStubBtn" aria-label="Close">×</button>
      <div class="family-stub-card" id="familyStubCard">
        <p class="eyebrow" style="text-align:center">Official Family Digital Stub</p>
        <h2>CHRISTmas in Our Hearts</h2>
        <p class="family-stub-code" id="familyStubCode">—</p>
        <div class="family-qr" id="familyQr" aria-label="Family QR code"></div>
        <p class="family-summary" id="familySummary">—</p>
        <div class="family-instruction">Save or screenshot this FAMILY QR. One scan opens the whole household. Food and raffle are still claimed individually to prevent duplicates.</div>
        <div id="familyReleaseArea"></div>
        <div class="family-member-list" id="familyMemberList"></div>
      </div>
      <div class="family-actions">
        <button class="primary-btn" type="button" id="shareFamilyStubBtn">Share / Save Family Stub</button>
        <button class="ghost-btn" type="button" id="printFamilyStubBtn">Print Family Stub</button>
      </div>`;
    document.body.appendChild(d);
    document.getElementById('closeFamilyStubBtn').addEventListener('click',()=>d.close());
    document.getElementById('closeFamilyStubBtn').addEventListener('touchend',e=>{e.preventDefault();d.close()},{passive:false});
    document.getElementById('printFamilyStubBtn').addEventListener('click',()=>window.print());
    document.getElementById('shareFamilyStubBtn').addEventListener('click',shareFamilyStub);
    d.addEventListener('click',e=>{
      const b=e.target.closest('[data-family-action]');if(!b)return;
      const action=b.dataset.familyAction,id=b.dataset.id;
      if(action==='release-all')return releaseFamily(currentFamilyId);
      if(action==='food')return familyFood(id);
      if(action==='raffle')return familyRaffle(id);
    });
  }

  function releaseFamily(familyId){
    const list=members(familyId);
    if(!list.length)return say('Family record not found.');
    if(!['ADMIN','STUB'].includes(role()))return say('Digital Stub Release staff access required.');
    const pending=list.filter(a=>!a.stubReleasedAt);
    if(!pending.length)return say('This family stub is already released.');
    const stamp=new Date().toISOString();
    pending.forEach(a=>{
      a.stubReleasedAt=stamp;
      a.stubReleasedBy=currentStaff();
      try{logAction('STUB RELEASED',a,`Family stub ${familyId}`)}catch{}
    });
    save();
    renderFamilyStub();
    say(`Family stub released for ${list.length} attendee(s).`);
  }

  function familyFood(id){
    const a=byId(id);if(!a)return say('Attendee record not found.');
    if(!['ADMIN','FOOD'].includes(role()))return say('Food Claiming staff access required.');
    if(!a.stubReleasedAt)return say('Family stub must be released first.');
    if(a.foodClaimedAt)return say('Food has already been claimed for this attendee.');
    claimFood(id);
    setTimeout(renderFamilyStub,0);
  }

  function familyRaffle(id){
    const a=byId(id);if(!a)return say('Attendee record not found.');
    if(a.type==='PARENT')return say('Parents / Guardians are not eligible for raffle.');
    if(!['ADMIN','RAFFLE'].includes(role()))return say('Raffle Claiming staff access required.');
    if(!a.stubReleasedAt)return say('Family stub must be released first.');
    if(a.raffleClaimedAt)return say('Raffle is already active for this child.');
    claimRaffle(id);
    setTimeout(renderFamilyStub,0);
  }

  function memberHtml(a){
    const stub=a.stubReleasedAt?'RELEASED':'PENDING';
    const food=a.foodClaimedAt?'CLAIMED':(a.stubReleasedAt?'ELIGIBLE':'LOCKED');
    const raffle=a.type==='PARENT'?'NO RAFFLE':(a.raffleClaimedAt?'ACTIVE':(a.stubReleasedAt?'ELIGIBLE':'LOCKED'));
    let action='';
    const mode=currentMode==='general'?(role()==='FOOD'?'food':role()==='RAFFLE'?'raffle':'general'):currentMode;
    if(mode==='food')action=`<button class="primary-btn" type="button" data-family-action="food" data-id="${a.id}" ${a.foodClaimedAt||!a.stubReleasedAt?'disabled':''}>${a.foodClaimedAt?'Food Claimed':(!a.stubReleasedAt?'Food Locked':'Claim Food')}</button>`;
    if(mode==='raffle')action=a.type==='PARENT'?`<button class="ghost-btn" type="button" disabled>No Raffle — Parent</button>`:`<button class="primary-btn" type="button" data-family-action="raffle" data-id="${a.id}" ${a.raffleClaimedAt||!a.stubReleasedAt?'disabled':''}>${a.raffleClaimedAt?'Raffle Active':(!a.stubReleasedAt?'Raffle Locked':'Activate Raffle')}</button>`;
    return `<article class="family-member">
      <div class="family-member-head"><div><h3>${esc(a.fullName)}</h3><small>${a.type==='KID'?'Child':'Parent / Guardian'} • Age ${a.age} • ${esc(a.code)}</small></div><span class="tag ${a.type==='PARENT'?'red':''}">${a.type==='KID'?'KID':'PARENT'}</span></div>
      <div class="family-member-status">
        <div class="family-status"><span>STUB</span><b>${stub}</b></div>
        <div class="family-status"><span>FOOD</span><b>${food}</b></div>
        <div class="family-status ${a.type==='PARENT'?'no':''}"><span>RAFFLE</span><b>${raffle}</b></div>
      </div>
      ${action?`<div class="family-member-actions">${action}</div>`:''}
    </article>`;
  }

  function renderFamilyStub(){
    ensureDialog();
    const list=members(currentFamilyId);
    if(!list.length)return;
    const p=parentOf(list);
    const kids=list.filter(a=>a.type==='KID');
    document.getElementById('familyStubCode').textContent=currentFamilyId;
    document.getElementById('familySummary').textContent=`Parent/Guardian: ${p?.fullName||'—'} • ${list.length} attendee${list.length===1?'':'s'} • ${kids.length} child${kids.length===1?'':'ren'}`;
    const q=document.getElementById('familyQr');q.innerHTML='';
    const payload=`CHRISTMASHEARTS-FAMILY|${currentFamilyId}`;
    if(window.QRCode)new QRCode(q,{text:payload,width:190,height:190,colorDark:'#103b2d',colorLight:'#fff',correctLevel:QRCode.CorrectLevel.M});
    else q.innerHTML=`<b>${esc(currentFamilyId)}</b>`;

    const releaseArea=document.getElementById('familyReleaseArea');
    if(allReleased(list))releaseArea.innerHTML='<div class="family-instruction"><b>FAMILY STUB RELEASED</b><br>All family members are ready for individual food/raffle processing.</div>';
    else if(currentMode==='release'||['ADMIN','STUB'].includes(role()))releaseArea.innerHTML=`<button class="primary-btn family-release-btn" style="width:100%" type="button" data-family-action="release-all">Release Family Stub for All ${list.length} Members</button>`;
    else releaseArea.innerHTML='<div class="family-instruction">Family stub is not fully released yet.</div>';

    document.getElementById('familyMemberList').innerHTML=list.map(memberHtml).join('');
  }

  function openFamilyStub(familyId,mode='general'){
    const list=members(familyId);
    if(!list.length)return say('Family record not found.');
    currentFamilyId=familyId;
    currentMode=mode||'general';
    ensureDialog();
    renderFamilyStub();
    const d=document.getElementById('familyStubDialog');
    if(!d.open)d.showModal();
  }
  window.openFamilyStub=openFamilyStub;

  function decorateFamilyButtons(targetId,mode){
    const root=document.getElementById(targetId);if(!root)return;
    root.querySelectorAll('.result-card').forEach(card=>{
      const pass=card.querySelector('[data-action="pass"]');
      if(!pass)return;
      const a=byId(pass.dataset.id);if(!a?.familyId)return;
      if(card.querySelector('[data-family-stub]'))return;
      const b=document.createElement('button');
      b.type='button';b.className='ghost-btn';b.textContent='Family Stub';
      b.dataset.familyStub=a.familyId;b.dataset.familyMode=mode||'general';
      pass.parentElement?.insertBefore(b,pass);
    });
  }

  const originalRenderSearchResults=window.renderSearchResults;
  if(typeof originalRenderSearchResults==='function'){
    window.renderSearchResults=function(targetId,q,mode){
      const out=originalRenderSearchResults(targetId,q,mode);
      setTimeout(()=>decorateFamilyButtons(targetId,mode),0);
      return out;
    };
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-family-stub]');
    if(b){e.preventDefault();openFamilyStub(b.dataset.familyStub,b.dataset.familyMode||activeMode())}
  });

  const originalHandleScan=window.handleScan;
  if(typeof originalHandleScan==='function'){
    window.handleScan=function(code){
      const raw=String(code||'').trim();
      const match=raw.match(/^CHRISTMASHEARTS-FAMILY\|(FAM-[A-Z0-9-]+)$/i);
      if(match){
        const familyId=match[1].toUpperCase();
        const mode=activeMode();
        try{closeScanner()}catch{}
        if(['release','food','raffle'].includes(mode))try{showView(mode)}catch{}
        openFamilyStub(familyId,mode);
        return;
      }
      return originalHandleScan(code);
    };
  }

  function addRegistrationFamilyButton(){
    const success=document.getElementById('registrationSuccess');
    const existing=document.getElementById('openFamilyStubAfterRegistration');
    if(!success||existing)return;
    const b=document.createElement('button');
    b.id='openFamilyStubAfterRegistration';b.type='button';b.className='primary-btn';b.textContent='Open Family Stub';
    b.addEventListener('click',()=>{
      const familyId=document.getElementById('successFamilyId')?.textContent?.trim();
      if(familyId&&familyId!=='—')openFamilyStub(familyId,'release');
    });
    const registerAnother=document.getElementById('registerAnotherBtn');
    registerAnother?.parentElement?.insertBefore(b,registerAnother);
  }

  function roundRect(ctx,x,y,w,h,r,fill,stroke){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
  async function buildFamilyPng(){
    const list=members(currentFamilyId);if(!list.length)return null;
    const p=parentOf(list),kids=list.filter(a=>a.type==='KID');
    const height=Math.max(1250,850+list.length*92);
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=height;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,900,height);roundRect(ctx,35,35,830,height-70,38,'#fffdf8','#e3dccf');
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#103b2d';ctx.font='700 28px Arial';ctx.fillText('OFFICIAL FAMILY DIGITAL STUB',450,100);ctx.font='700 44px Georgia';ctx.fillText('CHRISTmas in Our Hearts',450,160);ctx.fillStyle='#9f2430';ctx.font='800 34px Arial';ctx.fillText(currentFamilyId,450,220);
    const qr=document.querySelector('#familyQr canvas, #familyQr img');if(qr){ctx.fillStyle='#fff';ctx.fillRect(245,270,410,410);try{ctx.drawImage(qr,270,295,360,360)}catch{}}
    ctx.fillStyle='#22251f';ctx.font='700 30px Arial';ctx.fillText(`Parent/Guardian: ${p?.fullName||'—'}`,450,735);ctx.fillStyle='#6f756d';ctx.font='400 22px Arial';ctx.fillText(`${list.length} attendees • ${kids.length} children`,450,775);
    let y=840;ctx.textAlign='left';list.forEach(a=>{roundRect(ctx,90,y-32,720,70,14,'#ffffff','#e3dccf');ctx.fillStyle='#22251f';ctx.font='700 22px Arial';ctx.fillText(a.fullName,115,y);ctx.textAlign='right';ctx.fillStyle='#103b2d';ctx.font='600 18px Arial';ctx.fillText(`${a.type==='KID'?'CHILD':'PARENT'} • Food ${a.foodClaimedAt?'CLAIMED':'ELIGIBLE'} • Raffle ${a.type==='PARENT'?'NO':a.raffleClaimedAt?'ACTIVE':'ELIGIBLE'}`,785,y);ctx.textAlign='left';y+=88});
    ctx.textAlign='center';ctx.fillStyle='#103b2d';ctx.font='600 22px Arial';ctx.fillText('December 3, 2026 • 1:00 PM • Philippine Heart Center',450,height-125);ctx.fillStyle='#6f756d';ctx.font='400 20px Arial';ctx.fillText('Save this Family QR. Claims are recorded individually.',450,height-80);
    return await new Promise(resolve=>canvas.toBlob(resolve,'image/png',1));
  }

  async function shareFamilyStub(){
    if(!currentFamilyId)return;
    const button=document.getElementById('shareFamilyStubBtn'),old=button?.textContent;
    if(button){button.disabled=true;button.textContent='Preparing…'}
    try{
      const blob=await buildFamilyPng();if(!blob)throw 0;
      const file=new File([blob],`christmas-hearts-family-${currentFamilyId.toLowerCase()}.png`,{type:'image/png'});
      if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:'CHRISTmas in Our Hearts Family Stub',text:`Family Stub ${currentFamilyId}`,files:[file]})}
      else{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);say('Family Stub image saved.')}
    }catch(err){if(err?.name!=='AbortError')say('Could not share the Family Stub. Please try again.')}
    finally{if(button){button.disabled=false;button.textContent=old||'Share / Save Family Stub'}}
  }

  addRegistrationFamilyButton();
})();
