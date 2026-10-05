/* Hyper-Craft Local AI
 * 100% on-device. No Supabase, Pollinations, APIs, or network calls.
 */
(function(){
  const RECIPES=;
  const aliases={
    'people':'human','person':'human','humans':'human','machines':'machine','metals':'metal',
    'rocks':'stone','rock':'stone','plants':'plant','trees':'tree','waters':'water','fires':'fire',
    'airs':'air','clouds':'cloud','animals':'animal','stars':'star','moons':'moon'
  };
  const normalize=v=>{let n=String(v||'').trim().toLowerCase();return aliases[n]||n};
  const key=(a,b)=>[normalize(a),normalize(b)].sort().join('+');
  const tags={
    earth:['nature','material','solid'], water:['nature','liquid'], fire:['energy','heat'], air:['nature','gas'],
    stone:['material','solid','mineral'], metal:['material','solid','conductive'], plant:['nature','life'],
    life:['life','biology'], human:['life','biology','intelligence'], animal:['life','biology'],
    cloud:['weather','water','air'], rain:['weather','water'], snow:['weather','water','cold'], ice:['water','solid','cold'],
    tree:['nature','life','wood'], wood:['material','nature'], charcoal:['material','carbon'], coal:['material','carbon','energy'],
    crystal:['mineral','solid'], diamond:['mineral','solid','carbon'], electricity:['energy','conductive'],
    circuit:['technology','conductive'], engine:['machine','technology','energy'], machine:['technology','metal'],
    computer:['technology','intelligence'], robot:['technology','intelligence'], sun:['star','energy','heat'],
    moon:['space','rock'], star:['space','energy'], planet:['space','rock'], night:['time','space'],
    'night sky':['space','time'], day:['time','energy'], house:['structure'], city:['structure','human'],
    food:['life','material'], bread:['food','plant'], fuel:['energy','material'], car:['machine','transport'],
    rocket:['machine','transport','space'], space:['space'], galaxy:['space'], rainbow:['weather','light']
  };
  function localAI(a,b){
    const n1=normalize(a&&a.name),n2=normalize(b&&b.name),direct=RECIPES[key(n1,n2)];
    if(direct)return {icon:direct[0],name:direct[1],note:'Local AI • on-device'};
    const t1=tags[n1]||[],t2=tags[n2]||[],shared=t1.filter(x=>t2.includes(x));
    const has=(x)=>n1===x||n2===x;
    const result =
      (has('life')&&has('fire')&&['🐾','Animal']) ||
      (has('human')&&has('animal')&&['🐾','Pet']) ||
      (has('engine')&&has('metal')&&['⚙️','Machine']) ||
      (has('machine')&&has('computer')&&['🤖','Robot']) ||
      (has('metal')&&has('electricity')&&['🔌','Circuit']) ||
      (has('plant')&&has('sun')&&['🌳','Tree']) ||
      (has('tree')&&has('water')&&['🪵','Wood']) ||
      (has('water')&&has('cloud')&&['🌧️','Rain']) ||
      (has('air')&&has('water')&&['☁️','Cloud']) ||
      (has('moon')&&has('earth')&&['🌙','Night']) ||
      (has('night')&&has('sun')&&['🌅','Day']) ||
      (has('rain')&&has('sun')&&['🌈','Rainbow']) ||
      (has('cloud')&&has('sun')&&['🌈','Rainbow']);
    if(result)return {icon:result[0],name:result[1],note:'Local AI • on-device'};
    if(shared.length>=2){
      if(shared.includes('weather')&&shared.includes('water'))return {icon:'🌧️',name:'Rain',note:'Local AI • inferred locally'};
      if(shared.includes('space')&&shared.includes('energy'))return {icon:'🌌',name:'Galaxy',note:'Local AI • inferred locally'};
      if(shared.includes('material')&&shared.includes('solid'))return {icon:'🧱',name:'Material',note:'Local AI • inferred locally'};
    }
    return null;
  }
  window.HyperCraftLocalAI={combine:localAI,version:'0.1-local'};
})();
