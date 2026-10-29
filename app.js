/* Hyper-Pop shared loader */
(function(){
  var script = document.currentScript;
  var base = new URL('.', script && script.src ? script.src : location.href);
  var path = location.pathname;
  var soundtrackDisabled = document.body && document.body.dataset.noSoundtrack === 'true';
  if (!soundtrackDisabled && !document.getElementById('hp-sound-orb')) {
    var fallbackStyle = document.createElement('style');
    fallbackStyle.textContent = '#hp-sound-orb{position:fixed!important;z-index:2147483647!important;right:14px;bottom:14px;width:42px;height:42px;border:1px solid #ffffff22;border-radius:12px;background:#0b0b12ef;color:#7df9ff;box-shadow:0 8px 30px #0008;display:grid;place-items:center;cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-user-drag:none;backdrop-filter:blur(12px)} #hp-sound-orb svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}';
    (document.head || document.documentElement).appendChild(fallbackStyle);
    var fallbackOrb = document.createElement('button');
    fallbackOrb.id = 'hp-sound-orb'; fallbackOrb.type = 'button';
    fallbackOrb.setAttribute('aria-label', 'Open Hyper-Pop music player');
    fallbackOrb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    fallbackOrb.addEventListener('click', function(){if (!document.getElementById('hp-sound-panel')) console.warn('[Hyper-Pop] Music player script has not initialized yet.');});
    (document.body || document.documentElement).appendChild(fallbackOrb);
  }
  // Site-wide swipe navigation. The homepage supplies its own richer sidebar;
  // other pages receive the same compact navigation panel here.
  (function(){
    if (!document.getElementById('hp-home-sidebar')) {
      var style=document.createElement('style');
      style.id='hp-global-sidebar-style';
      style.textContent=`
        #hp-home-sidebar{position:fixed;z-index:2147483000;top:0;bottom:0;left:0;width:min(300px,86vw);padding:calc(22px + env(safe-area-inset-top)) 14px calc(20px + env(safe-area-inset-bottom));overflow-y:auto;background:#0d0d19f7;border-right:1px solid #ffffff1c;backdrop-filter:blur(20px);transform:translateX(-105%);transition:transform .22s ease;box-shadow:16px 0 50px #0007}
        #hp-home-sidebar.open{transform:translateX(0)}
        #hp-home-sidebar-scrim{position:fixed;z-index:2147482999;inset:0;background:#0009;opacity:0;visibility:hidden;transition:opacity .22s,visibility .22s}
        #hp-home-sidebar-scrim.open{opacity:1;visibility:visible}
        #hp-home-sidebar .side-title{font-size:17px;font-weight:700;color:#fff;margin:0 0 4px}
        #hp-home-sidebar .side-note{font:10px 'DM Mono',monospace;color:#aaa7c1;letter-spacing:.12em;text-transform:uppercase;margin:0 0 18px}
        #hp-home-sidebar .side-label{font:10px 'DM Mono',monospace;color:#4be0e3;letter-spacing:.12em;text-transform:uppercase;margin:17px 8px 7px}
        #hp-home-sidebar a{display:flex;align-items:center;gap:10px;min-height:40px;padding:9px 11px;border:1px solid transparent;border-radius:11px;color:#d8d5e8;text-decoration:none;font-size:13px;line-height:1.25}
        #hp-home-sidebar a:hover{background:#ffffff0b;border-color:#ffffff18;color:#fff}
        #hp-home-sidebar .side-icon{width:21px;flex:0 0 21px;text-align:center;font-size:15px}
        #hp-swipe-zone{position:fixed;z-index:2147482998;left:0;top:12%;bottom:12%;width:28px;touch-action:pan-y;background:transparent}
        @media(prefers-reduced-motion:reduce){#hp-home-sidebar,#hp-home-sidebar-scrim{transition:none}}
      `;
      document.head.appendChild(style);
      var scrim=document.createElement('div');scrim.id='hp-home-sidebar-scrim';scrim.setAttribute('aria-hidden','true');
      var panel=document.createElement('aside');panel.id='hp-home-sidebar';panel.setAttribute('aria-label','Hyper-Pop navigation');panel.setAttribute('aria-hidden','true');
      panel.innerHTML='<div class="side-title">Hyper-Pop</div><div class="side-note">tiny internet, big vibes</div><div class="side-label">Explore</div><a href="index.html"><span class="side-icon">⌂</span>Home</a><a href="social.html"><span class="side-icon">♟</span>Social hub</a><a href="social.html#friends"><span class="side-icon">♡</span>Friends</a><a href="social.html#parties"><span class="side-icon">◉</span>Parties</a><a href="social.html#chats"><span class="side-icon">✉</span>Chats</a><div class="side-label">More</div><a href="accounts.html"><span class="side-icon">👤</span>Account / Profile</a>';
      document.body.append(scrim,panel);
    }
    var panel=document.getElementById('hp-home-sidebar'),scrim=document.getElementById('hp-home-sidebar-scrim');
    if(!panel||!scrim)return;
    // Track gestures at document level so the edge gesture survives page navigation
    // and does not depend on a tiny overlay receiving iOS touch events.
    function setOpen(open){panel.classList.toggle('open',open);scrim.classList.toggle('open',open);panel.setAttribute('aria-hidden',String(!open));}
    if(!document.documentElement.dataset.hpEdgeSwipeBound){
      document.documentElement.dataset.hpEdgeSwipeBound='1';
      var edgeStart=null;
      document.addEventListener('touchstart',function(e){
        if(!e.touches||e.touches.length!==1)return;
        var t=e.touches[0];
        edgeStart={x:t.clientX,y:t.clientY,inside:!!e.target.closest('#hp-home-sidebar')};
      },{passive:true,capture:true});
      document.addEventListener('touchend',function(e){
        if(!edgeStart||!e.changedTouches||!e.changedTouches.length)return;
        var t=e.changedTouches[0],dx=t.clientX-edgeStart.x,dy=t.clientY-edgeStart.y;
        if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.25){
          if(edgeStart.inside&&dx<0)setOpen(false);
          else if(!edgeStart.inside&&edgeStart.x<=36&&dx>0)setOpen(true);
        }
        edgeStart=null;
      },{passive:true,capture:true});
      document.addEventListener('touchcancel',function(){edgeStart=null},{passive:true,capture:true});
      document.addEventListener('keydown',function(e){if(e.key==='Escape')setOpen(false)});
    }
    if(!panel.dataset.hpLinkBound){panel.dataset.hpLinkBound='1';panel.addEventListener('click',function(e){if(e.target.closest('a'))setOpen(false)});}
    document.addEventListener('keydown',function(e){if(e.key==='Escape')setOpen(false)});
  })();
  var files = ['terminal.js?v=cmdfix-10'];
  if (!/\/accounts\.html$/.test(location.pathname)) files.unshift('account.js?v=profile-2');
  if (!soundtrackDisabled) files.push('soundtrack.js?v=page-mode-6');
  files.forEach(function(file){var node=document.createElement('script');node.src=new URL(file,base).href;node.async=false;node.onerror=function(){console.error('[Hyper-Pop] Failed to load '+node.src)};(document.head||document.documentElement).appendChild(node)});
  if (!window.__HP_SOFT_NAV__) {
    window.__HP_SOFT_NAV__=true;let currentUrl=location.href;
    document.head.querySelectorAll('style,link[rel="stylesheet"]').forEach(n=>n.setAttribute('data-hp-page-style',''));
    async function navigateHyperPop(url,addHistory=true){
      const target=new URL(url,location.href);
      if(target.origin!==location.origin||!target.pathname.startsWith(new URL('.',location.href).pathname)){location.href=target.href;return}
      if(target.href===currentUrl)return;
      const current=new URL(currentUrl);
      if(target.pathname===current.pathname&&target.search===current.search){currentUrl=target.href;if(target.hash)document.getElementById(decodeURIComponent(target.hash.slice(1)))?.scrollIntoView();return}
      try{
        const response=await fetch(target.href,{credentials:'same-origin'});if(!response.ok)throw new Error('Page request failed: '+response.status);
        const markup=await response.text(),parsed=new DOMParser().parseFromString(markup,'text/html');if(!parsed.body||!parsed.title)throw new Error('Invalid page response');
        const persistentNodes=['hp-sound-orb','hp-sound-panel','hp-terminal-launcher','hp-terminal','hp-home-sidebar','hp-home-sidebar-scrim','hp-swipe-zone'].map(id=>document.getElementById(id)).filter(Boolean);
        const bodyAttrs=[...parsed.body.attributes].map(a=>[a.name,a.value]);[...document.body.attributes].forEach(a=>document.body.removeAttribute(a.name));bodyAttrs.forEach(([name,value])=>document.body.setAttribute(name,value));
        document.body.replaceChildren();[...parsed.body.childNodes].forEach(node=>{if(!(node.nodeType===1&&node.tagName==='SCRIPT'))document.body.append(node.cloneNode(true))});persistentNodes.forEach(node=>document.body.append(node));
        document.title=parsed.title;
        ['meta[name="theme-color"]','meta[name="description"]','link[rel="icon"]','link[rel="apple-touch-icon"]','link[rel="manifest"]'].forEach(sel=>{document.head.querySelectorAll(sel).forEach(n=>n.remove());parsed.head.querySelectorAll(sel).forEach(n=>document.head.append(n.cloneNode(true)))});
        document.head.querySelectorAll('style[data-hp-page-style],link[data-hp-page-style]').forEach(n=>n.remove());
        parsed.head.querySelectorAll('style,link[rel="stylesheet"]').forEach(n=>{const copy=n.cloneNode(true);copy.setAttribute('data-hp-page-style','');document.head.append(copy)});
        if(addHistory)history.pushState({hyperPop:true},'',target.pathname+target.search+target.hash);currentUrl=target.href;
        for(const oldScript of parsed.head.querySelectorAll('script[src]')){const src=oldScript.getAttribute('src')||'';if(/(^|\/)app\.js(?:\?|$)|soundtrack\.js|account\.js|terminal\.js/.test(src))continue;await new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=new URL(src,target.href).href;node.onload=resolve;node.onerror=reject;document.body.append(node)})}
        for(const oldScript of parsed.body.querySelectorAll('script')){const src=oldScript.getAttribute('src')||'';if(src&&/(^|\/)app\.js(?:\?|$)|soundtrack\.js|account\.js|terminal\.js/.test(src))continue;if(src)await new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=new URL(src,target.href).href;node.onload=resolve;node.onerror=reject;document.body.append(node)});else if(oldScript.textContent.trim()){try{(new Function(oldScript.textContent)).call(window)}catch(error){console.error('[Hyper-Pop] Page script error:',error)}}}
        window.scrollTo(0,0);window.dispatchEvent(new CustomEvent('hyperpop:navigate',{detail:{url:target.href,path:target.pathname}}));window.HyperPopCommandPrompt?.sync?.();window.HyperPopSoundtrack?.onPageChange?.(target.pathname);
      }catch(error){console.warn('[Hyper-Pop] Soft navigation fell back to a full page load:',error);location.href=target.href}
    }
    document.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const link=event.target.closest('a[href]');if(!link||link.target&&link.target!=='_self'||link.hasAttribute('download')||link.getAttribute('href').startsWith('#'))return;const url=new URL(link.href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname&&url.search===location.search&&url.hash)return;if(!/^(https?:)$/.test(url.protocol))return;event.preventDefault();navigateHyperPop(url.href,true)});
    window.addEventListener('popstate',()=>navigateHyperPop(location.href,false));
  }
})();