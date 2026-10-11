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

  function installButton(){
    const adminView=document.getElementById('view-admin');
    if(!adminView||document.getElementById('clearReleasedStubsBtn'))return;

    const closeout=[...adminView.querySelectorAll('.admin-card')].find(card=>/Event Closeout/i.test(card.textContent||''));
    if(!closeout)return;

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

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installButton,{once:true});
  else installButton();
})();
