/* Hyper-Pop shared loader */
(function(){
  var src=document.currentScript&&document.currentScript.src?document.currentScript.src:location.href;
  var base=new URL('.',src);
  document.write('<script src="'+new URL('account.js?v=split-2',base).href+'"><\/script>');
  document.write('<script src="'+new URL('terminal.js?v=cmdfix-6',base).href+'"><\/script>');
})();