/* Hyper-Pop Sentinel device gate and privacy-limited device profile */
(function(){
  const S='https://iapnejlttsqqefkpmelp.supabase.co',K='sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM',STORE='hyperpop_sentinel_device_v1';
  function dk(){let x=localStorage.getItem(STORE);if(!x||!/^[a-f0-9-]{36}$/i.test(x)){x=crypto.randomUUID();localStorage.setItem(STORE,x)}return x}
  function deviceInfo(){
    const n=navigator,s=screen||{};
    const info={
      user_agent:n.userAgent||'',platform:n.userAgentData?.platform||n.platform||'',
      vendor:n.vendor||'',language:n.language||'',languages:Array.from(n.languages||[]).slice(0,8),
      timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'',
      screen_width:s.width||0,screen_height:s.height||0,screen_color_depth:s.colorDepth||0,
      viewport_width:innerWidth||0,viewport_height:innerHeight||0,pixel_ratio:devicePixelRatio||1,
      hardware_concurrency:n.hardwareConcurrency||null,device_memory:n.deviceMemory||null,
      max_touch_points:n.maxTouchPoints||0,touch_supported:('ontouchstart' in window)||((n.maxTouchPoints||0)>0),
      cookie_enabled:!!n.cookieEnabled,do_not_track:n.doNotTrack||null,
      mobile_hint:!!n.userAgentData?.mobile
    };
    return info;
  }
  let blocked=false,busy=false;
  function lock(b){
    if(blocked)return;blocked=true;
    const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle at 50% 0,#351d2a,#090b14 55%);display:grid;place-items:center;padding:24px;color:#fff;font-family:system-ui';
    const c=document.createElement('section');c.style.cssText='max-width:520px;padding:30px;border:1px solid #ff555566;border-radius:22px;background:#101522;text-align:center';
    const h=document.createElement('h1');h.textContent='DEVICE ACCESS RESTRICTED';h.style.color='#ff6672';
    const p=document.createElement('p');p.textContent='This device or account has been restricted from accessing Hyper-Pop. Reason: '+(b.reason||'Not provided');
    const d=document.createElement('p');d.textContent='Duration: '+(b.duration==='permanent'?'Permanent':b.expires_at?new Date(b.expires_at).toLocaleString():'Temporary');
    const id=document.createElement('small');id.textContent='Reference: '+b.id;id.style.cssText='display:block;color:#8994aa;margin:12px 0;overflow-wrap:anywhere';
    const link=document.createElement('a');link.href='/sentinel-appeal.html?ban='+encodeURIComponent(b.id||'');link.textContent='Submit an appeal';link.style.cssText='display:inline-block;margin-top:12px;padding:12px 18px;border-radius:12px;background:#ff5b68;color:#160b10;text-decoration:none;font-weight:700';
    c.append(h,p,d,id,link);o.append(c);document.body.append(o);document.documentElement.style.overflow='hidden';
  }
  async function check(){
    if(busy||blocked)return;busy=true;
    try{
      const r=await fetch(S+'/functions/v1/hyperpop-sentinel',{method:'POST',headers:{apikey:K,'Content-Type':'application/json'},body:JSON.stringify({
        action:'check',token:localStorage.getItem('hyperpop_token')||'',device_key:dk(),device_info:deviceInfo()
      })});
      const x=await r.json();if(x.banned)lock(x.bans?.[0]||{});
    }catch(e){console.warn('[Sentinel] check unavailable',e)}finally{busy=false}
  }
  window.HyperPopSentinel={deviceKey:dk,check,isBlocked:()=>blocked,deviceInfo};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
  window.addEventListener('hyperpop:navigate',check);window.addEventListener('focus',check);
})();