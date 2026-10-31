/* Hyper-Pop floating chat. Persistent across soft navigation. */
(function(){
 if(window.__HP_FLOAT_CHAT__)return;window.__HP_FLOAT_CHAT__=true;
 const PUSH_API='https://iapnejlttsqqefkpmelp.supabase.co/functions/v1/hyperpop-push';
 const API='https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_social',KEY='sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM';
 const css=`
 #hp-chat-launch{position:fixed;z-index:10001;right:66px;bottom:14px;width:42px;height:42px;min-width:42px;padding:0;display:grid;place-items:center;border:1px solid #ffffff22;border-radius:12px;background:#0b0b12ef;color:#7df9ff;font:800 18px monospace;box-shadow:0 8px 30px #0008;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none;transition:transform .15s,border-color .15s}#hp-chat-launch:active{transform:scale(.94);border-color:#7df9ff88}#hp-chat-launch:focus-visible{outline:3px solid #7df9ff;outline-offset:3px}
 #hp-chat-window{position:fixed;z-index:2147482501;right:18px;bottom:126px;width:min(370px,calc(100vw - 28px));height:min(520px,calc(100dvh - 155px));min-height:0;min-width:0;display:none;grid-template-rows:auto auto auto minmax(0,1fr) auto;background:#10101df7;color:#f4f2ff;border:1px solid #ffffff24;border-radius:19px;box-shadow:0 20px 70px #000b;backdrop-filter:blur(22px);overflow:hidden;font:14px system-ui}
 #hp-chat-window.open{display:grid}
 #hp-chat-unread-badge{position:absolute;top:-7px;right:-7px;min-width:19px;height:19px;padding:0 5px;display:none;place-items:center;border:2px solid #0b0b12;border-radius:999px;background:#ff477e;color:#fff;font:800 10px/1 system-ui;box-shadow:0 3px 12px #ff477e66}
 #hp-chat-unread-badge.show{display:grid}
 #hp-chat-toast{position:fixed;z-index:2147483646;top:calc(12px + env(safe-area-inset-top));left:50%;transform:translate(-50%,-14px);width:min(430px,calc(100vw - 24px));display:flex;gap:11px;align-items:center;padding:13px 15px;border:1px solid #7df9ff55;border-radius:15px;background:linear-gradient(120deg,#17172af5,#0c2028f5);color:#f7f4ff;box-shadow:0 16px 55px #000b;backdrop-filter:blur(20px);opacity:0;visibility:hidden;transition:opacity .2s,transform .2s,visibility .2s;cursor:pointer;font:13px system-ui}
 #hp-chat-toast.show{opacity:1;visibility:visible;transform:translate(-50%,0)}
 #hp-chat-toast .hp-toast-icon{width:34px;height:34px;flex:0 0 34px;display:grid;place-items:center;border-radius:11px;background:#7df9ff18;color:#7df9ff;font-size:17px}
 #hp-chat-toast .hp-toast-copy{min-width:0;flex:1}
 #hp-chat-toast strong{display:block;font-size:13px}
 #hp-chat-toast span{display:block;margin-top:2px;color:#b9b6cc;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
 #hp-chat-toast .hp-toast-close{border:0;background:transparent;color:#aaa7c1;font-size:16px;padding:4px}
 #hp-chat-window *{box-sizing:border-box}
 #hp-chat-head{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-bottom:1px solid #ffffff18;font-weight:800}
 #hp-chat-head button{background:#ffffff12;color:#fff;border:1px solid #ffffff20;border-radius:9px;padding:6px 10px}
 #hp-chat-pickers{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:10px;border-bottom:1px solid #ffffff18}\n #hp-chat-tabs{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:8px 10px;border-bottom:1px solid #ffffff18;background:#10101d}\n #hp-chat-tabs button{padding:9px;border:1px solid #ffffff18;border-radius:10px;background:#ffffff08;color:#bdb9d2;font:700 12px system-ui}\n #hp-chat-tabs button.active{border-color:#7df9ff66;background:#7df9ff14;color:#8ffaff}\n #hp-party-panel{display:none;min-height:0;overflow:auto;padding:12px;gap:10px;align-content:start}\n #hp-chat-window.party-mode #hp-chat-pickers,#hp-chat-window.party-mode #hp-chat-feed,#hp-chat-window.party-mode>div:last-child{display:none}\n #hp-chat-window.party-mode #hp-party-panel{display:grid}\n #hp-chat-window.party-mode{grid-template-rows:auto auto 1fr}\n .hp-party-card{padding:11px;border:1px solid #ffffff16;border-radius:13px;background:#ffffff06}\n .hp-party-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid #ffffff10;font-size:12px}\n .hp-party-row:last-child{border-bottom:0}\n .hp-party-muted{color:#aaa7c1;font-size:11px}\n .hp-party-action{padding:8px 10px;border:1px solid #ffffff20;border-radius:9px;background:#ffffff0c;color:#f4f2ff;font:700 11px system-ui}\n .hp-party-action.primary{background:linear-gradient(120deg,#b7a0ff,#7df9ff);color:#10101d;border:0}\n #hp-party-chat-feed{display:flex;flex-direction:column;gap:7px;max-height:180px;overflow:auto;margin:8px 0}\n #hp-party-chat-feed .hp-party-msg{padding:8px 10px;border-radius:10px;background:#ffffff0b;font-size:12px;overflow-wrap:anywhere}\n #hp-party-chat-feed small{display:block;color:#aaa7c1;font-size:10px;margin-bottom:3px}\n #hp-party-chat-compose{display:flex;gap:6px}\n #hp-party-chat-compose input{min-width:0;flex:1;padding:9px;border:1px solid #ffffff20;border-radius:9px;background:#ffffff0b;color:#fff;font:12px system-ui}
 #hp-chat-pickers select{min-width:0;width:100%;padding:9px;border:1px solid #ffffff20;border-radius:10px;background:#1b1b2c;color:#fff;font:12px system-ui}
 #hp-chat-feed{min-height:0;min-width:0;overflow:auto;padding:15px 13px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin;scrollbar-color:#ffffff26 transparent;background:radial-gradient(ellipse at 50% 0%,#ffffff06,transparent 70%)}
 #hp-chat-feed:empty:after{content:'Choose a conversation to begin';margin:auto;color:#aaa7c1}
 .hp-chat-bubble{max-width:86%;align-self:flex-start;padding:10px 12px;border:1px solid #ffffff12;border-radius:15px 15px 15px 5px;background:linear-gradient(145deg,#ffffff12,#ffffff08);overflow-wrap:anywhere;line-height:1.45;box-shadow:0 4px 14px #0002}
 .hp-chat-bubble.mine{align-self:flex-end;border-color:#a78bfa35;border-radius:15px 15px 5px 15px;background:linear-gradient(145deg,#9272ef38,#6f59b522)}
 .hp-chat-bubble small{display:block;color:#aaa7c1;font-size:10px;margin-bottom:5px;letter-spacing:.01em}
 .hp-chat-bubble.mine small{color:#d0c2ff}
 #hp-chat-compose{display:flex;gap:7px;padding:10px;border-top:1px solid #ffffff18}
 #hp-chat-compose{gap:8px;padding:12px;background:#0c0c17}
 #hp-chat-compose input{min-width:0;flex:1;padding:12px 13px;border:1px solid #ffffff20;border-radius:13px;background:#ffffff0c;color:#fff;font:13px system-ui;outline:none;transition:border-color .15s,background .15s}
 #hp-chat-compose input:focus{border-color:#7df9ff88;background:#ffffff12}
 #hp-chat-compose button{border:0;border-radius:12px;padding:0 16px;background:linear-gradient(135deg,#b7a0ff,#7df9ff);color:#111;font-weight:850;box-shadow:0 4px 16px #7df9ff20}
 #hp-chat-compose button:active{transform:scale(.96)}
 #hp-chat-window button,#hp-chat-window select{cursor:pointer}
 #hp-chat-window button:focus-visible,#hp-chat-window select:focus-visible{outline:2px solid #7df9ff;outline-offset:2px}
 #hp-chat-window ::selection{background:#7df9ff55}
 #hp-chat-note{padding:7px 13px;color:#75e5e8;font-size:11px;min-height:22px;background:#0c0c17}
 #hp-chat-pickers{background:#121221}
 #hp-chat-pickers select{appearance:none;-webkit-appearance:none;background-color:#1b1b2c;color:#f4f2ff}
 #hp-chat-head{background:linear-gradient(100deg,#17172b,#10232a);padding:13px 14px}
 #hp-chat-head>span{letter-spacing:-.02em}
 #hp-chat-head button{cursor:pointer;transition:background .15s,border-color .15s}
 #hp-chat-head button:hover{background:#ffffff20}
 @media(max-width:520px){#hp-chat-launch{right:66px;bottom:14px;width:42px;height:42px}#hp-chat-window{right:8px;bottom:68px;width:calc(100vw - 16px);height:min(72dvh,600px);max-height:calc(100dvh - 90px)}#hp-chat-toast{top:calc(8px + env(safe-area-inset-top))}.hp-chat-bubble{max-width:92%}}
 `;
 const style=document.createElement('style');style.id='hp-chat-widget-style';style.textContent=css;document.head.append(style);
 const launch=document.createElement('button');launch.id='hp-chat-launch';launch.type='button';launch.innerHTML='✉<span id="hp-chat-unread-badge" aria-hidden="true"></span>';launch.setAttribute('aria-label','Open chat');launch.title='Chat';
 const win=document.createElement('section');win.id='hp-chat-window';win.setAttribute('aria-label','Hyper-Pop chat');
 win.innerHTML='<div id="hp-chat-head"><span>✦ Hyper-Pop Chat</span><button type="button" id="hp-chat-close" aria-label="Close chat">✕</button></div><div id="hp-chat-tabs"><button id="hp-chat-tab-messages" class="active" type="button">✉ Messages</button><button id="hp-chat-tab-party" type="button">◉ Party</button></div><div id="hp-chat-pickers"><select id="hp-chat-conversations" aria-label="Choose a conversation"><option value="">Conversations…</option></select><select id="hp-chat-friends" aria-label="Message a friend"><option value="">＋ New message…</option></select></div><div id="hp-chat-feed"><div style="color:#aaa7c1;text-align:center;padding:28px 8px">Choose a conversation or a friend to start chatting.</div></div><div id="hp-party-panel" aria-label="Party management"><div class="hp-party-card" id="hp-party-overview">Loading party…</div><div class="hp-party-card" id="hp-party-members"></div><div class="hp-party-card" id="hp-party-invites"></div><div class="hp-party-card"><strong style="font-size:12px">✉ Party chat</strong><div id="hp-party-chat-feed"><div class="hp-party-muted">Loading party messages…</div></div><form id="hp-party-chat-compose"><input id="hp-party-chat-input" maxlength="1000" placeholder="Message your party…" autocomplete="off"><button class="hp-party-action primary">Send</button></form></div></div><div><div id="hp-chat-note" role="status"></div><form id="hp-chat-compose"><input id="hp-chat-input" maxlength="2000" placeholder="Write a message…" autocomplete="off"><button>Send</button></form></div>';
 const embeddedHost=document.getElementById('chat-area');if(embeddedHost){win.classList.add('hp-chat-embedded','open');embeddedHost.append(win);launch.style.display='none';}else document.body.append(launch,win);
 const toast=document.createElement('div');toast.id='hp-chat-toast';toast.setAttribute('role','status');toast.innerHTML='<div class="hp-toast-icon">✦</div><div class="hp-toast-copy"><strong id="hp-toast-title"></strong><span id="hp-toast-detail"></span></div><button class="hp-toast-close" type="button" aria-label="Dismiss">×</button>';document.body.append(toast);
 let toastTimer=null,knownUnread=new Set(),hasNotificationBaseline=false,currentStatus='online';
 function showToast(title,detail,onClick){
  $('hp-toast-title').textContent=title;$('hp-toast-detail').textContent=detail||'';
  toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),6500);
  toast.onclick=()=>{toast.classList.remove('show');if(onClick)onClick()};
 }
 toast.querySelector('.hp-toast-close').addEventListener('click',e=>{e.stopPropagation();toast.classList.remove('show')});
 window.HyperPopNotify=(title,detail)=>showToast(title,detail);
 function updateUnread(count){
  const badge=$('hp-chat-unread-badge'),n=Math.max(0,Number(count)||0);
  badge.textContent=n>99?'99+':String(n);badge.classList.toggle('show',n>0);
  launch.setAttribute('aria-label',n?'Open chat, '+n+' unread message'+(n===1?'':'s'):'Open chat');
  launch.title=n?n+' unread message'+(n===1?'':'s'):'Chat';
 }

 const chatVisible=()=>{let visible=true;try{visible=localStorage.getItem('hp_chat_button_visible')!=='false'}catch(_){}launch.style.display=visible?'block':'none';return visible};
 chatVisible();
 window.addEventListener('message',e=>{if(e.origin!==location.origin||!e.source)return;if(typeof e.data==='string'&&e.data.startsWith('hp-chat-visibility:')){const visible=e.data.endsWith('true');try{localStorage.setItem('hp_chat_button_visible',String(visible))}catch(_){}launch.style.display=visible?'block':'none'}});

 const $=id=>document.getElementById(id);let me=null,selected=null,selectedFriend=null,busy=false,lastListRefresh=0;
 async function rpc(action,data={}){const token=localStorage.getItem('hyperpop_token');if(!token)return{ok:false,error:'Sign in to use chat.'};try{const r=await fetch(API,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({p_token:token,p_action:action,p_data:data})});const raw=await r.text();let d;try{d=raw?JSON.parse(raw):{}}catch(_){d={message:raw}}if(!r.ok){const x=Array.isArray(d)?d[0]:d;return{ok:false,error:x.message||x.details||'Chat request failed.'}}return d}catch(_){return{ok:false,error:'Could not reach chat.'}}}
 function note(s){$('hp-chat-note').textContent=s||''}

 const partyTab=$('hp-chat-tab-party'),messagesTab=$('hp-chat-tab-messages');
 let partyMode=false,partyBusy=false,partyChatBusy=false,partySnapshot=null,partyFriends=[],invitePickerOpen=false;
 function switchTab(which){
  partyMode=which==='party';win.classList.toggle('party-mode',partyMode);
  partyTab.classList.toggle('active',partyMode);messagesTab.classList.toggle('active',!partyMode);
  if(partyMode)refreshParty();
 }
 messagesTab.addEventListener('click',()=>switchTab('messages'));
 partyTab.addEventListener('click',()=>switchTab('party'));
 async function partyRPC(action,data={}){return rpc(action,data)}
 function partyButton(label,fn,primary=false){const b=document.createElement('button');b.type='button';b.className='hp-party-action'+(primary?' primary':'');b.textContent=label;b.addEventListener('click',fn);return b}
 function partyRow(name,detail,action){const r=document.createElement('div');r.className='hp-party-row';const l=document.createElement('div');const n=document.createElement('strong');n.textContent=name;const d=document.createElement('div');d.className='hp-party-muted';d.textContent=detail||'';l.append(n,d);r.append(l);if(action)r.append(action);return r}
 async function refreshParty(){
  if(partyBusy)return;partyBusy=true;
  try{
   const [p,f,i]=await Promise.all([partyRPC('party_get'),partyRPC('friends_list'),partyRPC('party_invites')]);
   const overview=$('hp-party-overview'),members=$('hp-party-members'),invites=$('hp-party-invites');
   overview.replaceChildren();members.replaceChildren();invites.replaceChildren();partySnapshot=p.ok?p.party:null;partyFriends=f.ok?(f.friends||[]):[];
   if(!p.ok){overview.textContent=p.error||'Could not load your party.';return}
   if(!partySnapshot){
    const title=document.createElement('strong');title.textContent='You are not in a party yet';const desc=document.createElement('p');desc.className='hp-party-muted';desc.textContent='Create a party, invite friends, and hang out together. Up to 6 players.';overview.append(title,desc,partyButton('＋ Create party',async()=>{const d=await partyRPC('party_create');note(d.error||(d.ok?'Party created!':'Could not create party.'));refreshParty()},true));
   }else{
    const pty=partySnapshot,leader=String(pty.leader_id)===String(me?.id),list=pty.members||[];
    const title=document.createElement('strong');title.textContent='Your party';const desc=document.createElement('p');desc.className='hp-party-muted';desc.textContent=list.length+' / 6 members · '+(pty.game_slug||'No game selected')+(leader?' · You are leader':'');overview.append(title,desc);
    const controls=document.createElement('div');controls.style.cssText='display:flex;flex-wrap:wrap;gap:7px';
    if(leader&&list.length<6)controls.append(partyButton('＋ Invite friend',()=>showPartyInvitePicker(),true));
    controls.append(partyButton('Leave party',async()=>{if(!confirm('Leave this party?'))return;const d=await partyRPC('party_leave');note(d.error||(d.ok?'You left the party.':''));await refreshParty()}));
    controls.append(partyButton(window.HyperPopPartyVoice?.room?'Voice connected':'Join voice',()=>{if(window.HyperPopPartyVoice)window.HyperPopPartyVoice.start();else note('Party voice is loading. Reload the page.')},true));
    overview.append(controls);
    const heading=document.createElement('strong');heading.textContent='Members';members.append(heading);
    list.forEach(m=>{const kick=leader&&!m.is_leader?partyButton('Remove',async()=>{if(!confirm('Remove @'+m.username+' from this party?'))return;const d=await fetch('https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_party_kick',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:localStorage.getItem('hyperpop_token'),p_member:m.id})}).then(r=>r.json()).catch(()=>({}));note(d.error||(d.ok?'Member removed.':'Could not remove member.'));refreshParty()}):null;members.append(partyRow('@'+m.username,m.is_leader?'♛ Party leader':'Party member',kick))});
   }
   const incoming=i.ok?(i.invites||[]):[];
   if(incoming.length){const heading=document.createElement('strong');heading.textContent='Invitations';invites.append(heading);incoming.forEach(inv=>invites.append(partyRow('Invite from @'+inv.from,'Join their party',partyButton('Accept',async()=>{const d=await partyRPC('party_accept',{invite_id:inv.id});note(d.error||(d.ok?'Joined party!':''));refreshParty()},true))))}
   else if(!partySnapshot)invites.append(Object.assign(document.createElement('div'),{className:'hp-party-muted',textContent:'No pending party invites.'}));
   if(partySnapshot&&invitePickerOpen)showPartyInvitePicker();
   await refreshPartyChat();
  }catch(e){$('hp-party-overview').textContent='Could not load party information.'}
  finally{partyBusy=false;if(partyMode&&invitePickerOpen)showPartyInvitePicker()}
 }
 function showPartyInvitePicker(){
  invitePickerOpen=true;
  const area=$('hp-party-invites');area.replaceChildren();const top=document.createElement('div');top.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px';const heading=document.createElement('strong');heading.textContent='Invite a friend';const close=partyButton('Close',()=>{invitePickerOpen=false;area.replaceChildren()},false);top.append(heading,close);area.append(top);
  const members=new Set((partySnapshot?.members||[]).map(m=>String(m.id)));
  const available=partyFriends.filter(f=>!members.has(String(f.id)));
  if(!available.length){area.append(Object.assign(document.createElement('p'),{className:'hp-party-muted',textContent:'No friends available to invite yet.'}));return}
  available.forEach(f=>area.append(partyRow('@'+f.username,'Friend',partyButton('Invite',async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Sending…';const d=await partyRPC('party_invite',{username:f.username});note(d.error||(d.ok?'Invite sent to @'+f.username+'.':''));b.textContent=d.ok?'Sent ✓':'Retry';b.disabled=!!d.ok},true))));
 }
 async function refreshPartyChat(){
  if(partyChatBusy||!partySnapshot)return;partyChatBusy=true;
  try{const r=await fetch('https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_party_chat',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:localStorage.getItem('hyperpop_token'),p_action:'get',p_data:{}})});const d=await r.json().catch(()=>({}));const feed=$('hp-party-chat-feed');feed.replaceChildren();if(!r.ok||!d.ok){feed.textContent=d.error||'Party chat is unavailable.';return}(d.messages||[]).slice().reverse().forEach(m=>{const b=document.createElement('div');b.className='hp-party-msg';const s=document.createElement('small');s.textContent='@'+m.username+' · '+new Date(m.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});const t=document.createElement('div');t.textContent=m.body;b.append(s,t);feed.append(b)});if(!feed.childElementCount)feed.textContent='No messages yet. Start the conversation!';feed.scrollTop=feed.scrollHeight}catch(_){$('hp-party-chat-feed').textContent='Could not load party chat.'}finally{partyChatBusy=false}
 }
 $('hp-party-chat-compose').addEventListener('submit',async e=>{e.preventDefault();const input=$('hp-party-chat-input'),body=input.value.trim();if(!body||!partySnapshot)return;const r=await fetch('https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_party_chat',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({p_token:localStorage.getItem('hyperpop_token'),p_action:'send',p_data:{body}})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok){note(d.error||'Could not send party message.');return}input.value='';refreshPartyChat()});

 async function open(conversationId){win.classList.add('open');if(!win.classList.contains('hp-chat-embedded'))launch.style.display='none';await refreshLists();if(conversationId){const cs=$('hp-chat-conversations');if([...cs.options].some(o=>o.value===String(conversationId))){cs.value=String(conversationId);await showConversation(String(conversationId))}}}
 window.HyperPopOpenChatWithFriend=async friendId=>{await open();const select=$('hp-chat-friends');select.value=String(friendId);select.dispatchEvent(new Event('change',{bubbles:true}))};
 function close(){if(win.classList.contains('hp-chat-embedded'))return;win.classList.remove('open');chatVisible()}
 launch.addEventListener('click',()=>open());$('hp-chat-close').addEventListener('click',close);if(win.classList.contains('hp-chat-embedded'))$('hp-chat-close').style.display='none';
 function syncChatMount(){const host=document.getElementById('chat-area');if(host){win.classList.add('hp-chat-embedded','open');host.append(win);launch.style.display='none';$('hp-chat-close').style.display='none'}else if(win.classList.contains('hp-chat-embedded')){win.classList.remove('hp-chat-embedded','open');document.body.append(win);$('hp-chat-close').style.display='';chatVisible()}}
 window.addEventListener('hyperpop:navigate',syncChatMount);
 async function refreshLists(){
  if(busy)return;busy=true;
  const [chats,friends]=await Promise.all([rpc('chat_list'),rpc('friends_list')]);busy=false;
  const cs=$('hp-chat-conversations'),fs=$('hp-chat-friends');const old=selected,oldFriend=selectedFriend?.id||fs.value;
  cs.replaceChildren(new Option('Choose a conversation…',''));
  if(chats.ok)(chats.conversations||[]).forEach(c=>{const label=(c.title||c.label||'Conversation')+(c.unread?' · unread':'');cs.add(new Option(label,String(c.id)))});
  fs.replaceChildren(new Option('＋ Message a friend…',''));
  if(friends.ok)(friends.friends||[]).forEach(f=>fs.add(new Option('@'+f.username+(' · '+(f.status==='invisible'||!f.online?'offline':({idle:'idle',dnd:'do not disturb',online:'online'})[f.status]||'online')),String(f.id))));
  if(old&&[...cs.options].some(o=>o.value===old)){cs.value=old}
  if(oldFriend&&[...fs.options].some(o=>o.value===String(oldFriend))){fs.value=String(oldFriend);selectedFriend={id:String(oldFriend),name:fs.selectedOptions[0]?.textContent?.replace(/ · (?:online|idle|do not disturb|offline)$/,'')||'Friend'}}
  lastListRefresh=Date.now();
  if(!chats.ok)note(chats.error);else if(!localStorage.getItem('hyperpop_token'))note('Sign in to use chat.');
 }
 async function showConversation(id,quiet=false){
  if(!id)return;selected=id;$('hp-chat-conversations').value=id;
  const feed=$('hp-chat-feed'),wasNearBottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<70,oldHeight=feed.scrollHeight,oldTop=feed.scrollTop;if(!quiet)feed.replaceChildren();const d=await rpc('chat_messages',{conversation_id:id});
  if(!d.ok){if(!quiet)feed.textContent=d.error;return}
  const messages=(d.messages||[]).slice().reverse();
  const fragment=document.createDocumentFragment();if(!messages.length){const empty=document.createElement('div');empty.style.cssText='color:#aaa7c1;text-align:center;padding:28px 8px';empty.textContent='Say hello!';fragment.append(empty)}
  messages.forEach(m=>{const b=document.createElement('div');b.className='hp-chat-bubble'+(me&&m.sender_id===me.id?' mine':'');const s=document.createElement('small');const stamp=m.created_at?new Date(m.created_at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';s.textContent='@'+(m.username||'user')+(stamp?' · '+stamp:'');const t=document.createElement('div');t.textContent=m.body;b.append(s,t);fragment.append(b)});feed.replaceChildren(fragment);
  feed.scrollTop=wasNearBottom||!quiet?feed.scrollHeight:oldTop+(feed.scrollHeight-oldHeight);if(!quiet)note('');
 }
 $('hp-chat-conversations').addEventListener('change',e=>{selectedFriend=null;$('hp-chat-friends').value='';showConversation(e.target.value)});
 $('hp-chat-friends').addEventListener('change',async e=>{const id=e.target.value;if(!id){selectedFriend=null;return}const option=e.target.selectedOptions[0];selectedFriend={id,name:option.textContent.replace(/ · online$/,'')};note('Opening chat…');const d=await rpc('chat_open_friend',{friend_id:id});if(!d.ok){note(d.error);return}await refreshLists();$('hp-chat-friends').value=id;await showConversation(String(d.conversation_id))});
 $('hp-chat-compose').addEventListener('submit',async e=>{e.preventDefault();const body=$('hp-chat-input').value.trim();if(!body||!selected)return;const d=await rpc('chat_send',{conversation_id:selected,body});if(!d.ok){note(d.error);return}const sentConversation=selected;const token=localStorage.getItem('hyperpop_token');if(token)fetch(PUSH_API,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({token,action:'notify_message',conversation_id:sentConversation})}).catch(()=>{});$('hp-chat-input').value='';await showConversation(sentConversation);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&win.classList.contains('open'))close()});
 window.addEventListener('storage',e=>{if(e.key==='hyperpop_token'&&win.classList.contains('open'))refreshLists()});
 setInterval(()=>{if(!win.classList.contains('open')||document.hidden)return;if(partyMode&&!invitePickerOpen)refreshParty();if(selected)showConversation(selected,true);if(Date.now()-lastListRefresh>15000)refreshLists()},2500);
 rpc('me').then(d=>{if(d.ok)me=d.me||null});
 if(win.classList.contains('hp-chat-embedded'))refreshLists();
 
 async function pollNotifications(){
  const token=localStorage.getItem('hyperpop_token');
  if(!token){updateUnread(0);hasNotificationBaseline=false;knownUnread.clear();return}
  try{
   const r=await fetch('https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_social_notifications',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({p_token:token})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok||!d.ok)return;
   updateUnread(d.unread_count);currentStatus=d.status||currentStatus;window.HyperPopPresenceStatus=currentStatus;
   const messages=d.messages||[];
   if(!hasNotificationBaseline){messages.forEach(m=>knownUnread.add(String(m.id)));hasNotificationBaseline=true;return}
   const fresh=messages.filter(m=>!knownUnread.has(String(m.id)));
   messages.forEach(m=>knownUnread.add(String(m.id)));
   if(fresh.length&&currentStatus!=='dnd'){
    const m=fresh[0];
    if(!(win.classList.contains('open')&&selected===String(m.conversation_id))){
     showToast('New message from @'+(m.username||'someone'),m.body,()=>open(m.conversation_id));
    }
   }
   if(knownUnread.size>300)knownUnread=new Set([...knownUnread].slice(-150));
  }catch(_){}
 }
 async function setPresenceStatus(status,source){
  const token=localStorage.getItem('hyperpop_token');
  if(!token)return{ok:false,error:'Sign in to change your status.'};
  try{
   const r=await fetch('https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_set_status',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({p_token:token,p_status:status})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok||!d.ok)throw new Error(d.error||'Could not update status.');
   currentStatus=status;window.HyperPopPresenceStatus=status;
   const frame=document.getElementById('hp-sidebar-frame');
   frame?.contentWindow?.postMessage({type:'hp-status-update',status},location.origin);
   return d;
  }catch(e){return{ok:false,error:e.message||'Could not update status.'}}
 }
 window.addEventListener('message',async e=>{
  if(e.origin!==location.origin||!e.data||typeof e.data!=='object')return;
  if(e.data.type==='hp-status-request'){
   await pollNotifications();
   e.source?.postMessage({type:'hp-status-update',status:currentStatus},location.origin);
  }
  if(e.data.type==='hp-set-status'){
   const d=await setPresenceStatus(e.data.status,e.source);
   e.source?.postMessage({type:'hp-status-result',status:e.data.status,ok:!!d.ok,error:d.error||''},location.origin);
  }
 });

 if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(e=>console.warn('[Hyper-Pop] Push service worker unavailable:',e));
 const handlePushOpen=e=>{if(!e.data||e.data.type!=='hp-push-open')return;const u=new URL(e.data.url||'/',location.origin);const id=u.searchParams.get('hp-chat');if(id)open(id)};window.addEventListener('message',handlePushOpen);if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',handlePushOpen);
 const pushChatId=new URLSearchParams(location.search).get('hp-chat');if(pushChatId)setTimeout(()=>open(pushChatId),1200);
 pollNotifications();setInterval(pollNotifications,9000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollNotifications()});
})();
