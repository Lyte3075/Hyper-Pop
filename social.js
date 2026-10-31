/* Hyper-Pop social hub UI. Calls the token-authenticated social RPC API. */
(function(){
 const $=id=>document.getElementById(id), token=()=>localStorage.getItem('hyperpop_token');
 let selectedConversation=null, me=null,liveRefreshBusy=false,knownIncomingRequests=null,cachedFriends=[],partyChatConversation=null,partyChatBusy=false;
 async function rpc(action,data={}){const t=token();if(!t)return {ok:false,error:'Please sign in first.'};try{const r=await fetch('https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_social',{method:'POST',headers:{apikey:'sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM','Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({p_token:t,p_action:action,p_data:data})});const raw=await r.text();let d;try{d=raw?JSON.parse(raw):{}}catch(_){d={message:raw}}if(!r.ok){const detail=Array.isArray(d)?d[0]:d;return {ok:false,error:detail.message||detail.error||detail.details||('Social request failed ('+r.status+').')}}return d}catch(e){console.error('[Hyper-Pop social]',action,e);return {ok:false,error:'Could not reach the social server.'}}}
 function status(s){$('social-status').textContent=s}
 function presenceLabel(f){if(!f.online||f.status==='invisible')return'Offline';return({idle:'Idle',dnd:'Do not disturb',online:'Online'})[f.status]||'Online'}
 function empty(text){const d=document.createElement('div');d.className='social-empty';d.textContent=text;return d}
 function item(name,detail,buttons=[]){const d=document.createElement('div');d.className='social-item';const left=document.createElement('div');const b=document.createElement('strong');b.textContent=name;const small=document.createElement('div');small.className='social-muted';small.textContent=detail||'';left.append(b,small);d.append(left);const right=document.createElement('div');right.className='social-row';buttons.forEach(([label,fn])=>{const x=document.createElement('button');x.className='social-btn';x.textContent=label;x.addEventListener('click',fn);right.append(x)});d.append(right);return d}
 async function loadFriends(){const d=await rpc('friends_list');$('friends-list').replaceChildren();$('friend-requests').replaceChildren();if(!d.ok){$('friends-list').append(empty(d.error));return}const friends=d.friends||[],requests=d.requests||[];cachedFriends=friends;const incoming=new Set(requests.map(f=>String(f.friendship_id)));if(knownIncomingRequests!==null){const fresh=requests.filter(f=>!knownIncomingRequests.has(String(f.friendship_id)));if(fresh.length&&window.HyperPopNotify)window.HyperPopNotify('New friend request',fresh.length===1?'@'+fresh[0].username+' wants to be your friend':fresh.length+' people sent you friend requests.')}knownIncomingRequests=incoming;if(!friends.length)$('friends-list').append(empty('No friends yet. Search for someone above.'));friends.forEach(f=>$('friends-list').append(item('@'+f.username,presenceLabel(f),[['Message',()=>openFriendConversation(f.id)],['Call',()=>{if(window.HyperPopVoiceCall)window.HyperPopVoiceCall.start(f.id,'@'+f.username);else status('Voice calling is still loading. Try again in a moment.')}]])));if(!requests.length)$('friend-requests').append(empty('No pending requests.'));requests.forEach(f=>$('friend-requests').append(item('@'+f.username,'Wants to connect',[['Accept',async()=>{const x=await rpc('friend_accept',{friendship_id:f.friendship_id});status(x.error||'Friend request accepted.');await Promise.all([loadFriends(),loadChats()])}],['Decline',async()=>{const x=await rpc('friend_decline',{friendship_id:f.friendship_id});status(x.error||'Request declined.');loadFriends()}]])))}
 let searchTimer=null,searchSequence=0;
 function renderUserResult(u){
   const d=document.createElement('div');d.className='social-user-result';
   const avatar=document.createElement('div');avatar.className='social-avatar';avatar.textContent=(u.display_name||u.username||'?').trim().charAt(0).toUpperCase();
   if(u.avatar_url){const img=document.createElement('img');img.src=u.avatar_url;img.alt='';img.loading='lazy';avatar.replaceChildren(img)}
   const info=document.createElement('div');info.className='social-user-info';
   const name=document.createElement('strong');name.textContent=u.display_name||'@'+u.username;
   const handle=document.createElement('div');handle.className='social-muted';handle.textContent='@'+u.username+(u.online?' · '+presenceLabel(u):' · Offline');
   info.append(name,handle);
   if(u.bio){const bio=document.createElement('div');bio.className='social-user-bio';bio.textContent=u.bio;info.append(bio)}
   const action=document.createElement('button');action.className='social-btn';action.textContent=u.is_friend?'Friends':u.request_sent?'Requested':u.request_received?'Accept':'＋ Add';
   action.disabled=!!(u.is_friend||u.request_sent);
   action.addEventListener('click',async()=>{action.disabled=true;action.textContent=u.request_received?'Accepting…':'Sending…';const x=u.request_received?await rpc('friend_accept',{friendship_id:u.friendship_id}):await rpc('friend_request',{username:u.username});status(x.error||(x.ok?(u.request_received?'Friend request accepted.':'Friend request sent.'):'Could not complete request.'));if(x.ok){action.textContent=u.request_received?'Friends':'Requested';await Promise.all([loadFriends(),loadChats(),loadParty(),loadPartyChat()]);if($('friend-search').value.trim().length>=2)search()}else{action.disabled=false;action.textContent=u.request_received?'Accept':'＋ Add'}});
   d.append(avatar,info,action);return d;
 }
 async function search(){
   const q=$('friend-search').value.trim(),seq=++searchSequence,results=$('friend-results');
   if(!q){results.replaceChildren(empty('Start typing a username to see matching accounts.'));return}
   if(q.length<2){results.replaceChildren(empty('Type at least 2 characters to find people.'));return}
   results.replaceChildren(empty('Finding close matches…'));
   const d=await rpc('friend_search',{query:q});
   if(seq!==searchSequence)return;
   results.replaceChildren();
   if(!d.ok){results.append(empty(d.error));return}
   const matches=(d.results||[]).slice(0,8);
   if(!matches.length){results.append(empty('No close matches yet. Try a shorter username.'));return}
   const count=document.createElement('div');count.className='social-muted social-result-count';count.textContent=matches.length+' close match'+(matches.length===1?'':'es');results.append(count);
   matches.forEach(u=>results.append(renderUserResult(u)));
 }
 function scheduleSearch(){clearTimeout(searchTimer);searchTimer=setTimeout(search,220)}


 if(!window.HyperPopPartyVoice){
  const VAPI='https://iapnejlttsqqefkpmelp.supabase.co/functions/v1/hyperpop-party-voice';
  const voice={room:null,stream:null,peers:new Map(),poll:null,muted:false,dock:null,async api(action,data={}){const r=await fetch(VAPI,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:localStorage.getItem('hyperpop_token'),action,...data})});const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'Party voice request failed.');return d;},
   ensureDock(){if(this.dock?.isConnected)return;let d=document.getElementById('hp-party-voice-dock');if(!d){d=document.createElement('div');d.id='hp-party-voice-dock';d.style.cssText='position:fixed;z-index:2147482505;left:14px;bottom:68px;display:none;align-items:center;gap:8px;padding:10px 12px;border:1px solid #7df9ff66;border-radius:14px;background:#10101df5;color:#fff;box-shadow:0 12px 40px #0009;font:12px system-ui';d.innerHTML='<span id="hp-party-voice-state">Party voice connected</span><button id="hp-party-voice-mute" type="button">Mute</button><button id="hp-party-voice-leave" type="button">Leave</button>';document.body.append(d);d.querySelector('#hp-party-voice-mute').onclick=()=>this.toggleMute();d.querySelector('#hp-party-voice-leave').onclick=()=>this.stop();}this.dock=d;},
   say(s){this.ensureDock();const n=this.dock.querySelector('#hp-party-voice-state');if(n)n.textContent=s;},
   async signal(to,kind,payload){if(!this.room)return;await this.api('signal',{room_id:this.room,to,kind,payload});},
   async makePeer(id,offer){if(this.peers.has(id))return this.peers.get(id);const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});this.peers.set(id,{pc,queued:[]});this.stream.getTracks().forEach(t=>pc.addTrack(t,this.stream));pc.ontrack=e=>{let a=document.getElementById('hp-party-audio-'+id);if(!a){a=document.createElement('audio');a.id='hp-party-audio-'+id;a.autoplay=true;a.playsInline=true;a.style.display='none';document.body.append(a)}a.srcObject=e.streams[0];a.play().catch(()=>this.say('Tap the page to enable party audio'));};pc.onicecandidate=e=>{if(e.candidate)this.signal(id,'ice',e.candidate.toJSON()).catch(()=>{});};pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'||pc.connectionState==='disconnected')this.say('Reconnecting party audio…');};if(offer){const o=await pc.createOffer();await pc.setLocalDescription(o);await this.signal(id,'offer',pc.localDescription.toJSON());}return this.peers.get(id);},
   async start(){if(this.room)return;try{this.say('Requesting microphone…');this.ensureDock();this.dock.style.display='flex';this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});const joined=await this.api('join');this.room=joined.room_id;for(const p of joined.peers||[]){const older=new Date(p.joined_at).getTime()<Date.now()-500;await this.makePeer(p.account_id,older);}this.say('Party voice · '+(this.peers.size+1)+' connected');this.poll=setInterval(()=>this.check(),900);}catch(e){this.say(e.message);this.dock.style.display='flex';if(this.stream){this.stream.getTracks().forEach(t=>t.stop());this.stream=null;}this.room=null;}},
   async check(){if(!this.room)return;try{const d=await this.api('poll',{room_id:this.room});for(const s of d.signals||[]){const id=s.from_id;if(s.kind==='leave'){this.dropPeer(id);continue;}let p=this.peers.get(id);if(!p)p=await this.makePeer(id,false);const pc=p.pc;if(s.kind==='offer'){await pc.setRemoteDescription(s.payload);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await this.signal(id,'answer',pc.localDescription.toJSON());for(const c of p.queued.splice(0))await pc.addIceCandidate(c);}else if(s.kind==='answer'){await pc.setRemoteDescription(s.payload);for(const c of p.queued.splice(0))await pc.addIceCandidate(c);}else if(s.kind==='ice'){if(pc.remoteDescription)await pc.addIceCandidate(s.payload);else p.queued.push(s.payload);}}const alive=new Set(d.members||[]);for(const id of this.peers.keys())if(!alive.has(id))this.dropPeer(id);this.say('Party voice · '+(this.peers.size+1)+' connected');}catch(e){this.say('Party voice reconnecting…');}},
   dropPeer(id){const p=this.peers.get(id);if(p){p.pc.close();this.peers.delete(id);}document.getElementById('hp-party-audio-'+id)?.remove();},
   toggleMute(){if(!this.stream)return;this.muted=!this.muted;this.stream.getAudioTracks().forEach(t=>t.enabled=!this.muted);this.dock.querySelector('#hp-party-voice-mute').textContent=this.muted?'Unmute':'Mute';},
   async stop(){clearInterval(this.poll);this.poll=null;const room=this.room;this.room=null;if(room)this.api('leave',{room_id:room}).catch(()=>{});for(const id of [...this.peers.keys()])this.dropPeer(id);if(this.stream)this.stream.getTracks().forEach(t=>t.stop());this.stream=null;this.muted=false;if(this.dock)this.dock.style.display='none';}
  };window.HyperPopPartyVoice=voice;
 }
 async function loadPartyChat(){
  if(partyChatBusy||!token()||!$('party-chat-feed'))return;
  partyChatBusy=true;
  try{
   const r=await fetch('https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_party_chat',{method:'POST',headers:{apikey:'sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM','Content-Type':'application/json'},body:JSON.stringify({p_token:token(),p_action:'get',p_data:{}})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok||!d.ok){$('party-chat-feed').replaceChildren(empty(d.error||'Party chat is unavailable.'));return}
   partyChatConversation=d.conversation_id;
   const feed=$('party-chat-feed'),wasBottom=feed.scrollHeight-feed.scrollTop-feed.clientHeight<55;
   feed.replaceChildren();
   (d.messages||[]).slice().reverse().forEach(m=>{
    const bubble=document.createElement('div');bubble.className='social-bubble'+(String(m.sender_id)===String(me?.id)?' mine':'');
    const small=document.createElement('small');small.textContent='@'+m.username+' · '+new Date(m.created_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    const body=document.createElement('div');body.textContent=m.body;bubble.append(small,body);feed.append(bubble);
   });
   if(!feed.childElementCount)feed.append(empty('Your party chat is ready. Say something!'));
   if(wasBottom)feed.scrollTop=feed.scrollHeight;
  }catch(_){$('party-chat-feed')?.replaceChildren(empty('Could not load party chat.'))}
  finally{partyChatBusy=false}
 }
 async function sendPartyChat(event){
  event?.preventDefault();
  const input=$('party-chat-input'),body=input?.value.trim();
  if(!body||!partyChatConversation)return;
  input.disabled=true;
  try{
   const r=await fetch('https://iapnejlttsqqefkpmelp.supabase.co/rest/v1/rpc/hyperpop_party_chat',{method:'POST',headers:{apikey:'sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM','Content-Type':'application/json'},body:JSON.stringify({p_token:token(),p_action:'send',p_data:{body}})});
   const d=await r.json().catch(()=>({}));
   if(!r.ok||!d.ok){status(d.error||'Could not send party message.');return}
   input.value='';await loadPartyChat();
  }catch(_){status('Could not send party message.')}
  finally{input.disabled=false;input.focus()}
 }
 async function loadParty(){
  const d=await rpc('party_get');$('party-current').replaceChildren();
  if(!d.ok){$('party-current').append(empty(d.error));return}
  if(!d.party){partyChatConversation=null;$('party-current').append(empty('You are not in a party.'));$('party-games').innerHTML='<div class="social-item"><span>Solo games</span><span class="social-muted">1 player</span></div><div class="social-item"><span>Party-enabled games</span><span class="social-muted">2–6 players</span></div>';return}
  const p=d.party,members=p.members||[];
  $('party-current').append(item('Party lobby',String(members.length)+' / 6 players · '+(p.game_slug||'No game selected')));
  members.forEach(m=>$('party-current').append(item('@'+m.username,m.is_leader?'Party leader':'Party member')));
  const partyVoice=document.createElement('div');partyVoice.className='social-row';partyVoice.style.marginTop='10px';const voiceButton=document.createElement('button');voiceButton.className='social-btn primary';voiceButton.textContent=window.HyperPopPartyVoice.room?'Party voice is active':'Join party voice';voiceButton.addEventListener('click',()=>window.HyperPopPartyVoice.start());partyVoice.append(voiceButton);$('party-current').append(partyVoice);
  const partyChat=document.createElement('section');partyChat.className='party-chat-panel';
  partyChat.innerHTML='<h3>✉ Party chat</h3><div id="party-chat-feed" class="social-chatbox" aria-live="polite"><div class="social-empty">Loading party chat…</div></div><form id="party-chat-form" class="social-row" style="margin-top:9px"><input id="party-chat-input" class="social-input" maxlength="1000" placeholder="Message your party…" autocomplete="off"><button class="social-btn primary" type="submit">Send</button></form><div class="social-muted" style="margin-top:8px">Messages stay with this party while you navigate Hyper-Pop.</div>';
  $('party-current').append(partyChat);
  $('party-chat-form').addEventListener('submit',sendPartyChat);
  loadPartyChat();
  const isLeader=members.some(m=>m.is_leader&&((me&&String(m.id)===String(me.id))||m.username===me?.username));
  if(isLeader&&members.length<6){
   const inviteRow=document.createElement('div');inviteRow.className='social-row';inviteRow.style.cssText='margin-top:10px;justify-content:flex-start';
   const inviteButton=document.createElement('button');inviteButton.className='social-btn primary';inviteButton.textContent='＋ Invite a friend';inviteRow.append(inviteButton);$('party-current').append(inviteRow);
   const picker=document.createElement('div');picker.id='party-invite-picker';picker.className='social-list';picker.style.marginTop='8px';picker.hidden=true;$('party-current').append(picker);
   inviteButton.addEventListener('click',()=>{picker.hidden=!picker.hidden;if(!picker.hidden)renderPartyFriendPicker(picker,members)});
  }
  $('party-games').innerHTML='';
  (d.games||[{slug:'solo',title:'Solo games',min:1,max:1},{slug:'party',title:'Party-enabled games',min:2,max:6}]).filter(g=>members.length>=g.min&&members.length<=g.max).forEach(g=>$('party-games').append(item(g.title,g.min+'-'+g.max+' players',[['Select',async()=>{const x=await rpc('party_game',{game_slug:g.slug});status(x.error||'Game selection updated.');loadParty()}]])));
 }
 function renderPartyFriendPicker(picker,members){
  picker.replaceChildren();
  const memberIds=new Set(members.map(m=>String(m.id)));
  const available=cachedFriends.filter(f=>!memberIds.has(String(f.id)));
  if(!available.length){picker.append(empty(cachedFriends.length?'All your friends are already in this party.':'Add friends first, then invite them here.'));return}
  available.forEach(f=>picker.append(item('@'+f.username,presenceLabel(f),[['Invite',async()=>{const x=await rpc('party_invite',{username:f.username});status(x.error||(x.ok?'Party invite sent to @'+f.username+'.':'Could not send invite.'));if(x.ok){picker.replaceChildren(empty('Invite sent to @'+f.username+'.'));await loadParty()}}]])));
 }
 async function loadInvites(){const d=await rpc('party_invites');if(!d.ok||!(d.invites||[]).length)return;const wrap=document.createElement('div');wrap.className='social-list';wrap.append(empty('Party invitations'));d.invites.forEach(i=>wrap.append(item('Invite from @'+i.from,'Join their party',[['Accept',async()=>{const x=await rpc('party_accept',{invite_id:i.id});status(x.error||'Joined party.');loadParty();loadInvites()}]])));$('party-current').prepend(wrap)}
 async function loadChats(){return}
 async function renderConversation(id){return}
 async function openFriendConversation(friendId){if(window.HyperPopOpenChatWithFriend){await window.HyperPopOpenChatWithFriend(friendId);return}status('Chat is still loading. Try again in a moment.')}
 $('friend-search-btn').addEventListener('click',search);$('friend-search').addEventListener('input',scheduleSearch);$('friend-search').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(searchTimer);search()}});
 $('party-create').addEventListener('click',async()=>{const d=await rpc('party_create');status(d.error||'Party created.');loadParty()});
 $('party-leave').addEventListener('click',async()=>{const d=await rpc('party_leave');status(d.error||'You left the party.');loadParty()});

 async function refreshSocialLive(){if(liveRefreshBusy||document.hidden||!token())return;liveRefreshBusy=true;try{await Promise.all([loadFriends(),loadChats()]);if($('friend-search')?.value.trim().length>=2)await search()}finally{liveRefreshBusy=false}}
async function init(){const t=token();if(!t){status('Sign in at Account / Profile to use friends, parties, and chats.');return}const d=await rpc('me');if(!d.ok){status(d.error||'Sign in to continue.');return}me=d.me||null;$('social-profile').textContent=me?'Signed in as @'+me.username+'. Your profile and avatar are managed in Account Settings.':'Account connected.';status('Connected. Loading your social hub…');await Promise.all([loadFriends(),loadParty(),loadChats(),loadInvites()]);}
 init();setInterval(refreshSocialLive,8000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSocialLive()});
})();