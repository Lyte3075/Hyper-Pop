const HP_SUPA='https://iapnejlttsqqefkpmelp.supabase.co';const HP_KEY='sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM';
async function hpRpc(fn,args){try{const r=await fetch(HP_SUPA+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:HP_KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={ok:false,error:text||('Request failed with HTTP '+r.status)}}if(!r.ok)return {ok:false,error:data.message||data.error||('Request failed with HTTP '+r.status),details:data};return data}catch(e){return {ok:false,error:'Could not reach the account server. Check your connection and try again.'}}}
function hpToken(){return localStorage.getItem('hyperpop_token')}
async function hpMigrateSession(){const t=localStorage.getItem('hyperpop_token');if(!t||sessionStorage.getItem('hyperpop_migration_done'))return;try{const r=await fetch(HP_SUPA+'/functions/v1/hyperpop-migrate-session',{method:'POST',headers:{'Content-Type':'application/json','x-hyperpop-session':t}});const d=await r.json().catch(()=>({}));if(r.ok&&d.ok&&d.token){localStorage.setItem('hyperpop_token',d.token);sessionStorage.setItem('hyperpop_migration_done','1');if(d.avatar_migrated)sessionStorage.setItem('hyperpop_avatar_migrated','1')}}catch(e){}}
async function hpMe(){const t=hpToken();if(!t)return null;const x=await hpRpc('hyperpop_me',{p_token:t});return x?.ok?x:null}
async function hpSubmit(game,score){const t=hpToken();if(!t){alert('Log in to submit your score to the leaderboard!');return false}const x=await hpRpc('hyperpop_submit_score',{p_token:t,p_game:game,p_score:score});if(!x.ok)alert(x.error||'Could not submit score.');return !!x.ok}
async function hpSetAvatar(dataUrl){const t=hpToken();if(!t)return {ok:false,error:'Not signed in.'};try{const src=await fetch(dataUrl);if(!src.ok)throw new Error('Could not read the selected image.');const blob=await src.blob();let file=blob;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(blob.type)){const img=new Image();img.src=dataUrl;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('That image format is not supported.'))});const canvas=document.createElement('canvas');const max=512;const scale=Math.min(1,max/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));canvas.width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));canvas.height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));const out=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));if(!out)throw new Error('Could not convert the image.');file=out}const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':file.type==='image/gif'?'gif':'jpg';const path='avatars/'+crypto.randomUUID()+'.'+ext;const up=await fetch(HP_SUPA+'/storage/v1/object/hyperpop-avatars/'+path,{method:'POST',headers:{apikey:HP_KEY,'Content-Type':file.type||'image/jpeg'},body:file});if(!up.ok){const msg=await up.text().catch(()=> '');return {ok:false,error:'Cloud upload failed ('+up.status+'). '+(msg||'Storage rejected the image.')};}const url=HP_SUPA+'/storage/v1/object/public/hyperpop-avatars/'+path;return await hpRpc('hyperpop_set_avatar',{p_token:t,p_avatar_url:url})}catch(e){return {ok:false,error:e?.message||'Could not upload that picture.'}}}
async function hpLogout(){const t=hpToken();if(t)await hpRpc('hyperpop_logout',{p_token:t});localStorage.removeItem('hyperpop_token');location.reload()}
async function hpAccountBar(){const slot=document.getElementById('account-slot');const nav=document.querySelector('nav');const target=slot||nav;if(!target)return;const bar=document.createElement('div');bar.className='accountbar';const me=await hpMe();if(me){bar.innerHTML='<a class="profile-pill" href="accounts.html">'+(me.avatar_url?'<img class="profile-img" src="'+me.avatar_url+'" alt="">':'<span class="profile-dot">'+me.username.slice(0,1).toUpperCase()+'</span>')+'<span>@'+me.username+'</span></a>'}else{bar.innerHTML='<a class="profile-pill" href="accounts.html">👤 Login / Sign up</a>'}target.appendChild(bar)}document.addEventListener('DOMContentLoaded',async()=>{await hpMigrateSession();hpAccountBar()});

/* Hyper-Pop Command Prompt Easter Egg */
(function(){
  const UNLOCK_KEY='hyperpop-command-prompt-unlocked';
  const unlocked=()=>localStorage.getItem(UNLOCK_KEY)==='1'&&(!/dont\.html$/i.test(location.pathname)||Number(localStorage.getItem('hyperpop-dont-danger')||0)>=100);
  function addTerminal(){
    if(document.getElementById('hp-terminal-launcher')){updateTerminalState();return;}
    const style=document.createElement('style');
    style.textContent=`
      #hp-terminal-launcher{position:fixed;left:14px;bottom:14px;z-index:99999;width:42px;height:42px;border:1px solid #ffffff22;border-radius:12px;background:#0b0b12eF;color:#7df9ff;font:800 18px monospace;box-shadow:0 8px 30px #0008;backdrop-filter:blur(12px);transition:.15s}.hp-terminal-locked{opacity:.45;filter:grayscale(.7);cursor:not-allowed}.hp-terminal-locked:hover{opacity:.6}
      #hp-terminal{position:fixed;right:14px;bottom:14px;z-index:99998;width:min(430px,calc(100vw - 28px));height:min(520px,calc(100vh - 28px));display:none;flex-direction:column;overflow:hidden;border:1px solid #7df9ff55;border-radius:16px;background:#07090deF;color:#dffcff;box-shadow:0 20px 70px #000C;font:13px/1.45 "DM Mono",ui-monospace,monospace;backdrop-filter:blur(16px)}
      #hp-terminal.open{display:flex}#hp-term-head{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #ffffff15;background:#0d1119}
      #hp-term-out{flex:1;overflow:auto;padding:12px;white-space:pre-wrap;word-break:break-word}#hp-term-form{display:flex;border-top:1px solid #ffffff15;background:#0d1119}
      #hp-term-form span{padding:10px 0 10px 12px;color:#7df9ff}#hp-term-input{min-width:0;flex:1;padding:10px;border:0;outline:0;background:transparent;color:#fff;font:inherit}
      #hp-term-close{border:0;background:transparent;color:#aaa;padding:2px 6px;font:inherit}.hp-ok{color:#7dffb2}.hp-warn{color:#ffe66d}.hp-err{color:#ff718d}.hp-cmd{color:#7df9ff}
    `;
    document.head.appendChild(style);
    const launcher=document.createElement('button');launcher.id='hp-terminal-launcher';launcher.title='Command Prompt';launcher.textContent='>_';
    const term=document.createElement('div');term.id='hp-terminal';
    term.innerHTML='<div id="hp-term-head"><b>⌘ Hyper-Pop Command Prompt</b><button id="hp-term-close">×</button></div><div id="hp-term-out"></div><form id="hp-term-form"><span>&gt;</span><input id="hp-term-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="/help"></form>';
    document.body.append(launcher,term);
    const out=document.getElementById('hp-term-out'),input=document.getElementById('hp-term-input');
    function updateTerminalState(){
      const l=document.getElementById('hp-terminal-launcher');
      if(!l)return;
      const on=unlocked();
      l.disabled=!on;l.classList.toggle('hp-terminal-locked',!on);l.title=on?'Command Prompt':'Locked • reach 100% danger in Do Not Press';
      if(!on)term.classList.remove('open');
    }
    const print=(text,cls='')=>{const d=document.createElement('div');d.className=cls;d.textContent=text;out.appendChild(d);out.scrollTop=out.scrollHeight};
    const help=`COMMANDS
/help                  Show all commands
/close                 Close the terminal
/clear                 Clear terminal output
/recipes                Search the Hyper-Craft recipe database
/status                Show cheat status and current page
/click [n]             Press the main game control n times
/spam [n]              Rapid-fire the main game control
/win                   Trigger common win/finish controls
/score <n>             Set common score/counter values
/clicks <n>            Set Button Bonanza clicks, then reload
/coins <n>             Set common coins/currency values
/set <key> <value>     Set a localStorage value
/get <key>              Read a localStorage value
/del <key>              Delete a localStorage value
/keys                  List localStorage keys
/theme <name>           Set a page theme when supported
/reset                 Reload the current game
/reload                Reload the page
/js <code>             Run JavaScript on this page

TIP: /js is the universal cheat and can be used for game-specific cheats too.`;
    const clickables=()=>Array.from(document.querySelectorAll('button:not([disabled]),[role="button"]')).filter(x=>x.id!=='hp-terminal-launcher'&&!x.closest('#hp-terminal'));
    function setCommon(n){
      const value=Number(n);if(!Number.isFinite(value))return false;
      const ids=['score','n','count','points','coins','money','clicks','best','high','total'];let touched=0;
      ids.forEach(id=>{const el=document.getElementById(id);if(el){el.textContent=String(value);if('value' in el)el.value=String(value);touched++}});
      ['score','points','coins','money','clicks','hyperpop-score'].forEach(k=>localStorage.setItem('hyperpop-'+k,String(value)));
      return touched;
    }
    async function command(raw){
      const parts=raw.trim().split(/\s+/),cmd=(parts.shift()||'').toLowerCase(),arg=parts.join(' ');if(!cmd)return;
      print('> '+raw,'hp-cmd');
      try{
        if(cmd==='/recipes'){
 const q=arg.trim().toLowerCase();
 print('HYPER-CRAFT RECIPE LOOKUP\\n'+(q?'Searching for: '+arg:'Showing recipe database')+'\\n','hp-ok');
 const parse=src=>{const map=new Map();const re=/['"]([^'"]+\\+[^'"]+)['"]\\s*:\\s*\\[['"]([^'"]*)['"]\\s*,\\s*['"]([^'"]+)['"]\\]/g;let m;while((m=re.exec(src)))map.set(m[1].toLowerCase(),[m[2],m[3]]);return map};
 const show=map=>{const rows=[...map.entries()].filter(([k,v])=>!q||k.includes(q)||v[1].toLowerCase().includes(q)).sort((a,b)=>a[0].localeCompare(b[0])).slice(0,120).map(([k,v])=>k.split('+').join(' + ')+' → '+v[0]+' '+v[1]);print(rows.join('\\n')||'No matching recipes found.','hp-ok');if(rows.length===120)print('Showing first 120 matches. Narrow the search for more.','hp-warn')};
 const map=new Map();
 try{const page=await fetch('hyper-craft.html',{cache:'no-store'});if(page.ok)parse(await page.text()).forEach((v,k)=>map.set(k,v));const extra=await fetch('hyper-craft-recipes.js',{cache:'no-store'});if(extra.ok)parse(await extra.text()).forEach((v,k)=>map.set(k,v))}catch(e){}
 if(map.size)show(map);else print('Could not load the Hyper-Craft recipe database.','hp-err');return;
} if(cmd==='/help'){print(help,'hp-ok');return} if(cmd==='/close'){term.classList.remove('open');return}
        if(cmd==='/clear'){out.textContent='';return}
        if(cmd==='/status'){print('Unlocked ✓  •  '+location.pathname.split('/').pop()+'  •  '+clickables().length+' clickable controls','hp-ok');return}
        if(cmd==='/click'){const n=Math.max(1,Math.min(10000,Number(parts[0])||1)),els=clickables(),target=els.find(x=>/click|press|start|go|roll|flip|tap|play/i.test(x.id+' '+x.textContent))||els[0];if(!target){print('No clickable game control found.','hp-err');return}for(let i=0;i<n;i++)target.click();print('Pressed '+n+'×: '+(target.textContent||target.id),'hp-ok');return}
        if(cmd==='/spam'){const n=Math.max(1,Math.min(5000,Number(parts[0])||100)),els=clickables(),target=els.find(x=>/click|press|start|go|roll|flip|tap|play/i.test(x.id+' '+x.textContent))||els[0];if(!target){print('No clickable game control found.','hp-err');return}let i=0;const timer=setInterval(()=>{target.click();if(++i>=n)clearInterval(timer)},0);print('Spamming '+n+'×: '+(target.textContent||target.id),'hp-ok');return}
        if(cmd==='/win'){let n=0;clickables().forEach(x=>{if(/win|finish|complete|submit|claim|next|done/i.test(x.id+' '+x.textContent)){x.click();n++}});document.dispatchEvent(new CustomEvent('hyperpop-cheat',{detail:{type:'win'}}));print(n?'Triggered '+n+' likely win/finish controls.':'Sent universal win cheat hook.','hp-ok');return}
        if(cmd==='/score'){if(!parts[0]){print('Usage: /score <n>','hp-warn');return}print('Set '+setCommon(parts[0])+' visible score/counter fields. Reload if needed.','hp-ok');return}
        if(cmd==='/clicks'){const n=Number(parts[0]),key='hyperpop-button-bonanza-v2',raw=localStorage.getItem(key);if(!Number.isFinite(n)){print('Usage: /clicks <n>','hp-warn');return}if(raw){const s=JSON.parse(raw);s.n=n;s.total=n;localStorage.setItem(key,JSON.stringify(s));print('Button Bonanza set to '+n+' clicks. Reloading…','hp-ok');setTimeout(()=>location.reload(),250)}else print('Button Bonanza save was not found.','hp-err');return}
        if(cmd==='/coins'){if(!parts[0]){print('Usage: /coins <n>','hp-warn');return}setCommon(parts[0]);print('Common currency fields set to '+parts[0]+'.','hp-ok');return}
        if(cmd==='/set'){const key=parts.shift(),value=parts.join(' ');if(!key){print('Usage: /set <key> <value>','hp-warn');return}localStorage.setItem(key,value);print('Saved '+key+'.','hp-ok');return}
        if(cmd==='/get'){const key=parts[0];if(!key){print('Usage: /get <key>','hp-warn');return}print(key+': '+(localStorage.getItem(key)??'null'));return}
        if(cmd==='/del'){const key=parts[0];if(!key){print('Usage: /del <key>','hp-warn');return}localStorage.removeItem(key);print('Deleted '+key+'.','hp-ok');return}
        if(cmd==='/keys'){print(Object.keys(localStorage).join('\n')||'(none)','hp-ok');return}
        if(cmd==='/theme'){const name=parts[0];if(!name){print('Usage: /theme <name>','hp-warn');return}document.body.dataset.theme=name;localStorage.setItem('hyperpop-theme',name);document.dispatchEvent(new CustomEvent('hyperpop-cheat',{detail:{type:'theme',name}}));print('Theme set to '+name+'.','hp-ok');return}
        if(cmd==='/reset'||cmd==='/reload'){location.reload();return}
        if(cmd==='/js'){if(!arg){print('Usage: /js <code>','hp-warn');return}const result=Function('"use strict";return ('+arg+')')();print(result===undefined?'Executed.':String(result),'hp-ok');return}
        print('Unknown command. Type /help.','hp-err');
      }catch(e){print('ERROR: '+(e?.message||e),'hp-err')}
    }
    launcher.onclick=()=>{if(!unlocked())return;term.classList.add('open');input.focus()};document.getElementById('hp-term-close').onclick=()=>term.classList.remove('open');
    document.getElementById('hp-term-form').onsubmit=e=>{e.preventDefault();const raw=input.value;input.value='';command(raw)};
    updateTerminalState();
    if(unlocked()){print('Command Prompt unlocked.','hp-ok');print('Type /help for a list of commands.');}
  }
  window.HyperPopCommandPrompt={unlock:function(){localStorage.setItem(UNLOCK_KEY,'1');addTerminal();updateTerminalState()},disable:function(){localStorage.removeItem(UNLOCK_KEY);const l=document.getElementById('hp-terminal-launcher');const t=document.getElementById('hp-terminal');if(l){l.disabled=true;l.classList.add('hp-terminal-locked');l.title='Locked • reach 100% danger in Do Not Press'}if(t)t.classList.remove('open')},isUnlocked:unlocked};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addTerminal);else addTerminal();
})();
