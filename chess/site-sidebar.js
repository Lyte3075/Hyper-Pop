/* Home-only Hyper-Pop navigation */
(function(){
  const SIDEBAR_ID='hp-site-sidebar';
  const SCRIM_ID='hp-side-scrim';
  const STYLE_ID='hp-sidebar-style';

  function isHome(){
    const path=location.pathname.replace(/\/+$/,'');
    return path===''||path==='/'||path.endsWith('/index.html');
  }
  function getToggle(){return document.getElementById('hp-side-toggle');}
  function setOpen(open){
    const aside=document.getElementById(SIDEBAR_ID);
    const scrim=document.getElementById(SCRIM_ID);
    const toggle=getToggle();
    if(!aside||!scrim||!toggle)return;
    aside.classList.toggle('open',open);
    scrim.classList.toggle('open',open);
    aside.setAttribute('aria-hidden',String(!open));
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close Hyper-Pop menu':'Open Hyper-Pop menu');
  }
  function removeSidebar(){
    document.getElementById(SIDEBAR_ID)?.remove();
    document.getElementById(SCRIM_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
  }
  function initSidebar(){
    if(!isHome()){removeSidebar();return;}
    const toggle=getToggle();
    if(!toggle)return;
    if(document.getElementById(SIDEBAR_ID))return;

    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #hp-side-toggle{appearance:none;-webkit-appearance:none;cursor:pointer}
      #hp-side-toggle:focus-visible{outline:2px solid #4be0e3;outline-offset:4px}
      #${SIDEBAR_ID}{position:fixed;z-index:2147482999;inset:0 auto 0 0;width:min(320px,88vw);padding:calc(76px + env(safe-area-inset-top)) 14px calc(22px + env(safe-area-inset-bottom));background:#0d0d19f7;border-right:1px solid #ffffff1c;backdrop-filter:blur(20px);transform:translateX(-105%);transition:transform .22s ease;overflow-y:auto;overscroll-behavior:contain;box-shadow:16px 0 50px #0005}
      #${SIDEBAR_ID}.open{transform:translateX(0)}
      #${SCRIM_ID}{position:fixed;inset:0;z-index:2147482998;background:#0009;display:none}
      #${SCRIM_ID}.open{display:block}
      .hp-side-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;margin:0 0 6px}
      .hp-side-brand img{width:30px;height:30px;object-fit:contain}
      .hp-side-note{font:10px 'DM Mono',monospace;color:#aaa7c1;letter-spacing:.12em;text-transform:uppercase;margin:0 0 20px}
      .hp-side-label{font:10px 'DM Mono',monospace;color:#4be0e3;letter-spacing:.12em;text-transform:uppercase;margin:20px 8px 8px}
      .hp-side-link{display:flex;align-items:center;gap:11px;min-height:42px;padding:10px 12px;border-radius:12px;color:#d8d5e8;text-decoration:none;font-size:14px;line-height:1.3;border:1px solid transparent}
      .hp-side-link:hover,.hp-side-link.active{background:#ffffff0b;border-color:#ffffff18;color:#fff}
      .hp-side-ico{width:23px;flex:0 0 23px;text-align:center;font-size:16px}
      @media(prefers-reduced-motion:reduce){#${SIDEBAR_ID}{transition:none}}
    `;
    document.head.append(style);

    const links=[['⌂','Home','index.html'],['✦','Games','index.html#games'],['▦','Categories','index.html#misc'],['⌕','Search','index.html#search'],['♟','Social hub','social.html'],['♡','Friends','social.html#friends'],['◉','Parties','social.html#parties'],['✉','Chats','social.html#chats'],['▤','Top games','index.html#top-games'],['⚙','Tools','index.html#tools'],['◈','Experiments','index.html#misc'],['ⓘ','About Hyper-Pop','index.html'],['👤','Account / Profile','accounts.html']];
    const scrim=document.createElement('div');
    scrim.id=SCRIM_ID;
    const aside=document.createElement('aside');
    aside.id=SIDEBAR_ID;
    aside.setAttribute('aria-label','Hyper-Pop navigation');
    aside.setAttribute('aria-hidden','true');
    aside.innerHTML='<div class="hp-side-brand"><img src="icon.svg" alt="">Hyper-Pop</div><div class="hp-side-note">tiny internet, big vibes</div>';
    links.forEach((item,i)=>{
      if(i===0||i===4||i===9||i===11){
        const heading=document.createElement('div');
        heading.className='hp-side-label';
        heading.textContent=i===0?'Explore':i===4?'Social':i===9?'Discover':'More';
        aside.append(heading);
      }
      const link=document.createElement('a');
      link.className='hp-side-link';
      link.href=new URL(item[2],location.href).href;
      link.innerHTML='<span class="hp-side-ico">'+item[0]+'</span><span>'+item[1]+'</span>';
      if(i===0)link.classList.add('active');
      aside.append(link);
    });
    scrim.addEventListener('click',()=>setOpen(false));
    aside.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false);});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false);});
    document.body.append(scrim,aside);
    toggle.setAttribute('type','button');
    toggle.setAttribute('aria-expanded','false');
  }

  // Delegation keeps the header button working even if page navigation replaces its DOM node.
  document.addEventListener('click',event=>{
    const toggle=event.target.closest('#hp-side-toggle');
    if(!toggle)return;
    event.preventDefault();
    event.stopPropagation();
    if(!document.getElementById(SIDEBAR_ID))initSidebar();
    setOpen(!document.getElementById(SIDEBAR_ID)?.classList.contains('open'));
  },true);

  function sync(){if(isHome())initSidebar();else removeSidebar();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();
  window.addEventListener('hyperpop:navigate',sync);
  window.addEventListener('popstate',sync);
})();