/* Hyper-Pop 1-to-1 voice calls. WebRTC carries audio; the Edge Function only relays signaling. */
(function(){
 if(window.__HP_VOICE_CALLS__)return;window.__HP_VOICE_CALLS__=true;
 const API='https://iapnejlttsqqefkpmelp.supabase.co/functions/v1/hyperpop-voice';
 const KEY='sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM';
 const $=id=>document.getElementById(id);
 let call=null,pc=null,stream=null,muted=false,pollTimer=null,inboxTimer=null,remoteCallerIce=0,remoteCalleeIce=0,remoteDescriptionReady=false,ending=false;
 const css=`
 #hp-chat-call{border:1px solid #7df9ff55;background:#123039;color:#9ffaff;border-radius:9px;padding:6px 10px;font-weight:800;cursor:pointer}
 #hp-voice-panel{display:none;padding:10px 12px;border-bottom:1px solid #ffffff18;background:linear-gradient(100deg,#10232a,#171729);color:#f7f4ff}
 #hp-voice-panel.open{display:block}
 #hp-voice-title{font-size:13px;font-weight:850;margin-bottom:3px}
 #hp-voice-status{color:#a8dfe2;font-size:11px;min-height:17px;margin-bottom:8px}
 #hp-voice-actions{display:flex;gap:7px;flex-wrap:wrap}
 #hp-voice-actions button{border:1px solid #ffffff24;border-radius:9px;padding:7px 11px;background:#ffffff10;color:#fff;font-weight:750;cursor:pointer}
 #hp-voice-accept{background:#146c55!important;border-color:#2de0a1!important}
 #hp-voice-hang{background:#9b3347!important;border-color:#ff718a!important}
 #hp-voice-audio{display:none}
 `;
 const style=document.createElement('style');style.textContent=css;document.head.append(style);
 const panel=document.createElement('div');panel.id='hp-voice-panel';panel.innerHTML='<div id="hp-voice-title">Voice call</div><div id="hp-voice-status" role="status">Ready</div><div id="hp-voice-actions"></div><audio id="hp-voice-audio" autoplay playsinline></audio>';
 function mountPanel(){const win=$('hp-chat-window'),pickers=$('hp-chat-pickers');if(win&&pickers&&panel.parentElement!==win)win.insertBefore(panel,pickers)}
 mountPanel();
 function status(s){const n=$('hp-voice-status');if(n)n.textContent=s}
 function show(title,s,buttons){const win=$('hp-chat-window'),launch=$('hp-chat-launch');if(win){win.classList.add('open');if(launch)launch.style.display='none'}$('hp-voice-title').textContent=title;status(s);const a=$('hp-voice-actions');a.replaceChildren();buttons.forEach(([label,id,fn])=>{const b=document.createElement('button');b.id=id;b.textContent=label;b.addEventListener('click',fn);a.append(b)});panel.classList.add('open')}
 function hide(){panel.classList.remove('open')}
 async function request(action,data={}){
  const token=localStorage.getItem('hyperpop_token');if(!token)throw new Error('Sign in to use voice calls.');
  const r=await fetch(API,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({token,action,...data})});
  const d=await r.json().catch(()=>({}));if(!r.ok||!d.ok)throw new Error(d.error||'Voice call request failed.');return d;
 }
 function cleanup(){
  ending=true;clearInterval(pollTimer);pollTimer=null;
  if(pc){pc.onicecandidate=null;pc.ontrack=null;pc.onconnectionstatechange=null;pc.close();pc=null}
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  $('hp-voice-audio').srcObject=null;call=null;muted=false;remoteCallerIce=0;remoteCalleeIce=0;remoteDescriptionReady=false;
  setTimeout(()=>{ending=false},0);
 }
 async function mediaAndPeer(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone access is unavailable in this browser. Open Hyper-Pop over HTTPS in Safari or a supported browser.');
  stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
  stream.getTracks().forEach(t=>pc.addTrack(t,stream));
  pc.ontrack=e=>{const audio=$('hp-voice-audio');audio.srcObject=e.streams[0];audio.play().catch(()=>status('Tap the page once to enable call audio.'))};
  pc.onicecandidate=e=>{if(e.candidate&&call)request('ice',{call_id:call.id,candidate:e.candidate.toJSON()}).catch(err=>status(err.message))};
  pc.onconnectionstatechange=()=>{if(!pc)return;const s=pc.connectionState;if(s==='connected')status('Connected · microphone live');else if(s==='connecting')status('Connecting audio…');else if(s==='failed')status('Connection failed. This network may require a TURN relay.');else if(s==='disconnected')status('Connection interrupted…')};
 }
 async function startCall(friendId,friendName){
  if(call)return;try{
   show('Calling '+friendName,'Requesting microphone access…',[['Cancel','hp-voice-hang',hangup]]);
   await mediaAndPeer();
   const d=await request('start',{to:friendId});call={...d.call,caller_id:true};
   const offer=await pc.createOffer();await pc.setLocalDescription(offer);
   await request('offer',{call_id:call.id,description:pc.localDescription.toJSON()});
   show('Calling '+friendName,'Ringing…',[['Cancel call','hp-voice-hang',hangup]]);
   beginPolling();
  }catch(e){cleanup();show('Could not start call',e.message,[['Close','hp-voice-close',hide]])}
 }
 async function acceptCall(c){
  if(pc)return;try{
   call={id:c.id,caller_id:false,peer:c.caller_id};
   show('Incoming voice call','Connecting microphone…',[['Decline','hp-voice-hang',decline]]);
   await mediaAndPeer();await request('accept',{call_id:call.id});
   show('Voice call','Joining call…',[['Mute','hp-voice-mute',toggleMute],['Hang up','hp-voice-hang',hangup]]);
   beginPolling();
  }catch(e){await request('decline',{call_id:c.id}).catch(()=>{});cleanup();show('Could not answer',e.message,[['Close','hp-voice-close',hide]])}
 }
 async function decline(){if(call)await request('decline',{call_id:call.id}).catch(()=>{});cleanup();hide()}
 async function hangup(){if(call)await request('hangup',{call_id:call.id}).catch(()=>{});cleanup();hide()}
 function toggleMute(){if(!stream)return;muted=!muted;stream.getAudioTracks().forEach(t=>t.enabled=!muted);const b=$('hp-voice-mute');if(b)b.textContent=muted?'Unmute':'Mute'}
 async function processCall(c){
  if(!call||!pc)return;
  if(['declined','ended','missed'].includes(c.status)){const msg=c.status==='declined'?'Call declined.':c.status==='missed'?'Call timed out.':'Call ended.';cleanup();show('Voice call',msg,[['Close','hp-voice-close',hide]]);return}
  if(!call.caller_id&&c.offer&&!pc.remoteDescription){await pc.setRemoteDescription(c.offer);remoteDescriptionReady=true;const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await request('answer',{call_id:call.id,description:pc.localDescription.toJSON()})}
  if(c.answer&&!pc.remoteDescription&&call.caller_id){await pc.setRemoteDescription(c.answer);remoteDescriptionReady=true}
  if(remoteDescriptionReady){
   const remote=call.caller_id?c.callee_ice:c.caller_ice;let index=call.caller_id?remoteCalleeIce:remoteCallerIce;
   for(;index<(remote||[]).length;index++){try{await pc.addIceCandidate(remote[index])}catch(e){console.warn('[Hyper-Pop voice] ICE candidate skipped',e)}}
   if(call.caller_id)remoteCalleeIce=index;else remoteCallerIce=index;
  }
 }
 function beginPolling(){clearInterval(pollTimer);pollTimer=setInterval(async()=>{if(!call||!pc)return;try{const d=await request('poll',{call_id:call.id});await processCall(d.call)}catch(e){status(e.message)}},1000)}
 async function checkInbox(){
  if(!localStorage.getItem('hyperpop_token'))return;
  if(call&&!pc){
   try{const d=await request('poll',{call_id:call.id});if(['declined','ended','missed'].includes(d.call.status)){cleanup();show('Voice call',d.call.status==='missed'?'Missed call.':'Call ended.',[['Close','hp-voice-close',hide]])}}
   catch(_){cleanup();hide()}
   return;
  }
  if(call)return;
  try{const d=await request('inbox');const incoming=d.calls?.[0];if(!incoming)return;call={id:incoming.id,caller_id:false,peer:incoming.caller_id};show('Incoming voice call','Someone is calling you…',[['Decline','hp-voice-hang',decline],['Accept','hp-voice-accept',()=>acceptCall(incoming)]]);}catch(_){}
 }
 function installButton(){
  const head=$('hp-chat-head');if(!head||$('hp-chat-call'))return false;
  const b=document.createElement('button');b.id='hp-chat-call';b.type='button';b.textContent='☎ Call';b.title='Call selected friend';b.addEventListener('click',()=>{
   const select=$('hp-chat-friends'),id=select?.value,option=select?.selectedOptions?.[0];
   if(!id){status('Choose a friend in “New message…” first.');show('Voice call','Choose a friend in the chat menu first.',[['Close','hp-voice-close',hide]]);return}
   startCall(id,option.textContent.replace(/ · online$/,''));
  });head.insertBefore(b,head.querySelector('#hp-chat-close'));
  return true;
 }
 const observer=new MutationObserver(()=>{installButton();mountPanel()});observer.observe(document.documentElement,{childList:true,subtree:true});installButton();mountPanel();
 window.HyperPopVoiceCall={start:(id,name)=>startCall(id,name||'Friend')};
 inboxTimer=setInterval(checkInbox,2500);checkInbox();
 window.addEventListener('beforeunload',()=>{if(call)request('hangup',{call_id:call.id}).catch(()=>{});cleanup()});
})();
