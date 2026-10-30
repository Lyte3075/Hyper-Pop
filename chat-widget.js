/* Hyper-Pop floating chat. Persistent across soft navigation. */
(function(){
 if(window.__HP_FLOAT_CHAT__)return;window.__HP_FLOAT_CHAT__=true;
 const API='https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_social',KEY='sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM';
 const css=`
 #hp-chat-launch{position:fixed;z-index:10001;right:66px;bottom:14px;width:42px;height:42px;min-width:42px;padding:0;display:grid;place-items:center;border:1px solid #ffffff22;border-radius:12px;background:#0b0b12ef;color:#7df9ff;font:800 18px monospace;box-shadow:0 8px 30px #0008;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none;transition:transform .15s,border-color .15s}#hp-chat-launch:active{transform:scale(.94);border-color:#7df9ff88}#hp-chat-launch:focus-visible{outline:3px solid #7df9ff;outline-offset:3px}
 #hp-chat-window{position:fixed;z-index:2147482501;right:18px;bottom:126px;width:min(370px,calc(100vw - 28px));height:min(520px,calc(100dvh - 155px));display:none;grid-template-rows:auto auto 1fr auto;background:#10101df7;color:#f4f2ff;border:1px solid #ffffff24;border-radius:19px;box-shadow:0 20px 70px #000b;backdrop-filter:blur(22px);overflow:hidden;font:14px system-ui}
 #hp-chat-window.open{display:grid}
 #hp-chat-window *{box-sizing:border-box}
 #hp-chat-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #ffffff18;font-weight:800}
 #hp-chat-head button{background:#ffffff12;color:#fff;border:1px solid #ffffff20;border-radius:9px;padding:6px 10px}
 #hp-chat-pickers{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:10px;border-bottom:1px solid #ffffff18}
 #hp-chat-pickers select{min-width:0;width:100%;padding:9px;border:1px solid #ffffff20;border-radius:10px;background:#1b1b2c;color:#fff;font:12px system-ui}
 #hp-chat-feed{overflow:auto;padding:12px;display:flex;flex-direction:column;gap:8px}
 .hp-chat-bubble{max-width:88%;align-self:flex-start;padding:9px 11px;border-radius:13px;background:#ffffff10;overflow-wrap:anywhere}
 .hp-chat-bubble.mine{align-self:flex-end;background:#9272ef35}
 .hp-chat-bubble small{display:block;color:#aaa7c1;font-size:10px;margin-bottom:4px}
 #hp-chat-compose{display:flex;gap:7px;padding:10px;border-top:1px solid #ffffff18}
 #hp-chat-compose input{min-width:0;flex:1;padding:11px;border:1px solid #ffffff20;border-radius:11px;background:#ffffff0c;color:#fff;font:13px system-ui}
 #hp-chat-compose button{border:0;border-radius:11px;padding:0 14px;background:#a78bfa;color:#111;font-weight:800}
 #hp-chat-note{padding:6px 12px;color:#75e5e8;font-size:11px;min-height:22px}
 @media(max-width:520px){#hp-chat-launch{right:66px;bottom:14px;width:42px;height:42px}#hp-chat-window{right:8px;bottom:68px;width:calc(100vw - 16px);height:min(66dvh,560px)}}
 `;
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 const launch=document.createElement('button');launch.id='hp-chat-launch';launch.type='button';launch.textContent='✉';launch.setAttribute('aria-label','Open chat');launch.title='Chat';
 const win=document.createElement('section');win.id='hp-chat-window';win.setAttribute('aria-label','Hyper-Pop chat');
 win.innerHTML='<div id="hp-chat-head"><span>✦ Hyper-Pop Chat</span><button type="button" id="hp-chat-close" aria-label="Close chat">✕</button></div><div id="hp-chat-pickers"><select id="hp-chat-conversations" aria-label="Choose a conversation"><option value="">Conversations…</option></select><select id="hp-chat-friends" aria-label="Message a friend"><option value="">＋ New message…</option></select></div><div id="hp-chat-feed"><div style="color:#aaa7c1;text-align:center;padding:28px 8px">Choose a conversation or a friend to start chatting.</div></div><div><div id="hp-chat-note" role="status"></div><form id="hp-chat-compose"><input id="hp-chat-input" maxlength="2000" placeholder="Write a message…" autocomplete="off"><button>Send</button></form></div>';
 document.body.append(launch,win);
 const chatVisible=()=>{let visible=true;try{visible=localStorage.getItem('hp_chat_button_visible')==='true'}catch(_){}launch.style.display=visible?'block':'none';return visible};
 chatVisible();
 window.addEventListener('message',e=>{if(e.origin!==location.origin||!e.source)return;if(typeof e.data==='string'&&e.data.startsWith('hp-chat-visibility:')){const visible=e.data.endsWith('true');try{localStorage.setItem('hp_chat_button_visible',String(visible))}catch(_){}launch.style.display=visible?'block':'none'}});

 const $=id=>document.getElementById(id);let me=null,selected=null,busy=false;
 async function rpc(action,data={}){const token=localStorage.getItem('hyperpop_token');if(!token)return{ok:false,error:'Sign in to use chat.'};try{const r=await fetch(API,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({p_token:token,p_action:action,p_data:data})});const raw=await r.text();let d;try{d=raw?JSON.parse(raw):{}}catch(_){d={message:raw}}if(!r.ok){const x=Array.isArray(d)?d[0]:d;return{ok:false,error:x.message||x.details||'Chat request failed.'}}return d}catch(_){return{ok:false,error:'Could not reach chat.'}}}
 function note(s){$('hp-chat-note').textContent=s||''}
 function open(){win.classList.add('open');launch.style.display='none';refreshLists()}
 function close(){win.classList.remove('open');chatVisible()}
 launch.addEventListener('click',open);$('hp-chat-close').addEventListener('click',close);
 async function refreshLists(){
  if(busy)return;busy=true;
  const [chats,friends]=await Promise.all([rpc('chat_list'),rpc('friends_list')]);busy=false;
  const cs=$('hp-chat-conversations'),fs=$('hp-chat-friends');const old=selected;
  cs.replaceChildren(new Option('Choose a conversation…',''));
  if(chats.ok)(chats.conversations||[]).forEach(c=>{const label=(c.title||c.label||'Conversation')+(c.unread?' · unread':'');cs.add(new Option(label,String(c.id)))});
  fs.replaceChildren(new Option('＋ Message a friend…',''));
  if(friends.ok)(friends.friends||[]).forEach(f=>fs.add(new Option('@'+f.username+(f.online?' · online':''),String(f.id))));
  if(old&&[...cs.options].some(o=>o.value===old)){cs.value=old}
  if(!chats.ok)note(chats.error);else if(!localStorage.getItem('hyperpop_token'))note('Sign in to use chat.');
 }
 async function showConversation(id){
  if(!id)return;selected=id;$('hp-chat-conversations').value=id;$('hp-chat-friends').value='';
  const feed=$('hp-chat-feed');feed.replaceChildren();const d=await rpc('chat_messages',{conversation_id:id});
  if(!d.ok){feed.textContent=d.error;return}
  const messages=(d.messages||[]).slice().reverse();
  if(!messages.length){feed.textContent='Say hello!'}
  messages.forEach(m=>{const b=document.createElement('div');b.className='hp-chat-bubble'+(me&&m.sender_id===me.id?' mine':'');const s=document.createElement('small');s.textContent='@'+(m.username||'user');const t=document.createElement('div');t.textContent=m.body;b.append(s,t);feed.append(b)});
  feed.scrollTop=feed.scrollHeight;note('');
 }
 $('hp-chat-conversations').addEventListener('change',e=>showConversation(e.target.value));
 $('hp-chat-friends').addEventListener('change',async e=>{const id=e.target.value;if(!id)return;note('Opening chat…');const d=await rpc('chat_open_friend',{friend_id:id});if(!d.ok){note(d.error);return}await refreshLists();await showConversation(String(d.conversation_id))});
 $('hp-chat-compose').addEventListener('submit',async e=>{e.preventDefault();const body=$('hp-chat-input').value.trim();if(!body||!selected)return;const d=await rpc('chat_send',{conversation_id:selected,body});if(!d.ok){note(d.error);return}$('hp-chat-input').value='';await showConversation(selected);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&win.classList.contains('open'))close()});
 window.addEventListener('storage',e=>{if(e.key==='hyperpop_token'&&win.classList.contains('open'))refreshLists()});
 rpc('me').then(d=>{if(d.ok)me=d.me||null});
})();
