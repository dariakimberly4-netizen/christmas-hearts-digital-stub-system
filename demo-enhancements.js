(()=>{
  const style=document.createElement('style');
  style.textContent=`
    #editFamilyDialog{max-width:760px;width:calc(100% - 20px);max-height:calc(100dvh - 20px);overflow:auto}
    #editFamilyDialog .edit-wrap{padding:24px;background:#fffdf8}
    #editFamilyDialog h2{margin:0 0 6px;color:#103b2d}
    #editFamilyDialog h3{margin:18px 0 10px;color:#103b2d}
    .edit-family-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .edit-family-grid label{display:grid;gap:6px;font-weight:700;color:#4b504a}
    .edit-family-grid input,.edit-family-grid select{width:100%}
    .edit-family-grid .full{grid-column:1/-1}
    .edit-child-row{border:1px solid #e3dccf;border-radius:16px;padding:12px;margin:10px 0;background:#fff}
    .edit-child-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}
    .family-claim-summary{margin:0 18px 14px;padding:14px;border:1px solid #d8dfd8;border-radius:16px;background:#edf4ef;color:#103b2d}
    .family-claim-summary h3{margin:0 0 8px;font-size:1rem}
    .family-claim-summary-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .family-claim-summary-grid div{background:#fff;border:1px solid #dfe6df;border-radius:12px;padding:10px;text-align:center}
    .family-claim-summary-grid span{display:block;font-size:.7rem;letter-spacing:.06em;color:#6f756d}
    .family-claim-summary-grid b{display:block;font-size:1.05rem;margin-top:3px}
    .family-claim-remaining{margin:9px 0 0;font-size:.82rem;line-height:1.45;color:#4b504a}
    .demo-mode-badge{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border-radius:999px;background:#f5efe2;border:1px solid #e3d5b8;color:#6a5427;font-size:.72rem;font-weight:800;letter-spacing:.04em;margin-top:6px}
    @media(max-width:600px){.edit-family-grid{grid-template-columns:1fr}.edit-family-grid .full{grid-column:auto}.family-claim-summary-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function say(message){try{toast(message)}catch{alert(message)}}
  function allowedEdit(){try{return ['ADMIN','REGISTRATION'].includes(currentRole())}catch{return false}}
  function allowedReissue(){try{return ['ADMIN','REGISTRATION','STUB'].includes(currentRole())}catch{return false}}
  function familyList(familyId){
    try{return attendees.filter(a=>a.familyId===familyId).sort((a,b)=>a.type===b.type?String(a.fullName).localeCompare(String(b.fullName)):a.type==='PARENT'?-1:1)}catch{return []}
  }
  function attendee(id){try{return byId(id)}catch{return null}}
  function hasActivity(a){return !!(a?.stubReleasedAt||a?.foodClaimedAt||a?.raffleClaimedAt||((typeof winners!=='undefined')&&winners.some(w=>w.id===a?.id)))}

  function ensureEditDialog(){
    if(document.getElementById('editFamilyDialog'))return;
    const d=document.createElement('dialog');
    d.id='editFamilyDialog';
    d.innerHTML=`
      <button class="dialog-close" type="button" id="closeEditFamilyBtn" aria-label="Close">×</button>
      <div class="edit-wrap">
        <p class="eyebrow">Registration Correction</p>
        <h2>Edit Family Registration</h2>
        <p class="tiny-note" id="editFamilyId">—</p>
        <form id="editFamilyForm">
          <h3>Parent / Guardian</h3>
          <div class="edit-family-grid">
            <label>Full Name<input id="editParentName" required /></label>
            <label>Age<input id="editParentAge" type="number" min="18" max="120" required /></label>
            <label>Location / Address<input id="editParentLocation" required /></label>
            <label>Contact Number<input id="editParentContact" required inputmode="tel" /></label>
            <label>Emergency Contact<input id="editEmergencyContact" /></label>
            <label>Relationship<select id="editRelationship" required><option value="Mother">Mother</option><option value="Father">Father</option><option value="Guardian">Guardian</option><option value="Other">Other</option></select></label>
            <label class="full">Special Notes<input id="editNotes" /></label>
          </div>
          <h3>Children</h3>
          <div id="editChildren"></div>
          <button class="ghost-btn" type="button" id="editAddChildBtn">+ Add Another Child</button>
          <div class="form-actions" style="margin-top:18px">
            <button class="primary-btn" type="submit">Save Corrections</button>
            <button class="ghost-btn" type="button" id="cancelEditFamilyBtn">Cancel</button>
          </div>
        </form>
      </div>`;
    document.body.appendChild(d);
    document.getElementById('closeEditFamilyBtn').addEventListener('click',()=>d.close());
    document.getElementById('cancelEditFamilyBtn').addEventListener('click',()=>d.close());
    document.getElementById('editAddChildBtn').addEventListener('click',()=>addChildEditor(null));
    document.getElementById('editFamilyForm').addEventListener('submit',saveFamilyEdit);
    d.addEventListener('click',e=>{
      const b=e.target.closest('[data-remove-edit-child]');
      if(!b)return;
      const row=b.closest('.edit-child-row');
      const id=row?.dataset.childId||'';
      const a=id?attendee(id):null;
      if(a&&hasActivity(a))return say('This child already has event activity. Keep the record and edit the details instead.');
      row?.remove();
      renumberEditChildren();
    });
  }

  function childEditorHtml(a,index){
    return `<div class="edit-child-row" data-child-id="${a?.id||''}">
      <div class="edit-child-head"><b>Child ${index}</b><button class="mini-btn danger-mini" type="button" data-remove-edit-child>Remove</button></div>
      <div class="edit-family-grid">
        <label>Full Name<input data-edit-child-name required value="${esc(a?.fullName||'')}" /></label>
        <label>Age<input data-edit-child-age type="number" min="0" max="17" required value="${a?.age??''}" /></label>
        <label class="full">Sex / Gender<select data-edit-child-gender><option value="">Not specified</option><option value="Female" ${a?.gender==='Female'?'selected':''}>Female</option><option value="Male" ${a?.gender==='Male'?'selected':''}>Male</option><option value="Prefer not to say" ${a?.gender==='Prefer not to say'?'selected':''}>Prefer not to say</option></select></label>
      </div>
    </div>`;
  }

  function addChildEditor(a){
    const root=document.getElementById('editChildren');if(!root)return;
    const count=root.querySelectorAll('.edit-child-row').length;
    if(count>=10)return say('Maximum of 10 children per family.');
    root.insertAdjacentHTML('beforeend',childEditorHtml(a,count+1));
  }
  function renumberEditChildren(){document.querySelectorAll('#editChildren .edit-child-row').forEach((r,i)=>{const b=r.querySelector('.edit-child-head b');if(b)b.textContent=`Child ${i+1}`})}

  let editingFamilyId='';
  function openFamilyEditor(id){
    if(!allowedEdit())return say('Registration Encoder or Administrator access required.');
    const selected=attendee(id);if(!selected)return say('Attendee record not found.');
    const list=familyList(selected.familyId);if(!list.length)return say('Family record not found.');
    const p=list.find(a=>a.type==='PARENT')||list[0],kids=list.filter(a=>a.type==='KID');
    ensureEditDialog();
    editingFamilyId=selected.familyId;
    document.getElementById('editFamilyId').textContent=`Family ID: ${editingFamilyId}`;
    document.getElementById('editParentName').value=p.fullName||'';
    document.getElementById('editParentAge').value=p.age??'';
    document.getElementById('editParentLocation').value=p.location||'';
    document.getElementById('editParentContact').value=p.contact||'';
    document.getElementById('editEmergencyContact').value=p.emergencyContact||'';
    document.getElementById('editRelationship').value=p.relationship||'Guardian';
    document.getElementById('editNotes').value=p.notes||'';
    const root=document.getElementById('editChildren');root.innerHTML='';kids.forEach(addChildEditor);
    if(!kids.length)addChildEditor(null);
    const d=document.getElementById('editFamilyDialog');if(!d.open)d.showModal();
  }
  window.openFamilyEditor=openFamilyEditor;

  function saveFamilyEdit(e){
    e.preventDefault();
    if(!allowedEdit())return say('Registration Encoder or Administrator access required.');
    const list=familyList(editingFamilyId);if(!list.length)return say('Family record not found.');
    const parent=list.find(a=>a.type==='PARENT')||list[0];
    const parentName=document.getElementById('editParentName').value.trim();
    const parentAge=Number(document.getElementById('editParentAge').value);
    const location=document.getElementById('editParentLocation').value.trim();
    const contact=document.getElementById('editParentContact').value.trim();
    const emergency=document.getElementById('editEmergencyContact').value.trim();
    const relationship=document.getElementById('editRelationship').value;
    const notes=document.getElementById('editNotes').value.trim();
    const rows=[...document.querySelectorAll('#editChildren .edit-child-row')];
    const childData=rows.map(r=>({id:r.dataset.childId||'',name:r.querySelector('[data-edit-child-name]').value.trim(),age:Number(r.querySelector('[data-edit-child-age]').value),gender:r.querySelector('[data-edit-child-gender]').value||''}));
    if(!parentName||!location||!contact||!relationship||!Number.isFinite(parentAge)||parentAge<18||parentAge>120)return say('Complete the Parent/Guardian details correctly.');
    if(!childData.length||childData.some(c=>!c.name||!Number.isFinite(c.age)||c.age<0||c.age>17))return say('Keep at least one child and complete each child name and age.');

    const duplicateParent=attendees.find(a=>a.familyId!==editingFamilyId&&a.type==='PARENT'&&norm(a.fullName)===norm(parentName)&&Number(a.age)===parentAge);
    const duplicateChild=childData.find(c=>attendees.some(a=>a.familyId!==editingFamilyId&&a.type==='KID'&&norm(a.fullName)===norm(c.name)&&Number(a.age)===c.age));
    if((duplicateParent||duplicateChild)&&!confirm('A possible duplicate exists in another family. Save these corrections anyway?'))return;

    const keepIds=new Set(childData.filter(c=>c.id).map(c=>c.id));
    const removed=list.filter(a=>a.type==='KID'&&!keepIds.has(a.id));
    if(removed.some(hasActivity))return say('A child you removed already has event activity. Keep that child record and edit it instead.');

    const before=`${parent.fullName}; ${list.filter(a=>a.type==='KID').map(a=>a.fullName).join(', ')}`;
    parent.fullName=parentName;parent.age=parentAge;parent.location=location;parent.contact=contact;parent.emergencyContact=emergency;parent.relationship=relationship;parent.notes=notes;

    const finalKids=[];
    childData.forEach(c=>{
      let k=c.id?attendee(c.id):null;
      if(!k){
        k=normalizeAttendee({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),code:makeCode(),fullName:c.name,location,contact,emergencyContact:emergency,age:c.age,type:'KID',linkedPerson:parentName,familyId:editingFamilyId,relationship,gender:c.gender,photoVideoConsent:parent.photoVideoConsent===true,notes,registeredAt:nowIso(),registeredBy:currentStaff(),registrationSource:'STAFF_CORRECTION',privacyConsent:true});
        attendees.unshift(k);
        try{logAction('CHILD ADDED TO FAMILY',k,`Family ${editingFamilyId}`)}catch{}
      }else{
        k.fullName=c.name;k.age=c.age;k.gender=c.gender;k.location=location;k.contact=contact;k.emergencyContact=emergency;k.relationship=relationship;k.notes=notes;k.linkedPerson=parentName;
      }
      finalKids.push(k);
    });
    if(removed.length){
      const removedIds=new Set(removed.map(a=>a.id));
      attendees=attendees.filter(a=>!removedIds.has(a.id));
      if(typeof winners!=='undefined')winners=winners.filter(w=>!removedIds.has(w.id));
      removed.forEach(a=>{try{logAction('CHILD REMOVED FROM FAMILY',a,`Family ${editingFamilyId}; registration correction`)}catch{}});
    }
    parent.linkedPerson=finalKids.map(k=>k.fullName).join(', ');
    finalKids.forEach(k=>{k.linkedPerson=parentName});
    try{logAction('FAMILY REGISTRATION EDITED',parent,`Family ${editingFamilyId}; before: ${before}; now: ${parentName}; ${finalKids.map(k=>k.fullName).join(', ')}`)}catch{}
    save();
    document.getElementById('editFamilyDialog').close();
    say('Family registration updated. Existing QR codes remain valid.');
  }

  function reissue(id){
    if(!allowedReissue())return say('Registration, Stub Release, or Administrator access required.');
    const a=attendee(id);if(!a)return say('Attendee record not found.');
    if(!a.stubReleasedAt)return say('Release the digital stub first before reissuing it.');
    try{logAction('QR PASS REISSUED',a,`Family ${a.familyId||'—'}; QR reopened for resend`)}catch{}
    try{save()}catch{}
    if(a.familyId&&typeof window.openFamilyStub==='function')window.openFamilyStub(a.familyId,'general');
    else try{openPass(id)}catch{}
    say('QR pass reopened. You can share or save it again.');
  }
  window.reissueDigitalStub=reissue;

  function decorateRecords(){
    const body=document.getElementById('recordsBody');if(!body)return;
    body.querySelectorAll('tr').forEach(row=>{
      const pass=row.querySelector('[data-action="pass"]');if(!pass)return;
      const id=pass.dataset.id;
      if(allowedEdit()&&!row.querySelector('[data-demo-edit]')){
        const b=document.createElement('button');b.type='button';b.className='mini-btn';b.textContent='Edit Family';b.dataset.demoEdit=id;pass.parentElement?.insertBefore(b,pass);
      }
      if(allowedReissue()&&!row.querySelector('[data-demo-reissue]')){
        const b=document.createElement('button');b.type='button';b.className='mini-btn';b.textContent='Reissue QR';b.dataset.demoReissue=id;pass.parentElement?.insertBefore(b,pass.nextSibling);
      }
    });
  }

  try{
    const original=window.renderRecords;
    if(typeof original==='function')window.renderRecords=function(){const out=original.apply(this,arguments);setTimeout(decorateRecords,0);return out};
  }catch{}
  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-demo-edit]');if(edit){e.preventDefault();return openFamilyEditor(edit.dataset.demoEdit)}
    const re=e.target.closest('[data-demo-reissue]');if(re){e.preventDefault();return reissue(re.dataset.demoReissue)}
  });

  function ensureFamilySummary(){
    const d=document.getElementById('familyStubDialog');if(!d)return;
    let box=document.getElementById('familyClaimSummary');
    if(!box){
      box=document.createElement('div');box.id='familyClaimSummary';box.className='family-claim-summary';
      const actions=d.querySelector('.family-actions');d.insertBefore(box,actions||null);
    }
    const familyId=document.getElementById('familyStubCode')?.textContent?.trim();
    const list=familyId?familyList(familyId):[];
    if(!list.length){box.hidden=true;return}
    box.hidden=false;
    const kids=list.filter(a=>a.type==='KID');
    const released=list.filter(a=>a.stubReleasedAt).length;
    const food=list.filter(a=>a.foodClaimedAt).length;
    const raffle=kids.filter(a=>a.raffleClaimedAt).length;
    const foodRemaining=list.filter(a=>!a.foodClaimedAt).map(a=>a.fullName);
    const raffleRemaining=kids.filter(a=>!a.raffleClaimedAt).map(a=>a.fullName);
    box.innerHTML=`<h3>Staff Family Claim Summary</h3><div class="family-claim-summary-grid"><div><span>STUB RELEASED</span><b>${released}/${list.length}</b></div><div><span>FOOD CLAIMED</span><b>${food}/${list.length}</b></div><div><span>KID RAFFLE</span><b>${raffle}/${kids.length}</b></div></div><p class="family-claim-remaining"><b>Food remaining:</b> ${foodRemaining.length?foodRemaining.map(esc).join(', '):'None'}<br><b>Raffle remaining:</b> ${raffleRemaining.length?raffleRemaining.map(esc).join(', '):'None'}</p>`;
    const memberList=document.getElementById('familyMemberList');
    if(memberList&&!memberList.dataset.summaryObserved){
      memberList.dataset.summaryObserved='1';
      new MutationObserver(()=>setTimeout(ensureFamilySummary,0)).observe(memberList,{childList:true,subtree:true,characterData:true});
    }
  }

  const bodyObserver=new MutationObserver(()=>{if(document.getElementById('familyStubDialog'))ensureFamilySummary()});
  bodyObserver.observe(document.body,{childList:true,subtree:false});
  document.addEventListener('click',e=>{if(e.target.closest('[data-family-stub],[data-family-action]'))setTimeout(ensureFamilySummary,20)});

  function addDemoBadge(){
    const top=document.querySelector('.topbar-copy');if(!top||document.getElementById('demoModeBadge'))return;
    const b=document.createElement('span');b.id='demoModeBadge';b.className='demo-mode-badge';
    const update=()=>b.textContent=navigator.onLine?'DEMO MODE • THIS DEVICE ONLY':'DEMO MODE • OFFLINE • THIS DEVICE ONLY';
    update();window.addEventListener('online',update);window.addEventListener('offline',update);top.appendChild(b);
  }

  setTimeout(()=>{decorateRecords();addDemoBadge();ensureFamilySummary()},0);
})();
