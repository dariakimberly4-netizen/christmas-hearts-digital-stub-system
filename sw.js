const CACHE='christmas-hearts-2026-v1';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg'];
const QR='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(CORE);
    try{await cache.add(QR)}catch{}
    self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached)return cached;
    try{
      const response=await fetch(event.request);
      const cache=await caches.open(CACHE);
      cache.put(event.request,response.clone());
      return response;
    }catch{
      if(event.request.mode==='navigate')return caches.match('./index.html');
      throw new Error('Offline and not cached');
    }
  })());
});