(()=>{
  function say(message){
    try{if(typeof toast==='function')toast(message);else alert(message)}catch{alert(message)}
  }

  function isAdmin(){
    try{return typeof currentRole==='function'&&currentRole()==='ADMIN'}catch{return false}
  }

  function clearReleasedStubs(){
    if(!isAdmin())return say('Administrator access required.');
    if(typeof attendees==='undefined'||!Array.isArray(attendees))return say('Attendee records are unavailable.');

    const released=attendees.filter(a=>a.stubReleasedAt);
    if(!released.length)return say('There are no released digital stubs to clear.');

    const ok=confirm(`Clear the RELEASED status for ${released.length} attendee(s)?\n\nRegistrations, food claims, and raffle records will stay unchanged.`);
    if(!ok)return;

    released.forEach(a=>{
      a.stubReleasedAt=null;
      a.stubReleasedBy=null;
    });

    try{if(typeof logAction==='function')logAction('ALL RELEASED STUBS CLEARED',null,`${released.length} released stub(s) reset by Administrator`)}catch{}
    try{if(typeof save==='function')save()}catch{}

    const releaseResults=document.getElementById('releaseResults');
    if(releaseResults){
      releaseResults.className='results-list empty-state';
      releaseResults.textContent='Released stub statuses cleared. Search an attendee to release again.';
    }

    say(`${released.length} released digital stub(s) cleared.`);
  }

  function clearAllTestData(){
    if(!isAdmin())return say('Administrator access required.');

    const attendeeCount=Array.isArray(attendees)?attendees.length:0;
    const winnerCount=Array.isArray(winners)?winners.length:0;
    const ok=confirm(`CLEAR ALL TEST DATA?\n\nThis will permanently remove:\n• ${attendeeCount} attendee registration(s)\n• all Family IDs and QR records\n• all released-stub statuses\n• all food claims\n• all raffle activations and ${winnerCount} winner record(s)\n• the event audit trail\n\nStaff accounts, PINs, and event settings will be kept.`);
    if(!ok)return;

    try{attendees=[]}catch{}
    try{winners=[]}catch{}
    try{audit=[]}catch{}

    try{
      localStorage.setItem('christmasHearts2026.attendees.v1','[]');
      localStorage.setItem('christmasHearts2026.winners.v1','[]');
      localStorage.setItem('christmasHearts2026.audit.v1','[]');
    }catch{}

    try{if(typeof save==='function')save()}catch{}

    ['releaseResults','foodResults','raffleResults'].forEach(id=>{
      const e=document.getElementById(id);
      if(e){e.className='results-list empty-state';e.textContent='No attendee selected.'}
    });
    const success=document.getElementById('registrationSuccess');
    if(success)success.hidden=true;

    say('All test data cleared. Staff accounts and PINs were kept.');
  }

  function installButton(){
    const adminView=document.getElementById('view-admin');
    if(!adminView)return;

    const closeout=[...adminView.querySelectorAll('.admin-card')].find(card=>/Event Closeout/i.test(card.textContent||''));
    if(!closeout)return;

    if(!document.getElementById('clearReleasedStubsBtn')){
      const note=document.createElement('p');
      note.textContent='Reset digital-stub release status without deleting registrations.';

      const button=document.createElement('button');
      button.type='button';
      button.id='clearReleasedStubsBtn';
      button.className='ghost-btn';
      button.textContent='Clear Released Stubs';
      button.style.marginTop='8px';
      button.addEventListener('click',clearReleasedStubs);

      closeout.insertBefore(note,closeout.querySelector('.form-actions'));
      closeout.insertBefore(button,closeout.querySelector('.form-actions'));
    }

    if(!document.getElementById('clearAllTestDataBtn')){
      const warning=document.createElement('p');
      warning.innerHTML='<b>Test reset:</b> removes every attendee, family, food, raffle, winner, and audit record while keeping staff accounts and PINs.';

      const clearAll=document.createElement('button');
      clearAll.type='button';
      clearAll.id='clearAllTestDataBtn';
      clearAll.className='danger-btn';
      clearAll.textContent='Clear All Test Data';
      clearAll.style.marginTop='8px';
      clearAll.addEventListener('click',clearAllTestData);

      closeout.insertBefore(warning,closeout.querySelector('.form-actions'));
      closeout.insertBefore(clearAll,closeout.querySelector('.form-actions'));
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installButton,{once:true});
  else installButton();
})();
