/* Home-only Hyper-Pop navigation */
(function(){
 function isHome(){
  const p=location.pathname.replace(/\\/+$/,'');
  return p===''||p==='/'||p.endsWith('/index.html');
 }
 function removeSidebar(){
  ['hp-side-toggle','hp-site-sidebar','hp-side-scrim'].forEach(id=>document.getElementById(id)?.remove());
  document.getElementById('hp-sidebar-style')?.remove();
 }
 function initSidebar(){
  if(!isHome()){removeSidebar();return}
  if(document.getElementById('hp-site-sidebar'))return;
  const css=document.createElement('style');css.id='hp-sidebar-style';css.textContent=`
   #hp-side-toggle{position:fixed;z-index:2147483000;left:max(12px,env(safe-area-inset-left));top:max(12px,env(safe-area-inset-top));width:48px;height:48px;display:grid;place-items:center;padding:8px;border:1px solid #ffffff30;border-radius:15px;background:#11111ff2;cursor:pointer;backdrop-filter:blur(14px);box-shadow:0 8px 28px #0006;transition:transform .16s,border-color .16s}
   #hp-side-toggle:hover{transform:translateY(-1px);border-color:#4be0e3aa}
   #hp-side-toggle img{display:block;width:100%;height:100%;object-fit:contain}
   #hp-site-sidebar{position:fixed;z-index:2147482999;inset:0 auto 0 0;width:min(320px,88vw);padding:calc(76px + env(safe-area-inset-top)) 14px calc(22px + env(safe-area-inset-bottom));background:#0d0d19f7;border-right:1px solid #ffffff1c;backdrop-filter:blur(20px);transform:translateX(-105%);transition:transform .22s ease;overflow-y:auto;overscroll-behavior:contain;box-shadow:16px 0 50px #0005}
   #hp-site-sidebar.open{transform:translateX(0)}#hp-side-scrim{position:fixed;inset:0;z-index:2147482998;background:#0009;display:none}#hp-side-scrim.open{display:block}
   .hp-side-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;margin:0 0 6px}.hp-side-brand img{width:30px;height:30px;object-fit:contain}.hp-side-note{font:10px 'DM Mono',monospace;color:#aaa7c1;letter-spacing:.12em;text-transform:uppercase;margin:0 0 20px}
   .hp-side-label{font:10px 'DM Mono',monospace;color:#4be0e3;letter-spacing:.12em;text-transform:uppercase;margin:20px 8px 8px}
   .hp-side-link{display:flex;align-items:center;gap:11px;min-height:42px;padding:10px 12px;border-radius:12px;color:#d8d5e8;text-decoration:none;font-size:14px;line-height:1.3;border:1px solid transparent}
   .hp-side-link:hover,.hp-side-link.active{background:#ffffff0b;border-color:#ffffff18;color:#fff}.hp-side-ico{width:23px;flex:0 0 23px;text-align:center;font-size:16px}
   @media(prefers-reduced-motion:reduce){#hp-site-sidebar,#hp-side-toggle{transition:none}}
  `;document.head.append(css);
  const links=[['⌂','Home','index.html'],['✦','Games','index.html#games'],['▦','Categories','index.html#misc'],['⌕','Search','index.html#search'],['♟','Social hub','social.html'],['♡','Friends','social.html#friends'],['◉','Parties','social.html#parties'],['✉','Chats','social.html#chats'],['▤','Top games','index.html#top-games'],['⚙','Tools','index.html#tools'],['◈','Experiments','index.html#misc'],['ⓘ','About Hyper-Pop','index.html'],['👤','Account / Profile','accounts.html']];
  const scrim=document.createElement('div');scrim.id='hp-side-scrim';
  const aside=document.createElement('aside');aside.id='hp-site-sidebar';aside.setAttribute('aria-label','Hyper-Pop navigation');aside.setAttribute('aria-hidden','true');
  aside.innerHTML='<div class="hp-side-brand"><img src="icon.svg" alt="">Hyper-Pop</div><div class="hp-side-note">tiny internet, big vibes</div>';
  links.forEach((x,i)=>{if(i===0||i===4||i===9||i===11){const h=document.createElement('div');h.className='hp-side-label';h.textContent=i===0?'Explore':i===4?'Social':i===9?'Discover':'More';aside.append(h)}
   const a=document.createElement('a');a.className='hp-side-link';a.href=new URL(x[2],location.href).href;a.innerHTML='<span class="hp-side-ico">'+x[0]+'</span><span>'+x[1]+'</span>';if(i===0)a.classList.add('active');aside.append(a)});
  const toggle=document.createElement('button');toggle.id='hp-side-toggle';toggle.type='button';toggle.setAttribute('aria-label','Open Hyper-Pop menu');toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<img src="icon.svg" alt="">';
  function setOpen(v){aside.classList.toggle('open',v);scrim.classList.toggle('open',v);aside.setAttribute('aria-hidden',String(!v));toggle.setAttribute('aria-expanded',String(v));toggle.setAttribute('aria-label',v?'Close Hyper-Pop menu':'Open Hyper-Pop menu')}
  toggle.addEventListener('click',()=>setOpen(!aside.classList.contains('open')));scrim.addEventListener('click',()=>setOpen(false));document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
  document.body.append(scrim,aside,toggle);aside.addEventListener('click',e=>{if(e.target.closest('a'))setOpen(false)});
 }
 function sync(){if(isHome())initSidebar();else removeSidebar()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
 window.addEventListener('hyperpop:navigate',sync);
 window.addEventListener('popstate',sync);
})();