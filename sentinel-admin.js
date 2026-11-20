(function(){
const S='https://iapnejlttsqqefkpmelp.supabase.co',K='sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM',$=x=>document.getElementById(x),token=()=>localStorage.getItem('hyperpop_token')||'';
let data={bans:[],devices:[],appeals:[],events:[]},accounts=[],tab='bans',searchTimer;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function status(t,bad=false){$('status').textContent=t;$('status').style.color=bad?'#ff8990':'#9ce7c1'}
async function api(x){const r=await fetch(S+'/functions/v1/hyperpop-sentinel',{method:'POST',headers:{apikey:K,'Content-Type':'application/json'},body:JSON.stringify({...x,token:token(),device_key:window.HyperPopSentinel?.deviceKey?.()||''})});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Request failed');return d}
function render(){
 $('device-count').textContent=data.devices.length;$('ban-count').textContent=data.bans.filter(x=>!x.revoked_at&&(!x.expires_at||new Date(x.expires_at)>new Date())).length;$('appeal-count').textContent=data.appeals.filter(x=>x.status==='pending').length;$('account-count').textContent=accounts.length;
 $('account-search').classList.toggle('sentinel-hidden',tab!=='accounts');
 let rows=[];
 if(tab==='bans')rows=data.bans.map(x=>'<tr><td>'+esc(x.scope)+'<br><small>'+esc(x.hyperpop_accounts?.username||x.device_id||x.network_ip||x.account_id||'—')+'</small></td><td>'+esc(x.reason)+'</td><td>'+esc(x.duration)+'</td><td>'+esc(x.revoked_at?'Revoked':x.expires_at&&new Date(x.expires_at)<new Date()?'Expired':'Active')+'</td><td>'+(x.revoked_at?'':'<button data-revoke="'+esc(x.id)+'">Revoke</button>')+'</td></tr>');
 if(tab==='accounts')rows=accounts.map(x=>'<tr><td><strong>'+esc(x.username)+'</strong>'+(x.display_name?'<br><small>'+esc(x.display_name)+'</small>':'')+'</td><td>'+esc(new Date(x.created_at).toLocaleDateString())+'</td><td>'+esc(x.device_count||0)+' linked devices</td><td><button data-ban-account="'+esc(x.username)+'">Select for ban</button></td></tr>');
 if(tab==='devices')rows=data.devices.map(x=>{const info=x.device_info||{},linked=(x.linked_accounts||[]).map(a=>esc(a.username)).join(', ')||'No signed-in account linked';return '<tr><td><code>'+esc(x.device_key)+'</code><br><small>'+esc(linked)+'</small><br><button data-copy="'+esc(x.device_key)+'">Copy ID</button> <button data-ban-device="'+esc(x.device_key)+'">Ban device</button></td><td>'+esc(x.first_seen_at)+'<br><small>Last: '+esc(x.last_seen_at)+'</small></td><td>'+esc(x.last_ip||'Unknown')+'</td><td>'+esc(info.platform||'Unknown platform')+'<br>'+esc(info.vendor||'')+'<br><small>'+esc(info.user_agent||x.user_agent||'')+'</small></td><td>'+esc(info.screen_width&&info.screen_height?info.screen_width+' × '+info.screen_height:'Unknown')+'<br><small>Viewport '+esc(info.viewport_width||'?')+' × '+esc(info.viewport_height||'?')+' · DPR '+esc(info.pixel_ratio||'?')+'</small></td><td>'+esc(info.language||'')+'<br><small>'+esc(info.timezone||'')+' · '+esc(info.hardware_concurrency||'?')+' CPU threads · '+esc(info.device_memory||'?')+' GB RAM hint</small></td></tr>'});
 if(tab==='appeals')rows=data.appeals.map(x=>'<tr><td>'+esc(x.hyperpop_accounts?.username||'Guest')+'</td><td>'+esc(x.message)+'</td><td>'+esc(x.status)+'</td><td>'+(x.status==='pending'?'<button data-review="'+esc(x.id)+'" data-status="approved">Approve</button> <button data-review="'+esc(x.id)+'" data-status="denied">Deny</button>':'')+'</td></tr>');
 if(tab==='events')rows=data.events.map(x=>'<tr><td>'+esc(x.created_at)+'</td><td>'+esc(x.event_type)+'</td><td><code>'+esc(JSON.stringify(x.details))+'</code></td></tr>');
 $('table-area').innerHTML=rows.length?'<table><tbody>'+rows.join('')+'</tbody></table>':'Nothing to show yet.';
}
async function loadAccounts(q=''){const d=await api({action:'accounts',search:q});accounts=d.accounts||[];render()}
async function refresh(){try{data=await api({action:'overview'});accounts=data.accounts||[];render();status('Sentinel connected. Administrator access verified.')}catch(e){status(e.message,true)}}
$('scope').onchange=()=>{let s=$('scope').value;$('username-wrap').classList.toggle('sentinel-hidden',!['account','account_device','full'].includes(s));$('device-wrap').classList.toggle('sentinel-hidden',s!=='device');$('ip-wrap').classList.toggle('sentinel-hidden',s!=='network')};
$('device-ban-mode').onclick=()=>{$('scope').value='device';$('scope').dispatchEvent(new Event('change'));$('issue-msg').textContent='Device-ban mode selected. Choose a registered device in the Devices tab, or paste its device key.';$('target-device').focus();};
$('issue').onclick=async()=>{try{let d=await api({action:'issue',scope:$('scope').value,duration:$('duration').value,reason:$('reason').value,username:$('username').value,target_device_key:$('target-device').value,network_ip:$('target-ip').value});$('issue-msg').textContent='Issued '+d.bans.length+' ban record(s).';await refresh()}catch(e){$('issue-msg').textContent=e.message}};
$('refresh').onclick=refresh;
document.querySelectorAll('[data-tab]').forEach(x=>x.onclick=()=>{tab=x.dataset.tab;render();if(tab==='accounts')loadAccounts($('account-search').value).catch(e=>status(e.message,true))});
$('account-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>loadAccounts($('account-search').value).catch(e=>status(e.message,true)),220)});
$('table-area').onclick=async e=>{
 const r=e.target.closest('[data-revoke]'),v=e.target.closest('[data-review]'),c=e.target.closest('[data-copy]'),ba=e.target.closest('[data-ban-account]'),bd=e.target.closest('[data-ban-device]');
 try{
  if(r){await api({action:'revoke',ban_id:r.dataset.revoke});await refresh()}
  if(v){await api({action:'review_appeal',appeal_id:v.dataset.review,status:v.dataset.status});await refresh()}
  if(c)await navigator.clipboard.writeText(c.dataset.copy);
  if(ba){$('scope').value='account';$('scope').dispatchEvent(new Event('change'));$('username').value=ba.dataset.banAccount;window.scrollTo({top:0,behavior:'smooth'});$('issue-msg').textContent='Selected @'+ba.dataset.banAccount+'. Choose a duration and issue the ban.'}
  if(bd){$('scope').value='device';$('scope').dispatchEvent(new Event('change'));$('target-device').value=bd.dataset.banDevice;window.scrollTo({top:0,behavior:'smooth'});$('issue-msg').textContent='Device selected. Choose a duration and issue the device ban.'}
 }catch(x){status(x.message,true)}
};
$('submit-appeal').onclick=async()=>{try{await api({action:'appeal',ban_id:$('appeal-ban').value,message:$('appeal-message').value});$('appeal-msg').textContent='Appeal submitted.'}catch(e){$('appeal-msg').textContent=e.message}};
refresh();
})();