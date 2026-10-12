const CACHE='christmas-hearts-2026-v27';
const CORE=['./','./index.html','./styles.css','./app.js','./search-fix.js','./pass-actions.js','./family-stub.js','./family-wallet.js','./wallet-open-fix.js','./food-claim-enhancements.js','./food-role-lock.js','./admin-tools.js','./reliability-tools.js','./sync-config.js','./sync-center.js','./demo-enhancements.js','./clear-all-test-data.html','./manifest.webmanifest','./icon.svg'];
const QR='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

function cleanHeaders(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return headers;
}

function versionCoreScripts(text){
  const files=['app.js','search-fix.js','pass-actions.js'];
  files.forEach(file=>{
    const escaped=file.replace('.','\\.');
    text=text.replace(new RegExp(`src=["']${escaped}(?:\\?[^"']*)?["']`,'g'),`src="${file}?v=27"`);
  });
  return text;
}

async function transformResponse(request,response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(type.includes('text/html')){
    let text=await response.text();
    text=versionCoreScripts(text);
    const helperBlock=`
  <script src="reliability-tools.js?v=27" defer></script>
  <script src="family-stub.js?v=27" defer></script>
  <script src="family-wallet.js?v=27" defer></script>
  <script src="wallet-open-fix.js?v=27" defer></script>
  <script src="food-claim-enhancements.js?v=27" defer></script>
  <script src="food-role-lock.js?v=27" defer></script>
  <script src="admin-tools.js?v=27" defer></script>
  <script src="demo-enhancements.js?v=27" defer></script>
  <script src="sync-config.js?v=27" defer></script>
  <script src="sync-center.js?v=27" defer></script>`;
    if(!text.includes('food-role-lock.js?v=27'))text=text.replace('</head>',`${helperBlock}\n</head>`);
    return new Response(text,{status:response.status,statusText:response.statusText,headers:cleanHeaders(response)});
  }
  return response;
}

self.addEventListener('install',event=>{event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  for(const path of CORE){
    try{
      const request=new Request(new URL(path,self.location.href),{cache:'reload'});
      const fresh=await fetch(request);
      const transformed=await transformResponse(request,fresh);
      await cache.put(path,transformed.clone());
    }catch{}
  }
  try{await cache.add(QR)}catch{}
  self.skipWaiting();
})())});

self.addEventListener('activate',event=>{event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
})())});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(event.request,{cache:'no-store'});
      const transformed=await transformResponse(event.request,fresh);
      const cache=await caches.open(CACHE);
      cache.put(event.request,transformed.clone());
      return transformed;
    }catch{
      const cached=await caches.match(event.request);
      if(cached)return cached;
      if(event.request.mode==='navigate')return caches.match('./index.html');
      throw new Error('Offline and not cached');
    }
  })());
});
