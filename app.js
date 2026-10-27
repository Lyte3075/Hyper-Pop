/* Hyper-Pop shared loader */
(function(){
  var script = document.currentScript;
  var base = new URL('.', script && script.src ? script.src : location.href);
  var path = location.pathname;
  var excluded = /\/(?:duck|korona|cherri|v5-static|UW|yt2|package|emulator|scramjet-static)(?:\/|$)/i.test(path);

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