/* Hyper-Pop global navigation sidebar */
(function(){
 if(document.getElementById('hp-site-sidebar')) return;
 const css=document.createElement('style');css.textContent=`
 #hp-side-toggle{position:fixed;z-index:2147483000;left:14px;top:14px;width:44px;height:44px;border:1px solid #ffffff24;border-radius:14px;background:#11111feF;color:#fff;font-size:20px;cursor:pointer;backdrop-filter:blur(14px);box-shadow:0 8px 28px #0005}
 #hp-site-sidebar{position:fixed;z-index:2147482999;inset:0 auto 0 0;width:min(300px,86vw);padding:76px 16px 24px;background:#0d0d19f7;border-right:1px solid #ffffff1c;backdrop-filter:blur(20px);transform:translateX(-105%);transition:transform .22s ease;overflow-y:auto;box-shadow:16px 0 50px #0005}
 #hp-site-sidebar.open{transform:translateX(0)}#hp-side-scrim{position:fixed;inset:0;z-index:2147482998;background:#0009;display:none}#hp-side-scrim.open{display:block}
 .hp-side-brand{font-weight:800;font-size:20px;margin:0 0 6px}.hp-side-note{font:10px 'DM Mono',monospace;color:#aaa7c1;letter-spacing:.12em;text-transform:uppercase;margin:0 0 20px}
 .hp-side-label{font:10px 'DM Mono',monospace;color:#4be0e3;letter-spacing:.12em;text-transform:uppercase;margin:20px 8px 8px}
 .hp-side-link{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:12px;color:#d8d5e8;text-decoration:none;font-size:14px;border:1px solid transparent}
 .hp-side-link:hover,.hp-side-link.active{background:#ffffff0b;border-color:#ffffff18;color:#fff}.hp-side-ico{width:23px;text-align:center;font-size:16px}
 @media(min-width:1200px){body.hp-sidebar-open{padding-left:0}}@media(prefers-reduced-motion:reduce){#hp-site-sidebar{transition:none}}`;
 document.head.append(css);
 const links=[
 ['⌂','Home','index.html'],['✦','Games','index.html#games'],['▦','Categories','index.html#categories'],['⌕','Search','index.html#search'],
 ['♟','Social hub','social.html'],['♡','Friends','social.html#friends'],['◉','Parties','social.html#parties'],['✉','Chats','social.html#chats'],
 ['▤','Top games','index.html#top-games'],['⚙','Tools','index.html#tools'],['◈','Experiments','index.html#experiments'],['ⓘ','About Hyper-Pop','index.html'],['👤','Account / Profile','accounts.html']
 ];
 const scrim=document.createElement('div');scrim.id='hp-side-scrim';
 const aside=document.createElement('aside');aside.id='hp-site-sidebar';aside.setAttribute('aria-label','Hyper-Pop navigation');
 aside.innerHTML='<div class="hp-side-brand">✦ Hyper-Pop</div><div class="hp-side-note">tiny internet, big vibes</div>';
 let label='';links.forEach((x,i)=>{if(i===0||i===4||i===9||i===11){const h=document.createElement('div');h.className='hp-side-label';h.textContent=i===0?'Explore':i===4?'Social':i===9?'Discover':'More';aside.append(h)}
 const a=document.createElement('a');a.className='hp-side-link';a.href=new URL(x[2],document.currentScript?.src||location.href).href;a.innerHTML='<span class="hp-side-ico">'+x[0]+'</span><span>'+x[1]+'</span>';if(location.pathname.endsWith(x[2])&&x[2].includes('.html'))a.classList.add('active');aside.append(a)});
 const toggle=document.createElement('button');toggle.id='hp-side-toggle';toggle.type='button';toggle.setAttribute('aria-label','Open Hyper-Pop navigation');toggle.textContent='☰';
 function setOpen(v){aside.classList.toggle('open',v);scrim.classList.toggle('open',v);toggle.setAttribute('aria-expanded',String(v));toggle.textContent=v?'×':'☰'}
 toggle.addEventListener('click',()=>setOpen(!aside.classList.contains('open')));scrim.addEventListener('click',()=>setOpen(false));document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)});
 document.body.append(scrim,aside,toggle);
 aside.addEventListener('click',e=>{if(e.target.closest('a'))setOpen(false)});
})();