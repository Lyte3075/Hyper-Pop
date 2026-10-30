const HP_PUSH_ICON='/icon.svg';
self.addEventListener('push',event=>{
 let data={};try{data=event.data?event.data.json():{}}catch(_){}
 const title=data.title||'Hyper-Pop';
 const options={body:data.body||'You have a new notification.',icon:HP_PUSH_ICON,badge:HP_PUSH_ICON,tag:data.tag||'hyper-pop',renotify:true,data:{url:data.url||'/'}};
 event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const url=new URL(event.notification.data?.url||'/',self.location.origin).href;
 event.waitUntil((async()=>{
  const clientsList=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  for(const client of clientsList){if(new URL(client.url).origin===self.location.origin){await client.focus();client.postMessage({type:'hp-push-open',url});return}}
  await self.clients.openWindow(url);
 })());
});
self.addEventListener('pushsubscriptionchange',()=>{});
