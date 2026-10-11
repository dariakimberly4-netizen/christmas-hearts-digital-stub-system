const STORAGE_KEY='christmasHearts2026.attendees.v1';
const WINNERS_KEY='christmasHearts2026.winners.v1';
let attendees=loadJson(STORAGE_KEY,[]);
let winners=loadJson(WINNERS_KEY,[]);
let deferredInstallPrompt=null;
let scanStream=null;
let scanFrame=null;
let currentScanTarget=null;

const $=(id)=>document.getElementById(id);
const $$=(selector)=>[...document.querySelectorAll(selector)];

function loadJson(key,fallback){
  try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}
}
function save(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(attendees));
  localStorage.setItem(WINNERS_KEY,JSON.stringify(winners));
  updateStats();
  renderRecords();
}
function nowIso(){return new Date().toISOString()}
function humanTime(iso){if(!iso)return 'Not claimed';return new Date(iso).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}
function normalize(s){return String(s||'').trim().toLowerCase()}
function makeCode(){
  const date='1203';
  let code='';
  do{code=`CH-${date}-${Math.floor(1000+Math.random()*9000)}`}while(attendees.some(a=>a.code===code));
  return code;
}
function toast(message){
  const el=$('toast');el.textContent=message;el.classList.add('show');
  clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('show'),2800);
}
function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function typeLabel(type){return type==='KID'?'Kid':'Parent / Guardian'}
function raffleStatus(a){
  if(a.type==='PARENT')return 'Not eligible';
  return a.raffleClaimedAt?'Activated':'Eligible';
}
function searchAttendees(query,filter='ALL'){
  const q=normalize(query);
  return attendees.filter(a=>{
    const matchesFilter=filter==='ALL'||a.type===filter;
    if(!matchesFilter)return false;
    if(!q)return true;
    return [a.code,a.fullName,a.location,a.contact,a.linkedPerson].some(v=>normalize(v).includes(q));
  });
}
function updateStats(){
  $('statRegistered').textContent=attendees.length;
  $('statKids').textContent=attendees.filter(a=>a.type==='KID').length;
  $('statParents').textContent=attendees.filter(a=>a.type==='PARENT').length;
  $('statFood').textContent=attendees.filter(a=>a.foodClaimedAt).length;
  $('statRaffle').textContent=attendees.filter(a=>a.type==='KID'&&a.raffleClaimedAt).length;
}

function showView(name){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));
  $$('.module-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  if(name==='records')renderRecords();
}
$$('.module-btn').forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view)));

$('registrationForm').addEventListener('submit',(e)=>{
  e.preventDefault();
  const form=new FormData(e.currentTarget);
  const fullName=String(form.get('fullName')||'').trim();
  const location=String(form.get('location')||'').trim();
  const contact=String(form.get('contact')||'').trim();
  const age=Number(form.get('age'));
  const type=String(form.get('attendeeType')||'KID');
  const linkedPerson=String(form.get('linkedPerson')||'').trim();
  if(!fullName||!location||!contact||!Number.isFinite(age)){toast('Please complete all required fields.');return}
  const duplicate=attendees.find(a=>normalize(a.fullName)===normalize(fullName)&&normalize(a.contact)===normalize(contact));
  if(duplicate&&!confirm(`${duplicate.fullName} with the same contact number is already registered. Register another record anyway?`))return;
  const attendee={id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,code:makeCode(),fullName,location,contact,age,type,linkedPerson,registeredAt:nowIso(),foodClaimedAt:null,raffleClaimedAt:null};
  attendees.unshift(attendee);save();e.currentTarget.reset();
  const kidRadio=document.querySelector('input[name="attendeeType"][value="KID"]');if(kidRadio)kidRadio.checked=true;
  openPass(attendee.id);toast(`${fullName} registered successfully.`);
});

function resultCard(a,mode){
  const foodTag=a.foodClaimedAt?`Food claimed ${humanTime(a.foodClaimedAt)}`:'Food eligible';
  const raffleTag=a.type==='PARENT'?'Raffle not eligible':(a.raffleClaimedAt?'Raffle activated':'Raffle eligible');
  let actions=`<button class="ghost-btn" data-action="pass" data-id="${a.id}">Open Pass</button>`;
  if(mode==='food')actions=`<button class="primary-btn claim-btn" data-action="claim-food" data-id="${a.id}" ${a.foodClaimedAt?'disabled':''}>${a.foodClaimedAt?'Already Claimed':'Claim Food'}</button><button class="ghost-btn" data-action="pass" data-id="${a.id}">Pass</button>`;
  if(mode==='raffle')actions=a.type==='PARENT'
    ?`<button class="primary-btn claim-btn" disabled>Parent — No Raffle</button><button class="ghost-btn" data-action="pass" data-id="${a.id}">Pass</button>`
    :`<button class="primary-btn claim-btn" data-action="claim-raffle" data-id="${a.id}" ${a.raffleClaimedAt?'disabled':''}>${a.raffleClaimedAt?'Entry Activated':'Activate Raffle Entry'}</button><button class="ghost-btn" data-action="pass" data-id="${a.id}">Pass</button>`;
  return `<article class="result-card"><div><h3>${escapeHtml(a.fullName)} <span class="tag ${a.type==='PARENT'?'red':''}">${typeLabel(a.type)}</span></h3><p>${escapeHtml(a.code)} • Age ${a.age} • ${escapeHtml(a.location)}</p><p>${escapeHtml(a.contact)}${a.linkedPerson?` • Linked: ${escapeHtml(a.linkedPerson)}`:''}</p><div class="tag-row"><span class="tag">${escapeHtml(foodTag)}</span><span class="tag ${a.type==='PARENT'?'red':'gold'}">${escapeHtml(raffleTag)}</span></div></div><div class="result-actions">${actions}</div></article>`;
}
function renderSearchResults(targetId,query,mode){
  const list=searchAttendees(query);
  const target=$(targetId);
  target.classList.remove('empty-state');
  if(!list.length){target.classList.add('empty-state');target.textContent='No matching attendee found.';return}
  target.innerHTML=list.slice(0,20).map(a=>resultCard(a,mode)).join('');
}
function bindSearch(inputId,buttonId,targetId,mode){
  const run=()=>renderSearchResults(targetId,$(inputId).value,mode);
  $(buttonId).addEventListener('click',run);
  $(inputId).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run()}});
}
bindSearch('releaseSearch','releaseSearchBtn','releaseResults','release');
bindSearch('foodSearch','foodSearchBtn','foodResults','food');
bindSearch('raffleSearch','raffleSearchBtn','raffleResults','raffle');

function attendeeById(id){return attendees.find(a=>a.id===id)}
function attendeeByCode(code){
  const cleaned=String(code||'').trim().replace(/^CHRISTMASHEARTS\|/i,'');
  return attendees.find(a=>normalize(a.code)===normalize(cleaned));
}
function claimFood(id){
  const a=attendeeById(id);if(!a)return;
  if(a.foodClaimedAt){toast(`Food already claimed at ${humanTime(a.foodClaimedAt)}.`);return}
  a.foodClaimedAt=nowIso();save();toast(`Food claimed for ${a.fullName}.`);refreshCurrentResults(a);
}
function claimRaffle(id){
  const a=attendeeById(id);if(!a)return;
  if(a.type==='PARENT'){toast('Parents / Guardians are not eligible for raffle.');return}
  if(a.raffleClaimedAt){toast(`Raffle entry already activated at ${humanTime(a.raffleClaimedAt)}.`);return}
  a.raffleClaimedAt=nowIso();save();toast(`Raffle entry activated for ${a.fullName}.`);refreshCurrentResults(a);
}
function refreshCurrentResults(a){
  if($('view-food').classList.contains('active'))renderSearchResults('foodResults',a.code,'food');
  if($('view-raffle').classList.contains('active'))renderSearchResults('raffleResults',a.code,'raffle');
  if($('view-release').classList.contains('active'))renderSearchResults('releaseResults',a.code,'release');
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-action]');if(!btn)return;
  const {action,id}=btn.dataset;
  if(action==='pass')openPass(id);
  if(action==='claim-food')claimFood(id);
  if(action==='claim-raffle')claimRaffle(id);
  if(action==='delete'){const a=attendeeById(id);if(a&&confirm(`Delete ${a.fullName}? This cannot be undone.`)){attendees=attendees.filter(x=>x.id!==id);winners=winners.filter(w=>w.id!==id);save();toast('Record deleted.')}}
});

function openPass(id){
  const a=attendeeById(id);if(!a)return;
  $('passCode').textContent=a.code;
  $('passName').textContent=a.fullName;
  $('passDetails').textContent=`${typeLabel(a.type)} • Age ${a.age} • ${a.location}`;
  $('passFood').textContent=a.foodClaimedAt?'CLAIMED':'ELIGIBLE';
  $('passRaffle').textContent=a.type==='PARENT'?'NOT ELIGIBLE':(a.raffleClaimedAt?'ACTIVE':'ELIGIBLE');
  const qr=$('qrCode');qr.innerHTML='';
  const payload=`CHRISTMASHEARTS|${a.code}`;
  if(window.QRCode){new QRCode(qr,{text:payload,width:190,height:190,colorDark:'#103b2d',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});}
  else{qr.innerHTML=`<div style="font-weight:900;text-align:center;padding:20px">${escapeHtml(a.code)}<br><small>QR unavailable offline until first online load.</small></div>`}
  $('passDialog').showModal();
}
$('closePassBtn').addEventListener('click',()=>$('passDialog').close());
$('printPassBtn').addEventListener('click',()=>window.print());

function renderRecords(){
  const q=$('recordsSearch')?.value||'';const filter=$('recordsFilter')?.value||'ALL';
  const list=searchAttendees(q,filter);
  $('recordsBody').innerHTML=list.length?list.map(a=>`<tr><td><b>${escapeHtml(a.code)}</b></td><td>${escapeHtml(a.fullName)}</td><td>${typeLabel(a.type)}</td><td>${a.age}</td><td>${escapeHtml(a.location)}</td><td>${escapeHtml(a.contact)}</td><td>${a.foodClaimedAt?'✅ Claimed':'Eligible'}</td><td>${a.type==='PARENT'?'🚫 No raffle':(a.raffleClaimedAt?'✅ Active':'Eligible')}</td><td><button class="mini-btn" data-action="pass" data-id="${a.id}">Pass</button><button class="mini-btn" data-action="delete" data-id="${a.id}">Delete</button></td></tr>`).join(''):`<tr><td colspan="9" style="text-align:center;color:#777;padding:28px">No records found.</td></tr>`;
}
$('recordsSearch').addEventListener('input',renderRecords);
$('recordsFilter').addEventListener('change',renderRecords);

function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
$('exportCsvBtn').addEventListener('click',()=>{
  const headers=['Code','Full Name','Type','Age','Location','Contact Number','Linked Person','Registered At','Food Claimed At','Raffle Status','Raffle Claimed At'];
  const rows=attendees.map(a=>[a.code,a.fullName,typeLabel(a.type),a.age,a.location,a.contact,a.linkedPerson,humanTime(a.registeredAt),humanTime(a.foodClaimedAt),raffleStatus(a),humanTime(a.raffleClaimedAt)]);
  const csv=[headers,...rows].map(r=>r.map(csvEscape).join(',')).join('\n');
  downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'christmas-hearts-2026-attendees.csv');toast('CSV exported.');
});
$('backupBtn').addEventListener('click',()=>{
  const payload={event:'CHRISTmas in Our Hearts 2026',exportedAt:nowIso(),attendees,winners};
  downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),'christmas-hearts-2026-backup.json');toast('Backup downloaded.');
});
$('restoreInput').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.attendees))throw new Error('Invalid backup');
    if(!confirm(`Restore ${data.attendees.length} attendee records? This will replace the current data on this device.`))return;
    attendees=data.attendees;winners=Array.isArray(data.winners)?data.winners:[];save();toast('Backup restored.');
  }catch{toast('Could not restore this file.');}
  e.target.value='';
});
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

$('drawBtn').addEventListener('click',()=>{
  const eligible=attendees.filter(a=>a.type==='KID'&&a.raffleClaimedAt&&!winners.some(w=>w.id===a.id));
  if(!eligible.length){
    const all=attendees.filter(a=>a.type==='KID'&&a.raffleClaimedAt);
    $('drawName').textContent=all.length?'All entries drawn':'No active entries';
    $('drawMeta').textContent=all.length?'Every activated kid entry has already won.':'Activate at least one kid raffle entry first.';return;
  }
  $('drawBtn').disabled=true;let ticks=0;
  const spin=setInterval(()=>{
    const temp=eligible[Math.floor(Math.random()*eligible.length)];$('drawName').textContent=temp.fullName;ticks++;
    if(ticks>=18){clearInterval(spin);const winner=eligible[Math.floor(Math.random()*eligible.length)];winners.push({id:winner.id,code:winner.code,name:winner.fullName,drawnAt:nowIso()});save();$('drawName').textContent=winner.fullName;$('drawMeta').textContent=`${winner.code} • ${winner.location}`;$('drawBtn').disabled=false;toast('Winner recorded.');}
  },80);
});

$$('[data-scan-target]').forEach(btn=>btn.addEventListener('click',()=>openScanner(btn.dataset.scanTarget)));
async function openScanner(target){
  currentScanTarget=target;$('scannerTitle').textContent=target==='food'?'Scan for Food Claim':'Scan for Raffle Claim';$('scannerStatus').textContent='Starting camera…';$('manualScanCode').value='';$('scannerDialog').showModal();
  if(!('BarcodeDetector' in window)){ $('scannerStatus').textContent='Camera QR detection is not supported in this browser. Enter the attendee code below.';return; }
  try{
    const formats=await BarcodeDetector.getSupportedFormats();if(!formats.includes('qr_code'))throw new Error('QR not supported');
    const detector=new BarcodeDetector({formats:['qr_code']});
    scanStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    $('scannerVideo').srcObject=scanStream;await $('scannerVideo').play();$('scannerStatus').textContent='Point the camera at the attendee QR code.';
    const detect=async()=>{
      if(!$('scannerDialog').open)return;
      try{const codes=await detector.detect($('scannerVideo'));if(codes.length){handleScannedValue(codes[0].rawValue);return}}catch{}
      scanFrame=requestAnimationFrame(detect);
    };detect();
  }catch(err){$('scannerStatus').textContent='Camera unavailable. Enter the attendee code below.';}
}
function closeScanner(){
  if(scanFrame)cancelAnimationFrame(scanFrame);scanFrame=null;
  if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}
  if($('scannerDialog').open)$('scannerDialog').close();
}
$('closeScannerBtn').addEventListener('click',closeScanner);
$('scannerDialog').addEventListener('close',()=>{if(scanStream){scanStream.getTracks().forEach(t=>t.stop());scanStream=null}});
$('manualScanBtn').addEventListener('click',()=>handleScannedValue($('manualScanCode').value));
$('manualScanCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();handleScannedValue(e.currentTarget.value)}});
function handleScannedValue(value){
  const a=attendeeByCode(value);if(!a){$('scannerStatus').textContent='Attendee code not found. Try again.';return}
  closeScanner();
  if(currentScanTarget==='food'){showView('food');$('foodSearch').value=a.code;renderSearchResults('foodResults',a.code,'food')}
  else{showView('raffle');$('raffleSearch').value=a.code;renderSearchResults('raffleResults',a.code,'raffle')}
  if(currentScanTarget==='food'&&!a.foodClaimedAt)toast(`Ready to claim food for ${a.fullName}.`);
  if(currentScanTarget==='raffle'&&a.type==='PARENT')toast('Parent / Guardian — not eligible for raffle.');
}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;$('installBtn').hidden=false});
$('installBtn').addEventListener('click',async()=>{if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$('installBtn').hidden=true});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}

updateStats();renderRecords();