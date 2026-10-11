import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-event-sync-code',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
};

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...corsHeaders,'content-type':'application/json'}})}
function str(v:unknown){return typeof v==='string'?v:''}
function time(v:unknown){const n=Date.parse(str(v));return Number.isFinite(n)?n:0}
function newerPair(a:any,b:any,timeField:string,byField:string){
  return time(b?.[timeField])>time(a?.[timeField])?{[timeField]:b?.[timeField]||null,[byField]:b?.[byField]||null}:{[timeField]:a?.[timeField]||null,[byField]:a?.[byField]||null};
}
function mergeAttendee(a:any,b:any){
  const merged={...a,...b};
  Object.assign(merged,newerPair(a,b,'stubReleasedAt','stubReleasedBy'));
  Object.assign(merged,newerPair(a,b,'foodClaimedAt','foodClaimedBy'));
  Object.assign(merged,newerPair(a,b,'raffleClaimedAt','raffleClaimedBy'));
  return merged;
}
function mergeById(oldList:any[],newList:any[],merger:(a:any,b:any)=>any){
  const map=new Map<string,any>();
  for(const x of oldList||[]){if(x?.id)map.set(String(x.id),x)}
  for(const x of newList||[]){if(!x?.id)continue;const id=String(x.id);map.set(id,map.has(id)?merger(map.get(id),x):x)}
  return [...map.values()];
}
function mergeStates(oldState:any,incoming:any){
  const attendees=mergeById(oldState?.attendees||[],incoming?.attendees||[],mergeAttendee);
  const winners=mergeById(oldState?.winners||[],incoming?.winners||[],(a,b)=>time(b?.drawnAt)>time(a?.drawnAt)?b:a);
  const audit=mergeById(oldState?.audit||[],incoming?.audit||[],(a,b)=>time(b?.at)>time(a?.at)?b:a).sort((a,b)=>time(b?.at)-time(a?.at)).slice(0,3000);
  const settings={...(oldState?.settings||{}),...(incoming?.settings||{})};
  return {attendees,winners,audit,settings};
}
async function sha256(value:string){
  const bytes=new TextEncoder().encode(value);
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const body=await req.json();
    const eventId=str(body?.eventId).trim();
    const action=str(body?.action)||'merge';
    const syncCode=req.headers.get('x-event-sync-code')||'';
    if(!eventId||!syncCode)return json({error:'Event ID and sync code are required.'},400);

    const url=Deno.env.get('SUPABASE_URL');
    const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if(!url||!serviceKey)return json({error:'Server configuration is incomplete.'},500);
    const db=createClient(url,serviceKey,{auth:{persistSession:false}});

    const {data:registry,error:registryError}=await db.from('event_sync_registry').select('event_id,sync_code_hash').eq('event_id',eventId).maybeSingle();
    if(registryError)return json({error:'Could not verify event sync access.'},500);
    if(!registry)return json({error:'This event is not enabled for live sync.'},404);
    const suppliedHash=await sha256(syncCode);
    if(suppliedHash!==registry.sync_code_hash)return json({error:'Incorrect event sync code.'},401);

    if(action==='pull'){
      const {data,error}=await db.from('event_sync_state').select('payload,version,updated_at').eq('event_id',eventId).maybeSingle();
      if(error)return json({error:'Could not load shared event data.'},500);
      return json({state:data?.payload||{attendees:[],winners:[],audit:[],settings:{foodCapacity:0}},version:data?.version||0,updatedAt:data?.updated_at||null});
    }
    if(action!=='merge')return json({error:'Unsupported sync action.'},400);

    const incoming=body?.state&&typeof body.state==='object'?body.state:{attendees:[],winners:[],audit:[],settings:{foodCapacity:0}};
    for(let attempt=0;attempt<5;attempt++){
      const {data:current,error:readError}=await db.from('event_sync_state').select('payload,version').eq('event_id',eventId).maybeSingle();
      if(readError)return json({error:'Could not read shared event data.'},500);
      const merged=mergeStates(current?.payload||{},incoming);
      if(!current){
        const {data:inserted,error:insertError}=await db.from('event_sync_state').insert({event_id:eventId,payload:merged,version:1,updated_at:new Date().toISOString()}).select('payload,version,updated_at').single();
        if(!insertError)return json({state:inserted.payload,version:inserted.version,updatedAt:inserted.updated_at});
        if(insertError.code==='23505')continue;
        return json({error:'Could not initialize shared event data.'},500);
      }
      const nextVersion=Number(current.version||0)+1;
      const {data:updated,error:updateError}=await db.from('event_sync_state').update({payload:merged,version:nextVersion,updated_at:new Date().toISOString()}).eq('event_id',eventId).eq('version',current.version).select('payload,version,updated_at');
      if(updateError)return json({error:'Could not update shared event data.'},500);
      if(updated&&updated.length)return json({state:updated[0].payload,version:updated[0].version,updatedAt:updated[0].updated_at});
    }
    return json({error:'The event data changed at the same time. Please sync again.'},409);
  }catch(err){
    console.error(err);
    return json({error:'Live sync request failed.'},500);
  }
});
