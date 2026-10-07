const HP_SUPA='https://iapnejlttsqqefkpmelp.supabase.co';const HP_KEY='sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM';
async function hpRpc(fn,args){try{const r=await fetch(HP_SUPA+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:HP_KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={ok:false,error:text||('Request failed with HTTP '+r.status)}}if(!r.ok)return {ok:false,error:data.message||data.error||('Request failed with HTTP '+r.status),details:data};return data}catch(e){return {ok:false,error:'Could not reach the account server. Check your connection and try again.'}}}
function hpToken(){return localStorage.getItem('hyperpop_token')}
async function hpMigrateSession(){const t=localStorage.getItem('hyperpop_token');if(!t||sessionStorage.getItem('hyperpop_migration_done'))return;try{const r=await fetch(HP_SUPA+'/functions/v1/hyperpop-migrate-session',{method:'POST',headers:{'Content-Type':'application/json','x-hyperpop-session':t}});const d=await r.json().catch(()=>({}));if(r.ok&&d.ok&&d.token){localStorage.setItem('hyperpop_token',d.token);sessionStorage.setItem('hyperpop_migration_done','1');if(d.avatar_migrated)sessionStorage.setItem('hyperpop_avatar_migrated','1')}}catch(e){}}
async function hpMe(){const t=hpToken();if(!t)return null;const x=await hpRpc('hyperpop_me',{p_token:t});return x?.ok?x:null}
async function hpSubmit(game,score){const t=hpToken();if(!t){alert('Log in to submit your score to the leaderboard!');return false}const x=await hpRpc('hyperpop_submit_score',{p_token:t,p_game:game,p_score:score});if(!x.ok)alert(x.error||'Could not submit score.');return !!x.ok}
async function hpSetAvatar(dataUrl){const t=hpToken();if(!t)return {ok:false,error:'Not signed in.'};try{const src=await fetch(dataUrl);if(!src.ok)throw new Error('Could not read the selected image.');const blob=await src.blob();let file=blob;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(blob.type)){const img=new Image();img.src=dataUrl;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('That image format is not supported.'))});const canvas=document.createElement('canvas');const max=512;const scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));canvas.width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));canvas.height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));const out=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));if(!out)throw new Error('Could not convert the image.');file=out}const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':file.type==='image/gif'?'gif':'jpg';const path='avatars/'+crypto.randomUUID()+'.'+ext;const up=await fetch(HP_SUPA+'/storage/v1/object/hyperpop-avatars/'+path,{method:'POST',headers:{apikey:HP_KEY,'Content-Type':file.type||'image/jpeg'},body:file});if(!up.ok){const msg=await up.text().catch(()=> '');return {ok:false,error:'Cloud upload failed ('+up.status+'). '+(msg||'Storage rejected the image.')};}const url=HP_SUPA+'/storage/v1/object/public/hyperpop-avatars/'+path;return await hpRpc('hyperpop_set_avatar',{p_token:t,p_avatar_url:url})}catch(e){return {ok:false,error:e?.message||'Could not upload that picture.'}}}
async function hpLogout(){const t=hpToken();if(t)await hpRpc('hyperpop_logout',{p_token:t});localStorage.removeItem('hyperpop_token');location.reload()}
async function hpAccountBar(){const slot=document.getElementById('account-slot');const nav=document.querySelector('nav');const target=slot||nav;if(!target)return;if(target.querySelector('.accountbar'))return;const bar=document.createElement('div');bar.className='accountbar';const me=await hpMe();if(me){bar.innerHTML='<a class="profile-pill" href="accounts.html">'+(me.avatar_url?'<img class="profile-img" src="'+me.avatar_url+'" alt="">':'<span class="profile-dot">'+me.username.slice(0,1).toUpperCase()+'</span>')+'<span>@'+me.username+'</span></a>'}else{bar.innerHTML='<a class="profile-pill" href="accounts.html">👤 Login / Sign up</a>'}target.appendChild(bar)}document.addEventListener('DOMContentLoaded',async()=>{await hpMigrateSession();hpAccountBar()});

/* Hyper-Pop Command Prompt Easter Egg */
(function(){
  const UNLOCK_KEY='hyperpop-command-prompt-unlocked';
  const unlocked=()=>localStorage.getItem(UNLOCK_KEY)==='1'||Number(localStorage.getItem('hyperpop-dont-danger')||0)>=99;
  function addTerminal(){
    if(!document.body)return;
    let launcher=document.getElementById('hp-terminal-launcher');
    let term=document.getElementById('hp-terminal');
    if(!launcher){
      launcher=document.createElement('button');
      launcher.id='hp-terminal-launcher';
      launcher.type='button';
      launcher.textContent='>_';
      launcher.title='Command Prompt';
      launcher.setAttribute('aria-label','Open Hyper-Pop Command Prompt');
      launcher.style.cssText='position:fixed;left:14px;bottom:14px;z-index:99999;width:42px;height:42px;border:1px solid #ffffff22;border-radius:12px;background:#0b0b12;color:#7df9ff;font:800 18px monospace;box-shadow:0 8px 30px #0008;display:none!important;';
      document.body.appendChild(launcher);
    }
    if(!term){
      term=document.createElement('div');
      term.id='hp-terminal';
      term.style.cssText='position:fixed;left:14px;bottom:14px;z-index:99998;width:min(430px,calc(100vw - 28px));height:min(520px,calc(100vh - 28px));display:none;flex-direction:column;overflow:hidden;border:1px solid #7df9ff55;border-radius:16px;background:#07090d;color:#dffcff;box-shadow:0 20px 70px #000c;font:13px/1.45 monospace;';
      term.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #ffffff15;background:#0d1119"><b>⌘ Hyper-Pop Command Prompt</b><button id="hp-term-close" type="button" style="border:0;background:transparent;color:#aaa;font-size:20px">×</button></div><div id="hp-term-out" style="flex:1;overflow:auto;padding:12px;white-space:pre-wrap"></div><form id="hp-term-form" style="display:flex;border-top:1px solid #ffffff15;background:#0d1119"><span style="padding:10px 0 10px 12px;color:#7df9ff">&gt;</span><input id="hp-term-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="/help" style="min-width:0;flex:1;padding:10px;border:0;outline:0;background:transparent;color:#fff;font:inherit"></form>';
      document.body.appendChild(term);
    }
    const out=document.getElementById('hp-term-out'), input=document.getElementById('hp-term-input');
    const close=()=>{term.style.display='none';launcher.style.setProperty('display','block','important')};
    const open=()=>{if(!unlocked())return;term.style.display='flex';launcher.style.setProperty('display','none','important');setTimeout(()=>input.focus(),0)};
    const sync=()=>{
      const on=unlocked();
      launcher.disabled=!on;
      launcher.style.setProperty('display',on?'block':'none','important');
      if(!on)close();
    };
    if(!launcher.dataset.bound){
      launcher.dataset.bound='1';
      launcher.addEventListener('click',open);
      document.getElementById('hp-term-close').addEventListener('click',close);
      document.getElementById('hp-term-form').addEventListener('submit',e=>{
        e.preventDefault();
        const raw=input.value.trim(); input.value='';
        if(raw==='/help'){out.textContent='COMMANDS\\n/help  Show commands\\n/close  Close\\n/clear  Clear output\\n/status  Show unlock status\\n/score <n>  Set common score values\\n/coins <n>  Set common coin values\\n/js <code>  Run JavaScript';return}
        if(raw==='/close'){close();return}
        if(raw==='/clear'){out.textContent='';return}
        if(raw==='/status'){out.textContent='Unlocked ✓  •  '+location.pathname.split('/').pop();return}
        if(raw.startsWith('/score ')){const n=Number(raw.slice(7));if(Number.isFinite(n)){['score','points','best','high','total'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=String(n)});out.textContent='Score set to '+n+'.'}return}
        if(raw.startsWith('/coins ')){const n=Number(raw.slice(7));if(Number.isFinite(n)){['coins','money','cash','balance'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=String(n)});out.textContent='Coins/money set to '+n+'.'}return}
        if(raw.startsWith('/js ')){try{const result=Function(raw.slice(4))();out.textContent=result===undefined?'Executed.':String(result)}catch(err){out.textContent='ERROR: '+err.message}return}
        out.textContent='Unknown command. Type /help.';
      });
    }
    sync();
  }
  window.HyperPopCommandPrompt={
    unlock:function(){localStorage.setItem(UNLOCK_KEY,'1');addTerminal()},
    disable:function(){localStorage.removeItem(UNLOCK_KEY);addTerminal()},
    isUnlocked:unlocked,
    sync:addTerminal
  };
  function boot(){try{hpAccountBar();addTerminal()}catch(e){console.error('Hyper-Pop shared UI failed:',e)}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:false});else boot();
  window.addEventListener('pageshow',boot);
})();
