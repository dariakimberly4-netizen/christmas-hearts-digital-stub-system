const CACHE='christmas-hearts-2026-v8';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon.svg'];
const QR='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

function cleanHeaders(response){
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return headers;
}

async function transformResponse(request,response){
  if(!response||!response.ok)return response;
  const url=new URL(request.url);
  const type=response.headers.get('content-type')||'';

  if(type.includes('text/html')){
    let text=await response.text();
    text=text.replace(/\s*<label>Child Location \/ Address<input id="childLocation" name="childLocation" required placeholder="City \/ Barangay \/ Address" \/><\/label>\s*/,'\n');
    text=text.replace(/\s*<label>Child Contact Number<input id="childContact" name="childContact" required inputmode="tel" placeholder="Use parent number if same" \/><\/label>\s*/,'\n');
    return new Response(text,{status:response.status,statusText:response.statusText,headers:cleanHeaders(response)});
  }

  if(url.pathname.endsWith('/app.js')){
    let text=await response.text();
    text=text.replace("  const childLocation=String(f.get('childLocation')||'').trim();","  const childLocation=parentLocation;");
    text=text.replace("  const childContact=String(f.get('childContact')||'').trim();","  const childContact=parentContact;");
    text=text.replace("||!childName||!childLocation||!childContact||!Number.isFinite(parentAge)","||!childName||!Number.isFinite(parentAge)");
    return new Response(text,{status:response.status,statusText:response.statusText,headers:cleanHeaders(response)});
  }

  return response;
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
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