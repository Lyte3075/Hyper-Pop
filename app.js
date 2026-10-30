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
  // The navigation lives in a standalone same-origin iframe. The iframe owns
  // its gestures and UI, so page swaps cannot detach its event listeners.
  (function(){
    document.getElementById('hp-home-sidebar')?.remove();
    document.getElementById('hp-home-sidebar-scrim')?.remove();
    document.getElementById('hp-global-sidebar-style')?.remove();
    var oldToggle=document.getElementById('hp-side-toggle');
    var frame=document.getElementById('hp-sidebar-frame');
    if(!frame){
      frame=document.createElement('iframe');
      frame.id='hp-sidebar-frame';
      frame.title='Hyper-Pop navigation';
      frame.src=new URL('sidebar.html?v=seamless-2',base).href;
      frame.setAttribute('allowtransparency','true');
      frame.style.cssText='position:fixed;z-index:2147483000;top:0;left:0;width:100vw;height:100%;height:100dvh;border:0;background:transparent;overflow:hidden;pointer-events:none;visibility:hidden;';
      (document.body||document.documentElement).appendChild(frame);
    }
    function commandFrame(action){frame.contentWindow?.postMessage('hp-sidebar-command-'+action,location.origin);}
    // Capture the gesture in the parent document. Touch events that begin on
    // an iframe do not reliably bubble into its parent document on iOS.
    var edgeStart=null,edgeY=0;
    document.addEventListener('touchstart',function(e){
      if(!e.touches||!e.touches.length)return;
      var t=e.touches[0];
      edgeStart=t.clientX<=44?t.clientX:null;edgeY=t.clientY;
    },{passive:true,capture:true});
    document.addEventListener('touchend',function(e){
      if(edgeStart===null||!e.changedTouches||!e.changedTouches.length)return;
      var t=e.changedTouches[0],dx=t.clientX-edgeStart,dy=t.clientY-edgeY;
      if(dx>55&&Math.abs(dx)>Math.abs(dy)*1.25)commandFrame('open');
      edgeStart=null;
    },{passive:true,capture:true});
    document.addEventListener('touchcancel',function(){edgeStart=null},{passive:true,capture:true});
    window.addEventListener('message',function(e){
      if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
      if(e.data==='hp-sidebar-open'){frame.style.visibility='visible';frame.style.pointerEvents='auto'}
      if(e.data==='hp-sidebar-close'){frame.style.pointerEvents='none';frame.style.visibility='hidden'}
    });
    if(oldToggle&&!oldToggle.dataset.hpSidebarBound){
      oldToggle.dataset.hpSidebarBound='1';
      oldToggle.addEventListener('click',function(e){e.preventDefault();commandFrame('toggle');});
    }
  })();
  var files = ['terminal.js?v=cmdfix-10','chat-widget.js?v=popout-2'];
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
        const persistentNodes=['hp-sound-orb','hp-sound-panel','hp-terminal-launcher','hp-terminal','hp-sidebar-frame'].map(id=>document.getElementById(id)).filter(Boolean);
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