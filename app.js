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
  var files = ['account.js?v=split-2','terminal.js?v=cmdfix-10','site-sidebar.js?v=sidebar-1'];
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
        const persistentNodes=['hp-sound-orb','hp-sound-panel','hp-terminal-launcher','hp-terminal','hp-side-toggle','hp-site-sidebar','hp-side-scrim'].map(id=>document.getElementById(id)).filter(Boolean);
        const bodyAttrs=[...parsed.body.attributes].map(a=>[a.name,a.value]);[...document.body.attributes].forEach(a=>document.body.removeAttribute(a.name));bodyAttrs.forEach(([name,value])=>document.body.setAttribute(name,value));
        document.body.replaceChildren();[...parsed.body.childNodes].forEach(node=>{if(!(node.nodeType===1&&node.tagName==='SCRIPT'))document.body.append(node.cloneNode(true))});persistentNodes.forEach(node=>document.body.append(node));
        document.title=parsed.title;
        ['meta[name="theme-color"]','meta[name="description"]','link[rel="icon"]','link[rel="apple-touch-icon"]','link[rel="manifest"]'].forEach(sel=>{document.head.querySelectorAll(sel).forEach(n=>n.remove());parsed.head.querySelectorAll(sel).forEach(n=>document.head.append(n.cloneNode(true)))});
        document.head.querySelectorAll('style[data-hp-page-style],link[data-hp-page-style]').forEach(n=>n.remove());
        parsed.head.querySelectorAll('style,link[rel="stylesheet"]').forEach(n=>{const copy=n.cloneNode(true);copy.setAttribute('data-hp-page-style','');document.head.append(copy)});
        if(addHistory)history.pushState({hyperPop:true},'',target.pathname+target.search+target.hash);currentUrl=target.href;
        for(const oldScript of parsed.head.querySelectorAll('script[src]')){const src=oldScript.getAttribute('src')||'';if(/(^|\/)app\.js(?:\?|$)|soundtrack\.js|account\.js|terminal\.js|site-sidebar\.js/.test(src))continue;await new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=new URL(src,target.href).href;node.onload=resolve;node.onerror=reject;document.body.append(node)})}
        for(const oldScript of parsed.body.querySelectorAll('script')){const src=oldScript.getAttribute('src')||'';if(src&&/(^|\/)app\.js(?:\?|$)|soundtrack\.js|account\.js|terminal\.js|site-sidebar\.js/.test(src))continue;if(src)await new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=new URL(src,target.href).href;node.onload=resolve;node.onerror=reject;document.body.append(node)});else if(oldScript.textContent.trim()){try{(new Function(oldScript.textContent)).call(window)}catch(error){console.error('[Hyper-Pop] Page script error:',error)}}}
        window.scrollTo(0,0);window.dispatchEvent(new CustomEvent('hyperpop:navigate',{detail:{url:target.href,path:target.pathname}}));window.HyperPopCommandPrompt?.sync?.();window.HyperPopSoundtrack?.onPageChange?.(target.pathname);
      }catch(error){console.warn('[Hyper-Pop] Soft navigation fell back to a full page load:',error);location.href=target.href}
    }
    document.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const link=event.target.closest('a[href]');if(!link||link.target&&link.target!=='_self'||link.hasAttribute('download')||link.getAttribute('href').startsWith('#'))return;const url=new URL(link.href,location.href);if(url.origin!==location.origin||url.pathname===location.pathname&&url.search===location.search&&url.hash)return;if(!/^(https?:)$/.test(url.protocol))return;event.preventDefault();navigateHyperPop(url.href,true)});
    window.addEventListener('popstate',()=>navigateHyperPop(location.href,false));
  }
})();