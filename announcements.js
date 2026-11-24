(function(){
  const API='https://iapnejlttsqqefkpmelp.supabase.co/functions/v1/hyperpop-announcements';
  const KEY='sb_publishable_TB7oC4nDlUJq-Gcb2yoTjQ_Dvbh6NlM';
  const host=document.getElementById('hp-announcements');
  if(!host)return;
  const date=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Date unavailable'};
  function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el}
  async function load(){
    try{
      const r=await fetch(API,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({action:'list'}),cache:'no-store'});
      const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||'Could not load announcements.');
      host.replaceChildren();
      if(!data.announcements.length){host.hidden=true;return}
      host.hidden=false;
      const section=node('section','hp-announcement-section');
      const heading=node('div','hp-announcement-heading');
      heading.append(node('span','hp-announcement-kicker','HYPER-POP / BULLETIN'),node('h2','','📣 Announcements'));
      section.append(heading);
      data.announcements.forEach(item=>{
        const card=node('article','hp-announcement-card');
        const top=node('div','hp-announcement-top');
        const author=node('div','hp-announcement-author');
        author.append(node('span','hp-announcement-avatar',(item.author||'H').trim().charAt(0).toUpperCase()),node('span','',item.author||'Hyper-Pop'));
        top.append(author,node('span','hp-announcement-date','Shown '+date(item.show_at)));
        card.append(top,node('h3','hp-announcement-title',item.title));
        const body=node('p','hp-announcement-text');body.textContent=item.text;card.append(body);
        card.append(node('div','hp-announcement-posted','Posted '+date(item.created_at)));
        section.append(card);
      });
      host.append(section);
    }catch(error){console.warn('[Hyper-Pop announcements]',error);host.hidden=true}
  }
  load();
  window.addEventListener('hyperpop:navigate',load);
})();