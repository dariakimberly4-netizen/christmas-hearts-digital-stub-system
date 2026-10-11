const CACHE='christmas-hearts-2026-v22';
const CORE=['./','./index.html','./styles.css','./app.js','./search-fix.js','./pass-actions.js','./family-stub.js','./admin-tools.js','./reliability-tools.js','./sync-config.js','./sync-center.js','./demo-enhancements.js','./clear-all-test-data.html','./manifest.webmanifest','./icon.svg'];
const QR='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

function cleanHeaders(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return headers;
}

async function transformResponse(request,response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(type.includes('text/html')){
    let text=await response.text();
    if(!text.includes('search-fix.js'))text=text.replace('</body>','  <script src="search-fix.js" defer></script>\n</body>');
    if(!text.includes('pass-actions.js'))text=text.replace('</body>','  <script src="pass-actions.js" defer></script>\n</body>');
    if(!text.includes('family-stub.js'))text=text.replace('</body>','  <script src="family-stub.js" defer></script>\n</body>');
    if(!text.includes('admin-tools.js'))text=text.replace('</body>','  <script src="admin-tools.js" defer></script>\n</body>');
    if(!text.includes('reliability-tools.js'))text=text.replace('</body>','  <script src="reliability-tools.js" defer></script>\n</body>');
    if(!text.includes('sync-config.js'))text=text.replace('</body>','  <script src="sync-config.js" defer></script>\n</body>');
    if(!text.includes('sync-center.js'))text=text.replace('</body>','  <script src="sync-center.js" defer></script>\n</body>');
    if(!text.includes('demo-enhancements.js'))text=text.replace('</body>','  <script src="demo-enhancements.js" defer></script>\n</body>');
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
      const fresh=await fetch(event.request);
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
