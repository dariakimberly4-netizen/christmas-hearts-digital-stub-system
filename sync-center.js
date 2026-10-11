(()=>{
  const CONFIG=window.CHRISTMAS_HEARTS_SYNC||{};
  const CODE_KEY='christmasHearts2026.syncCode.v1';
  let syncing=false,applyingRemote=false,pollTimer=null,queuedTimer=null,lastSyncAt=null;

  const css=document.createElement('style');
  css.textContent=`
    .live-sync-card .sync-line{display:flex;align-items:center;gap:9px;margin:10px 0}
    .live-sync-dot{width:12px;height:12px;border-radius:50%;background:#9c2b35;box-shadow:0 0 0 4px rgba(156,43,53,.10)}
    .live-sync-dot.on{background:#2e7d55;box-shadow:0 0 0 4px rgba(46,125,85,.12)}
    .live-sync-dot.wait{background:#c58a24;box-shadow:0 0 0 4px rgba(197,138,36,.12)}
    .live-sync-actions{display:grid;gap:8px;margin-top:12px}
    .live-sync-actions input{min-height:48px}
    .live-sync-small{font-size:.78rem;color:#6f756d;line-height:1.45}
  `;
  document.head.appendChild(css);

  function say(m){try{toast(m)}catch{}}
  function configured(){return !!(CONFIG.enabled&&CONFIG.projectUrl&&CONFIG.publishableKey&&CONFIG.functionName&&CONFIG.eventId)}
  function code(){return localStorage.getItem(CODE_KEY)||''}
  function snapshot(){
    try{return {attendees:[...attendees],winners:[...winners],audit:[...audit],settings:{...settings}}}
    catch{return {attendees:[],winners:[],audit:[],settings:{foodCapacity:0}}}
  }
  function normalizeRemoteState(s){
    return {
      attendees:Array.isArray(s?.attendees)?s.attendees:[],
      winners:Array.isArray(s?.winners)?s.winners:[],
      audit:Array.isArray(s?.audit)?s.audit:[],
      settings:s?.settings&&typeof s.settings==='object'?s.settings:{foodCapacity:0}
    };
  }
  function applyState(s){
    const state=normalizeRemoteState(s);
    applyingRemote=true;
    try{
      attendees=state.attendees.map(normalizeAttendee);
      winners=state.winners;
      audit=state.audit;
      settings=state.settings;
      baseSave();
    }finally{applyingRemote=false}
  }

  function endpoint(){return `${String(CONFIG.projectUrl).replace(/\/$/,'')}/functions/v1/${CONFIG.functionName}`}
  async function request(action,state){
    const syncCode=code();
    if(!configured())throw new Error('Live sync backend is not configured yet.');
    if(!syncCode)throw new Error('Enter the event sync code on this device.');
    const res=await fetch(endpoint(),{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'apikey':CONFIG.publishableKey,
        'authorization':`Bearer ${CONFIG.publishableKey}`,
        'x-event-sync-code':syncCode
      },
      body:JSON.stringify({action,eventId:CONFIG.eventId,state})
    });
    let data={};try{data=await res.json()}catch{}
    if(!res.ok)throw new Error(data?.error||`Sync failed (${res.status})`);
    return data;
  }

  function setStatus(kind,text){
    const dot=document.getElementById('liveSyncDot'),label=document.getElementById('liveSyncStatus'),last=document.getElementById('liveSyncLast');
    if(dot){dot.className=`live-sync-dot ${kind==='on'?'on':kind==='wait'?'wait':''}`}
    if(label)label.textContent=text;
    if(last)last.textContent=lastSyncAt?`Last synced ${new Date(lastSyncAt).toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'})}`:'Not synced yet';
  }

  async function syncNow(silent=false){
    if(syncing||!configured()||!code()||!navigator.onLine)return;
    syncing=true;setStatus('wait','Syncing…');
    try{
      const data=await request('merge',snapshot());
      if(data?.state)applyState(data.state);
      lastSyncAt=new Date().toISOString();
      setStatus('on','Live sync connected');
      if(!silent)say('All event devices are synced.');
    }catch(err){
      setStatus('',err?.message||'Live sync unavailable');
      if(!silent)say(err?.message||'Live sync unavailable. Local mode is still working.');
    }finally{syncing=false}
  }

  function scheduleSync(){
    if(applyingRemote||!configured()||!code())return;
    clearTimeout(queuedTimer);queuedTimer=setTimeout(()=>syncNow(true),350);
  }
  function startPolling(){
    clearInterval(pollTimer);
    if(configured()&&code()){
      pollTimer=setInterval(()=>syncNow(true),5000);
      syncNow(true);
    }
  }

  const baseSave=window.save;
  if(typeof baseSave==='function'){
    window.save=function(){const r=baseSave();scheduleSync();return r};
  }

  function installCard(){
    const grid=document.querySelector('#view-admin .admin-grid');
    if(!grid||document.getElementById('liveSyncCard'))return;
    const card=document.createElement('section');
    card.className='admin-card live-sync-card';card.id='liveSyncCard';
    card.innerHTML=`
      <h3>Live Multi-Device Sync</h3>
      <div class="sync-line"><span class="live-sync-dot" id="liveSyncDot"></span><b id="liveSyncStatus">Checking…</b></div>
      <p>Use the same event sync code on Registration, Stub, Food, and Raffle phones so new registrations and claims can be shared between devices.</p>
      <div class="live-sync-actions">
        <input id="eventSyncCode" type="password" inputmode="numeric" autocomplete="off" placeholder="Event sync code" maxlength="12" />
        <button class="primary-btn" type="button" id="connectSyncBtn">Connect This Device</button>
        <button class="ghost-btn" type="button" id="syncNowBtn">Sync Now</button>
        <button class="ghost-btn" type="button" id="disconnectSyncBtn">Disconnect This Device</button>
      </div>
      <p class="live-sync-small" id="liveSyncLast">Not synced yet</p>
      <p class="live-sync-small">Offline operation remains available. When internet returns, this device will try to merge its latest registrations and claims with the shared event data.</p>`;
    const oldSync=[...grid.children].find(x=>/Device Sync Status/i.test(x.textContent||''));
    if(oldSync)grid.insertBefore(card,oldSync);else grid.appendChild(card);
    const input=document.getElementById('eventSyncCode');input.value=code();
    document.getElementById('connectSyncBtn').addEventListener('click',()=>{
      const value=input.value.trim();if(!value)return say('Enter the event sync code.');
      localStorage.setItem(CODE_KEY,value);startPolling();syncNow(false);
    });
    document.getElementById('syncNowBtn').addEventListener('click',()=>syncNow(false));
    document.getElementById('disconnectSyncBtn').addEventListener('click',()=>{
      localStorage.removeItem(CODE_KEY);input.value='';clearInterval(pollTimer);setStatus('','This device is using local-only mode.');say('Live sync disconnected on this device.');
    });
    if(!configured())setStatus('','Live sync backend is ready for connection setup.');
    else if(code())setStatus('wait','Connecting to live sync…');
    else setStatus('','Enter the event sync code to connect this device.');
  }

  window.addEventListener('online',()=>{setStatus('wait','Internet restored — syncing…');syncNow(true)});
  window.addEventListener('offline',()=>setStatus('','Offline — local records are still available.'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncNow(true)});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installCard();startPolling()},{once:true});
  else{installCard();startPolling()}
})();
