const HP_SUPA='https://xkguvpwhfpksaltjdofv.supabase.co';const HP_KEY='sb_publishable_rA4N5-KX3A_ACZHbylEjBw_WvokXs85';
async function hpRpc(fn,args){const r=await fetch(HP_SUPA+'/rest/v1/rpc/'+fn,{method:'POST',headers:{apikey:HP_KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});return r.json()}
function hpToken(){return localStorage.getItem('hyperpop_token')}
async function hpMe(){const t=hpToken();if(!t)return null;const x=await hpRpc('hyperpop_me',{p_token:t});return x?.ok?x:null}
async function hpSubmit(game,score){const t=hpToken();if(!t){alert('Log in to submit your score to the leaderboard!');return false}const x=await hpRpc('hyperpop_submit_score',{p_token:t,p_game:game,p_score:score});if(!x.ok)alert(x.error||'Could not submit score.');return !!x.ok}
async function hpLogout(){const t=hpToken();if(t)await hpRpc('hyperpop_logout',{p_token:t});localStorage.removeItem('hyperpop_token');location.reload()}
async function hpAccountBar(){const nav=document.querySelector('nav');if(!nav)return;const bar=document.createElement('div');bar.className='accountbar';const me=await hpMe();bar.innerHTML=me?'<span class="user">@'+me.username+'</span><a href="leaderboard.html">🏆</a><button onclick="hpLogout()">Log out</button>':'<a href="auth.html">👤 Account</a><a href="leaderboard.html">🏆 Leaderboards</a>';nav.appendChild(bar)}
document.addEventListener('DOMContentLoaded',hpAccountBar);
