/* Hyper-Pop shared loader */
(function(){
  var script = document.currentScript;
  var base = new URL('.', script && script.src ? script.src : location.href);
  var path = location.pathname;
  var excluded = /\/(?:duck|korona|cherri|v5-static|UW|yt2|package|emulator|scramjet-static)(?:\/|$)/i.test(path);

  // Load scripts explicitly instead of document.write, which can be fragile
  // when a host, optimizer, or browser changes how scripts are inserted.
  var files = [
    'account.js?v=split-2',
    'terminal.js?v=cmdfix-10'
  ];
  if (!excluded) files.push('soundtrack.js?v=dreamscape-3');

  function loadNext(index) {
    if (index >= files.length) return;
    var node = document.createElement('script');
    node.src = new URL(files[index], base).href;
    node.async = false;
    node.onload = function(){ loadNext(index + 1); };
    node.onerror = function(){
      console.error('[Hyper-Pop] Failed to load ' + node.src);
    };
    (document.head || document.documentElement).appendChild(node);
  }

  loadNext(0);
})();