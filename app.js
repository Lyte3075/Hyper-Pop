/* Hyper-Pop shared loader */
(function(){
  const src=document.currentScript&&document.currentScript.src?document.currentScript.src:location.href;
  const base=new URL('.',src);
  function load(name){
    const s=document.createElement('script');
    s.src=new URL(name+'?split-2',base).href;
    s.async=false;
    document.head.appendChild(s);
  }
  load('account.js');
  load('terminal.js');
})();