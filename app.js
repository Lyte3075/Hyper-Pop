/* Hyper-Pop shared loader */
(function(){
  var src=document.currentScript&&document.currentScript.src?document.currentScript.src:location.href;
  var base=new URL('.',src);
  var path=location.pathname;
  var excluded=/\/(?:duck|korona|cherri|v5-static|UW|yt2|package|emulator|scramjet-static)(?:\/|$)/i.test(path);
  document.write('<script src="'+new URL('account.js?v=split-2',base).href+'"><\\/script>');
  document.write('<script src="'+new URL('terminal.js?v=cmdfix-10',base).href+'"><\\/script>');
  if(!excluded){
    document.write('<script src="'+new URL('soundtrack.js?v=dreamscape-2',base).href+'"><\\/script>');
  }
})();