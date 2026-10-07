/* Hyper-Pop Command Prompt */
(function(){
const KEY='hyperpop-command-prompt-unlocked';
const unlocked=()=>localStorage.getItem(KEY)==='1'||Number(localStorage.getItem('hyperpop-dont-danger')||0)>=99;
const css='#hp-terminal-launcher{position:fixed!important;left:14px!important;bottom:14px!important;z-index:99999!important;width:42px!important;height:42px!important;border:1px solid #ffffff22!important;border-radius:12px!important;background:#0b0b12!important;color:#7df9ff!important;font:800 18px monospace!important;box-shadow:0 8px 30px #0008!important}#hp-terminal{position:fixed!important;left:14px!important;bottom:14px!important;z-index:99998!important;width:min(430px,calc(100vw - 28px))!important;height:min(520px,calc(100vh - 28px))!important;display:none;flex-direction:column;overflow:hidden;border:1px solid #7df9ff55;border-radius:16px;background:#07090d!important;color:#dffcff!important;box-shadow:0 20px 70px #000c!important;font:13px/1.45 monospace!important}#hp-terminal.open{display:flex!important}.hp-ok{color:#7dffb2}.hp-warn{color:#ffe66d}.hp-err{color:#ff718d}.hp-cmd{color:#7df9ff}';
function print(o,t,c){const d=document.createElement('div');d.className=c||'';d.textContent=t;o.appendChild(d);o.scrollTop=o.scrollHeight}
function add(){
if(!document.body)return;
if(!document.getElementById('hp-terminal-style')){const s=document.createElement('style');s.id='hp-terminal-style';s.textContent=css;document.head.appendChild(s)}
let l=document.getElementById('hp-terminal-launcher'),t=document.getElementById('hp-terminal');
if(!l){l=document.createElement('button');l.id='hp-terminal-launcher';l.type='button';l.textContent='>_';l.title='Command Prompt';document.body.appendChild(l)}
if(!t){t=document.createElement('div');t.id='hp-terminal';t.innerHTML='<div style="display:flex;justify-content:space-between;padding:10px 12px;background:#0d1119"><b>⌘ Hyper-Pop Command Prompt</b><button id="hp-term-close" type="button">×</button></div><div id="hp-term-out" style="flex:1;overflow:auto;padding:12px;white-space:pre-wrap"></div><form id="hp-term-form" style="display:flex;background:#0d1119"><span style="padding:10px;color:#7df9ff">&gt;</span><input id="hp-term-input" autocomplete="off" placeholder="/help" style="flex:1;padding:10px;border:0;outline:0;background:transparent;color:#fff;font:inherit"></form>';document.body.appendChild(t)}
const o=document.getElementById('hp-term-out'),i=document.getElementById('hp-term-input');
const close=()=>{t.classList.remove('open');t.style.display='none';l.style.setProperty('display','block','important')};
const open=()=>{if(!unlocked())return;t.classList.add('open');t.style.display='flex';l.style.setProperty('display','none','important');i.focus()};
const controls=()=>Array.from(document.querySelectorAll('button:not([disabled]),[role="button"],[onclick],a[href],canvas')).filter(x=>x.id!=='hp-terminal-launcher'&&!x.closest('#hp-terminal'));
const setCommon=n=>{let touched=0;['score','n','count','points','coins','money','clicks','best','high','total'].forEach(id=>{const e=document.getElementById(id);if(e){e.textContent=String(n);if('value'in e)e.value=String(n);touched++}});return touched};
async function command(raw){
const clean=String(raw).trim();if(!clean)return;const p=clean.split(/\s+/),cmd=p.shift().toLowerCase(),arg=p.join(' ');print(o,'> '+raw,'hp-cmd');
try{
if(cmd==='/help'){print(o,'COMMANDS\n/help  Show all commands\n/close  Close terminal\n/clear  Clear output\n/recipes [search]  Search Hyper-Craft recipes\n/recipe A + B  Look up exact recipe\n/r A + B  Recipe alias\n/status  Show status\n/click [n]  Click main control\n/spam [n]  Rapid-fire main control\n/win  Trigger win hook\n/score <n>  Set score\n/clicks <n>  Set Button Bonanza clicks\n/coins <n>  Set coins\n/money <n>  Set money\n/max  Max common values\n/god  Enable god mode\n/freeze  Freeze supported games\n/unfreeze  Disable freeze\n/rand [min] [max]  Random number\n/inspect  List element IDs\n/set <key> <value>  Set localStorage\n/get <key>  Read localStorage\n/del <key>  Delete localStorage\n/keys  List localStorage keys\n/theme <name>  Set theme\n/reset  Reload game\n/reload  Reload page\n/js <code>  Run JavaScript\n\nType /help any time to see this list.','hp-ok');return}
if(cmd==='/close'){close();return}if(cmd==='/clear'){o.textContent='';return}if(cmd==='/status'){print(o,'Unlocked ✓ • '+location.pathname.split('/').pop(),'hp-ok');return}
if(cmd==='/click'||cmd==='/spam'){const n=Math.max(1,Math.min(cmd==='/spam'?5000:10000,Number(p[0])||1)),a=controls(),x=a.find(e=>/click|press|start|go|roll|flip|tap|play|game|target/i.test(e.id+' '+e.textContent+' '+e.getAttribute('aria-label')))||a[0];if(!x){print(o,'No interactive game control found.','hp-err');return}if(cmd==='/spam'){let z=0;const q=setInterval(()=>{x.click();if(++z>=n)clearInterval(q)},0)}else for(let z=0;z<n;z++)x.click();print(o,'Pressed '+n+'×.','hp-ok');return}
if(cmd==='/win'){window.hyperpopWin=true;localStorage.setItem('hyperpop-win','1');controls().filter(e=>/win|finish|complete|submit|claim|next|done|victory|success/i.test(e.id+' '+e.textContent)).forEach(e=>e.click());document.dispatchEvent(new CustomEvent('hyperpop-cheat',{detail:{type:'win'}}));print(o,'Win hook triggered.','hp-ok');return}
if(cmd==='/score'||cmd==='/coins'||cmd==='/money'){const n=Number(p[0]);if(!Number.isFinite(n)){print(o,'Usage: '+cmd+' <n>','hp-warn');return}setCommon(n);localStorage.setItem('hyperpop-'+cmd.slice(1),String(n));document.dispatchEvent(new CustomEvent('hyperpop-cheat',{detail:{type:cmd.slice(1),value:n}}));print(o,cmd.slice(1)+' set to '+n+'.','hp-ok');return}
if(cmd==='/clicks'){const n=Number(p[0]),r=localStorage.getItem('hyperpop-button-bonanza-v2');if(r&&Number.isFinite(n)){const s=JSON.parse(r);s.n=n;s.total=n;localStorage.setItem('hyperpop-button-bonanza-v2',JSON.stringify(s));location.reload()}return}
if(cmd==='/max'){setCommon(999999999);print(o,'Max values applied.','hp-ok');return}
if(cmd==='/god'){localStorage.setItem('hyperpop-god-mode','1');document.body.dataset.god='1';document.dispatchEvent(new CustomEvent('hyperpop-cheat',{detail:{type:'god'}}));print(o,'God mode enabled.','hp-ok');return}
if(cmd==='/freeze'){window.__hyperpopFreezeTimers=true;localStorage.setItem('hyperpop-freeze','1');print(o,'Freeze enabled.','hp-ok');return}
if(cmd==='/unfreeze'){window.__hyperpopFreezeTimers=false;localStorage.removeItem('hyperpop-freeze');print(o,'Freeze disabled.','hp-ok');return}
if(cmd==='/rand'){let a=Number(p[0]??0),b=Number(p[1]??100);if(a>b)[a,b]=[b,a];print(o,String(Math.floor(Math.random()*(b-a+1))+a),'hp-ok');return}
if(cmd==='/inspect'){print(o,Array.from(document.querySelectorAll('[id]')).map(e=>e.id).filter(x=>!x.startsWith('hp-terminal')).slice(0,150).join('\n')||'(none)','hp-ok');return}
if(cmd==='/set'){const k=p.shift(),v=p.join(' ');if(!k){print(o,'Usage: /set <key> <value>','hp-warn');return}localStorage.setItem(k,v);print(o,'Saved '+k+'.','hp-ok');return}
if(cmd==='/get'){print(o,p[0]+': '+(localStorage.getItem(p[0])??'null'),'hp-ok');return}
if(cmd==='/del'){localStorage.removeItem(p[0]);print(o,'Deleted '+p[0]+'.','hp-ok');return}
if(cmd==='/keys'){print(o,Object.keys(localStorage).join('\n')||'(none)','hp-ok');return}
if(cmd==='/theme'){document.body.dataset.theme=p[0]||'';localStorage.setItem('hyperpop-theme',p[0]||'');print(o,'Theme set to '+(p[0]||'')+'.','hp-ok');return}
if(cmd==='/reset'||cmd==='/reload'){location.reload();return}
if(cmd==='/js'){if(!arg){print(o,'Usage: /js <code>','hp-warn');return}const r=Function('"use strict";'+arg)();print(o,r===undefined?'Executed.':String(r),'hp-ok');return}
print(o,'Unknown command. Type /help.','hp-err');
}catch(e){print(o,'ERROR: '+e.message,'hp-err')}
}
if(!l.dataset.bound){l.dataset.bound='1';l.addEventListener('click',open);document.getElementById('hp-term-close').addEventListener('click',close);document.getElementById('hp-term-form').addEventListener('submit',e=>{e.preventDefault();const raw=i.value;i.value='';command(raw)})}
const on=unlocked();l.disabled=!on;l.style.setProperty('display',on?'block':'none','important');if(!on)close();
if(on&&!l.dataset.greeted){l.dataset.greeted='1';print(o,'Command Prompt unlocked.','hp-ok');print(o,'Type /help for a list of commands.','hp-ok')}
}
window.HyperPopCommandPrompt={unlock:()=>{localStorage.setItem(KEY,'1');add()},disable:()=>{localStorage.removeItem(KEY);add()},isUnlocked:unlocked,sync:add};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',add);else add();window.addEventListener('pageshow',add);
})();