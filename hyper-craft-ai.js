/* Hyper-Craft Local AI
 * 100% on-device. No Supabase, Pollinations, APIs, or network calls.
 */
(function(){
  const RECIPES={
  'engine+metal':['⚙️','Machine'],'metal+engine':['⚙️','Machine'],
  'engine+steel':['⚙️','Machine'],'steel+engine':['⚙️','Machine'],
  'moon+earth':['🌙','Night'],'earth+moon':['🌙','Night'],
  'moon+human':['🌙','Night'],'human+moon':['🌙','Night'],
  'night sky+moon':['🌙','Night'],'moon+night sky':['🌙','Night'],
  'animal+life':['🐾','Animal'],'life+animal':['🐾','Animal'],
  'animal+earth':['🐾','Animal'],'earth+animal':['🐾','Animal'],
  'animal+plant':['🐾','Animal'],'plant+animal':['🐾','Animal'],
  'animal+water':['🐟','Fish'],'water+animal':['🐟','Fish'],
  'machine+computer':['🤖','Robot'],'computer+machine':['🤖','Robot'],
  'machine+human':['🤖','Robot'],'human+machine':['🤖','Robot'],
  'machine+electricity':['⚙️','Motor'],'electricity+machine':['⚙️','Motor'],
  'machine+fire':['🚀','Rocket'],'fire+machine':['🚀','Rocket'],
  'machine+car':['🚗','Car'],'car+machine':['🚗','Car'],
  'metal+wood':['🪓','Axe'],'wood+metal':['🪓','Axe'],
  'metal+stone':['🔧','Tool'],'stone+metal':['🔧','Tool'],
  'metal+fire':['🔩','Forge'],'fire+metal':['🔩','Forge'],
  'metal+water':['🦀','Rust'],'water+metal':['🦀','Rust'],
  'human+animal':['🐾','Pet'],'animal+human':['🐾','Pet'],
  'human+life':['🧬','Human'],'life+human':['🧬','Human'],
  'human+house':['🏠','Home'],'house+human':['🏠','Home'],
  'human+city':['🏙️','Citizen'],'city+human':['🏙️','Citizen'],
  'human+computer':['👨‍💻','Programmer'],'computer+human':['👨‍💻','Programmer'],
  'night+sun':['🌅','Day'],'sun+night':['🌅','Day'],
  'night+star':['🌌','Night Sky'],'star+night':['🌌','Night Sky'],
  'night+moon':['🌙','Moon'],'moon+night':['🌙','Moon'],
  'day+sun':['☀️','Daylight'],'sun+day':['☀️','Daylight'],
  'cloud+cloud':['❄️','Snow'],'snow+fire':['💧','Meltwater'],'fire+snow':['💧','Meltwater'],
  'ice+fire':['💧','Meltwater'],'fire+ice':['💧','Meltwater'],
  'water+life':['🐟','Fish'],'life+water':['🐟','Fish'],
  'air+life':['🐦','Bird'],'life+air':['🐦','Bird'],
  'earth+life':['🧑','Human'],'life+earth':['🧑','Human'],
  'life+fire':['🐾','Animal'],'fire+life':['🐾','Animal'],
  'charcoal+earth':['🪨','Coal'],'earth+charcoal':['🪨','Coal'],
  'coal+fire':['🔥','Charcoal'],'fire+coal':['🔥','Charcoal'],
  'coal+crystal':['💎','Diamond'],'crystal+coal':['💎','Diamond'],
  'diamond+metal':['⚔️','Diamond'], 'metal+diamond':['⚔️','Diamond'],
  'bread+fire':['🍞','Toast'],'fire+bread':['🍞','Toast'],
  'food+human':['🍽️','Meal'],'human+food':['🍽️','Meal'],
  'plant+water':['🌿','Algae'],'water+plant':['🌿','Algae'],
  'plant+earth':['🌱','Plant'],'earth+plant':['🌱','Plant'],
  'plant+rain':['🌺','Garden'],'rain+plant':['🌺','Garden'],
  'tree+wood':['🪵','Wood'],'wood+tree':['🪵','Wood'],
  'tree+fire':['🔥','Charcoal'],'fire+tree':['🔥','Charcoal'],
  'house+fire':['🔥','Fireplace'],'fire+house':['🔥','Fireplace'],
  'house+water':['🚿','Plumbing'],'water+house':['🚿','Plumbing'],
  'car+fuel':['🚗','Car'],'fuel+fire':['🔥','Fuel'],
  'rocket+space':['🚀','Spaceship'],'space+rocket':['🚀','Spaceship'],
  'planet+moon':['🌙','Moon'],'moon+planet':['🌙','Moon'],
  'planet+sun':['☀️','Sun'],'sun+planet':['☀️','Sun'],
  'sun+earth':['🌍','World'],'earth+sun':['🌍','World'],
  'star+space':['🌌','Galaxy'],'space+star':['🌌','Galaxy'],
  'rain+sun':['🌈','Rainbow'],'sun+rain':['🌈','Rainbow'],
  'cloud+sun':['🌈','Rainbow'],'sun+cloud':['🌈','Rainbow'],
  'water+sun':['🌈','Rainbow'],'sun+water':['🌈','Rainbow']
};;
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
