/* Hyper-Pop shared loader */
(function(){
  var script = document.currentScript;
  var base = new URL('.', script && script.src ? script.src : location.href);
  var path = location.pathname;
  var excluded = /\/(?:duck|korona|cherri|v5-static|UW|yt2|package|emulator|scramjet-static)(?:\/|$)/i.test(path);

  // Render a visible fallback orb immediately, even before soundtrack.js loads.
  if (!excluded && !document.getElementById('hp-sound-orb')) {
    var fallbackStyle = document.createElement('style');
    fallbackStyle.textContent = '#hp-sound-orb{position:fixed!important;z-index:2147483647!important;right:12px;bottom:12px;width:50px;height:50px;border:1px solid #b8a4ff;border-radius:18px;background:linear-gradient(145deg,#9b7bff,#4be0e3);color:#11111f;box-shadow:0 8px 30px #0008;display:grid;place-items:center;font-size:25px;cursor:pointer;touch-action:manipulation}';
    (document.head || document.documentElement).appendChild(fallbackStyle);
    var fallbackOrb = document.createElement('button');
    fallbackOrb.id = 'hp-sound-orb';
    fallbackOrb.type = 'button';
    fallbackOrb.setAttribute('aria-label', 'Open Hyper-Pop music player');
    fallbackOrb.textContent = '✦';
    fallbackOrb.addEventListener('click', function(){
      var player = document.getElementById('hp-sound-panel');
      if (player) player.hidden = !player.hidden;
      else console.warn('[Hyper-Pop] Music player script has not initialized yet.');
    });
    (document.body || document.documentElement).appendChild(fallbackOrb);
  }

  // Insert every script independently. A failed account/terminal request must
  // never prevent the soundtrack from loading.
  var files = [
    'account.js?v=split-2',
    'terminal.js?v=cmdfix-10'
  ];
  if (!excluded) files.push('soundtrack.js?v=dreamscape-4');

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