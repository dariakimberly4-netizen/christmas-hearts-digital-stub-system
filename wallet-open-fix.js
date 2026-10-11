(()=>{
  function getAttendee(id){
    try{return typeof byId==='function'?byId(id):attendees.find(a=>String(a.id)===String(id))}catch{return null}
  }
  function familyMembers(familyId){
    try{return attendees.filter(a=>a.familyId===familyId)}catch{return []}
  }
  function readyToOpen(familyId){
    const list=familyMembers(familyId);
    return list.length>0&&list.every(a=>!!a.stubReleasedAt);
  }
  function openWalletForParentId(id){
    const p=getAttendee(id);
    if(!p?.familyId||!readyToOpen(p.familyId))return;
    if(typeof window.openFamilyStub==='function'){
      window.openFamilyStub(p.familyId,'food');
      setTimeout(()=>window.refreshFamilyWallet?.(),30);
    }
  }
  function relabel(){
    document.querySelectorAll('[data-family-open-qr]').forEach(b=>{b.textContent='Open Food + Raffle QR'});
    document.querySelectorAll('[data-family-reissue-now]').forEach(b=>{b.textContent='Reissue Food + Raffle QR'});
  }
  document.addEventListener('click',e=>{
    const release=e.target.closest('[data-family-release-now]');
    if(release){
      const id=release.dataset.familyReleaseNow;
      setTimeout(()=>openWalletForParentId(id),120);
      return;
    }
    const open=e.target.closest('[data-family-open-qr]');
    if(open){
      const id=open.dataset.familyOpenQr;
      setTimeout(()=>openWalletForParentId(id),40);
    }
  },true);
  const observer=new MutationObserver(()=>relabel());
  observer.observe(document.body,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',relabel,{once:true});
  else relabel();
})();