/* Hyper-Pop shared loader */
(function(){
  var script = document.currentScript;
  var base = new URL('.', script && script.src ? script.src : location.href);
  var path = location.pathname;
  var excluded = /\/(?:duck|korona|cherri|v5-static|UW|yt2|package|emulator|scramjet-static)(?:\/|$)/i.test(path);

  // Render a visible fallback orb immediately, even before soundtrack.js loads.
  if (!excluded && !document.getElementById('hp-sound-orb')) {
    var fallbackStyle = document.createElement('style');
    fallbackStyle.textContent = '#hp-sound-orb{position:fixed!important;z-index:2147483647!important;right:14px;bottom:14px;width:42px;height:42px;border:1px solid #ffffff22;border-radius:12px;background:#0b0b12ef;color:#7df9ff;box-shadow:0 8px 30px #0008;display:grid;place-items:center;cursor:pointer;touch-action:manipulation;backdrop-filter:blur(12px)} #hp-sound-orb svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}';
    (document.head || document.documentElement).appendChild(fallbackStyle);
    var fallbackOrb = document.createElement('button');
    fallbackOrb.id = 'hp-sound-orb';
    fallbackOrb.type = 'button';
    fallbackOrb.setAttribute('aria-label', 'Open Hyper-Pop music player');
    fallbackOrb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    fallbackOrb.addEventListener('click', function(){
      if (!document.getElementById('hp-sound-panel')) console.warn('[Hyper-Pop] Music player script has not initialized yet.');
    });
    (document.body || document.documentElement).appendChild(fallbackOrb);
  }

  // Insert every script independently. A failed account/terminal request must
  // never prevent the soundtrack from loading.
  var files = [
    'account.js?v=split-2',
    'terminal.js?v=cmdfix-10'
  ];
  if (!excluded) files.push('soundtrack.js?v=dreamscape-5');

  files.forEach(function(file){
    var node = document.createElement('script');
    node.src = new URL(file, base).href;
    node.async = false;
    node.onerror = function(){
      console.error('[Hyper-Pop] Failed to load ' + node.src);
    };
    (document.head || document.documentElement).appendChild(node);
  });
})();