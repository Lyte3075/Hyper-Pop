/* Hyper-Craft Local AI
 * 100% on-device. No Supabase, Pollinations, APIs, or network calls.
 * v0.2: semantic reasoning + weighted inference.
 */
(function(){
  const RECIPES={
    'engine+metal':['⚙️','Machine'],'engine+steel':['⚙️','Machine'],
    'moon+earth':['🌙','Night'],'moon+human':['🌙','Night'],'night sky+moon':['🌙','Night'],
    'animal+life':['🐾','Animal'],'animal+earth':['🐾','Animal'],'animal+plant':['🐾','Animal'],
    'animal+water':['🐟','Fish'],'machine+computer':['🤖','Robot'],'machine+human':['🤖','Robot'],
    'machine+electricity':['⚙️','Motor'],'machine+fire':['🚀','Rocket'],'machine+car':['🚗','Car'],
    'metal+wood':['🪓','Axe'],'metal+stone':['🔧','Tool'],'metal+fire':['🔩','Forge'],
    'metal+water':['🦀','Rust'],'human+animal':['🐾','Pet'],'human+life':['🧬','Human'],
    'human+house':['🏠','Home'],'human+city':['🏙️','Citizen'],'human+computer':['👨‍💻','Programmer'],
    'night+sun':['🌅','Day'],'night+star':['🌌','Night Sky'],'night+moon':['🌙','Moon'],
    'day+sun':['☀️','Daylight'],'cloud+cloud':['❄️','Snow'],
    'snow+fire':['💧','Meltwater'],'ice+fire':['💧','Meltwater'],
    'water+life':['🐟','Fish'],'air+life':['🐦','Bird'],'earth+life':['🧑','Human'],
    'life+fire':['🐾','Animal'],'charcoal+earth':['🪨','Coal'],'coal+fire':['🔥','Charcoal'],
    'coal+crystal':['💎','Diamond'],'bread+fire':['🍞','Toast'],'food+human':['🍽️','Meal'],
    'plant+water':['🌿','Algae'],'plant+earth':['🌱','Plant'],'plant+rain':['🌺','Garden'],
    'tree+wood':['🪵','Wood'],'tree+fire':['🔥','Charcoal'],'house+fire':['🔥','Fireplace'],
    'house+water':['🚿','Plumbing'],'car+fuel':['🚗','Car'],'rocket+space':['🚀','Spaceship'],
    'planet+moon':['🌙','Moon'],'planet+sun':['☀️','Sun'],'sun+earth':['🌍','World'],
    'star+space':['🌌','Galaxy'],'rain+sun':['🌈','Rainbow'],'cloud+sun':['🌈','Rainbow'],
    'water+sun':['🌈','Rainbow']
  };

  const aliases={
    people:'human',person:'human',humans:'human',machines:'machine',metals:'metal',
    rocks:'stone',rock:'stone',plants:'plant',trees:'tree',waters:'water',fires:'fire',
    airs:'air',clouds:'cloud',animals:'animal',stars:'star',moons:'moon'
  };

  const K=(name, tags, icon)=>({name,tags,icon});
  const knowledge={
    earth:K('Earth',['nature','material','solid','ground']),
    water:K('Water',['nature','liquid','life','cool']),
    fire:K('Fire',['energy','heat','light','fuel']),
    air:K('Air',['nature','gas','weather']),
    stone:K('Stone',['material','solid','mineral','ground']),
    metal:K('Metal',['material','solid','mineral','conductive','tool']),
    plant:K('Plant',['nature','life','organic','food']),
    life:K('Life',['life','biology','organic']),
    human:K('Human',['life','biology','intelligence','social','creator']),
    animal:K('Animal',['life','biology','organic']),
    cloud:K('Cloud',['weather','water','air']),
    rain:K('Rain',['weather','water','life']),
    snow:K('Snow',['weather','water','cold','solid']),
    ice:K('Ice',['water','cold','solid']),
    tree:K('Tree',['nature','life','wood','organic']),
    wood:K('Wood',['material','nature','organic','fuel']),
    charcoal:K('Charcoal',['material','carbon','fuel']),
    coal:K('Coal',['material','carbon','fuel','energy']),
    crystal:K('Crystal',['mineral','solid','light']),
    diamond:K('Diamond',['mineral','solid','carbon','valuable']),
    electricity:K('Electricity',['energy','conductive','technology']),
    circuit:K('Circuit',['technology','conductive','machine']),
    engine:K('Engine',['machine','technology','energy','mechanical']),
    machine:K('Machine',['technology','metal','mechanical','tool']),
    computer:K('Computer',['technology','intelligence','machine']),
    robot:K('Robot',['technology','intelligence','machine','life']),
    sun:K('Sun',['star','energy','heat','light']),
    moon:K('Moon',['space','rock','night']),
    star:K('Star',['space','energy','light']),
    planet:K('Planet',['space','rock','world']),
    night:K('Night',['time','space','dark']),
    'night sky':K('Night Sky',['space','time','dark','light']),
    day:K('Day',['time','light','energy']),
    house:K('House',['structure','human','shelter']),
    home:K('Home',['structure','human','shelter','social']),
    city:K('City',['structure','human','social']),
    food:K('Food',['life','organic','material']),
    bread:K('Bread',['food','plant','organic']),
    fuel:K('Fuel',['energy','material','burnable']),
    car:K('Car',['machine','transport','metal']),
    rocket:K('Rocket',['machine','transport','space','energy']),
    space:K('Space',['space']),
    galaxy:K('Galaxy',['space','star','energy']),
    rainbow:K('Rainbow',['weather','light','water']),
    tool:K('Tool',['tool','metal','human','machine']),
    forge:K('Forge',['heat','metal','tool','creation']),
    axe:K('Axe',['tool','metal','wood']),
    programmer:K('Programmer',['human','intelligence','technology','creator']),
    builder:K('Builder',['human','creator','tool','structure']),
    citizen:K('Citizen',['human','social','city']),
    pet:K('Pet',['animal','human','life']),
    garden:K('Garden',['plant','life','structure'])
  };

  const rules=[
    {a:['fire','metal'],r:['🔩','Forge'],why:'heat + metal → metalworking',score:90},
    {a:['forge','metal'],r:['🔧','Tool'],why:'forge + metal → toolmaking',score:88},
    {a:['tool','human'],r:['🧱','Builder'],why:'tool + human → builder',score:86},
    {a:['builder','wood'],r:['🏠','House'],why:'builder + wood → structure',score:84},
    {a:['house','human'],r:['🏠','Home'],why:'house + human → home',score:82},
    {a:['home','electricity'],r:['💻','Computer'],why:'home + electricity → technology',score:80},
    {a:['computer','human'],r:['👨‍💻','Programmer'],why:'computer + human → programmer',score:80},
    {a:['programmer','computer'],r:['🤖','Robot'],why:'software + computer → automation',score:78},
    {a:['human','animal'],r:['🐾','Pet'],why:'human + animal → companion',score:76},
    {a:['plant','sun'],r:['🌳','Tree'],why:'plant + sunlight → growth',score:74},
    {a:['tree','water'],r:['🪵','Wood'],why:'tree → wood material',score:72},
    {a:['air','water'],r:['☁️','Cloud'],why:'air + water → weather',score:70},
    {a:['cloud','water'],r:['🌧️','Rain'],why:'cloud + water → precipitation',score:70},
    {a:['rain','sun'],r:['🌈','Rainbow'],why:'rain + light → rainbow',score:70},
    {a:['moon','earth'],r:['🌙','Night'],why:'moon + earth → night',score:70},
    {a:['night','sun'],r:['🌅','Day'],why:'sun + night → day',score:70},
    {a:['metal','electricity'],r:['🔌','Circuit'],why:'metal + electricity → conduction',score:68},
    {a:['engine','metal'],r:['⚙️','Machine'],why:'engine + metal → machine',score:68},
    {a:['machine','computer'],r:['🤖','Robot'],why:'machine + intelligence → robot',score:68},
    {a:['rocket','space'],r:['🚀','Spaceship'],why:'rocket + space → spacecraft',score:66},
    {a:['star','space'],r:['🌌','Galaxy'],why:'stars + space → galaxy',score:64},
    {a:['coal','fire'],r:['🔥','Charcoal'],why:'coal + heat → charcoal',score:64},
    {a:['charcoal','earth'],r:['🪨','Coal'],why:'carbon material → coal',score:62}
  ];

  const normalize=v=>{
    let n=String(v||'').trim().toLowerCase();
    return aliases[n]||n;
  };
  const key=(a,b)=>[normalize(a),normalize(b)].sort().join('+');
  const has=(a,b,x)=>a===x||b===x;

  function scoreSemantic(a,b){
    const A=knowledge[a],B=knowledge[b];
    if(!A||!B)return null;
    const shared=A.tags.filter(t=>B.tags.includes(t));
    const both=(x,y)=>has(a,b,x)&&has(a,b,y);
    const candidates=[];

    if(both('fire','wood'))candidates.push({s:48,r:['🔥','Charcoal'],why:'heat + organic fuel'});
    if(both('water','cold'))candidates.push({s:46,r:['❄️','Ice'],why:'water + cold'});
    if(both('plant','life'))candidates.push({s:42,r:['🌱','Plant'],why:'living organic matter'});
    if(both('metal','tool'))candidates.push({s:44,r:['🔧','Tool'],why:'metal + toolmaking'});
    if(both('machine','energy'))candidates.push({s:43,r:['⚙️','Engine'],why:'machine + energy'});
    if(both('space','rock'))candidates.push({s:40,r:['🪐','Planet'],why:'rock + space'});
    if(both('space','light'))candidates.push({s:39,r:['⭐','Star'],why:'light + space'});
    if(both('weather','water'))candidates.push({s:38,r:['🌧️','Rain'],why:'weather + water'});
    if(both('human','structure'))candidates.push({s:37,r:['🏠','Home'],why:'human + structure'});
    if(both('human','technology'))candidates.push({s:37,r:['💻','Computer'],why:'human + technology'});
    if(shared.length>=2){
      if(shared.includes('energy')&&shared.includes('conductive'))candidates.push({s:35,r:['🔌','Circuit'],why:'energy + conduction'});
      if(shared.includes('life')&&shared.includes('organic'))candidates.push({s:34,r:['🍎','Food'],why:'living organic matter'});
      if(shared.includes('space')&&shared.includes('energy'))candidates.push({s:33,r:['🌌','Galaxy'],why:'space + energy'});
      if(shared.includes('material')&&shared.includes('solid'))candidates.push({s:25,r:['🧱','Material'],why:'shared physical properties'});
    }
    candidates.sort((x,y)=>y.s-x.s);
    return candidates[0]||null;
  }

  function localAI(a,b){
    const n1=normalize(a&&a.name),n2=normalize(b&&b.name);
    const direct=RECIPES[key(n1,n2)];
    if(direct)return {icon:direct[0],name:direct[1],note:'Local AI • learned recipe',recipe:[a&&a.name,b&&b.name]};

    const exact=rules.find(rule=>{
      const wanted=rule.a.slice().sort().join('+');
      return wanted===key(n1,n2);
    });
    if(exact)return {icon:exact.r[0],name:exact.r[1],note:'Local AI • '+exact.why,recipe:[a&&a.name,b&&b.name]};

    const inferred=scoreSemantic(n1,n2);
    if(inferred && inferred.s>=32)
      return {icon:inferred.r[0],name:inferred.r[1],note:'Local AI • '+inferred.why,recipe:[a&&a.name,b&&b.name]};

    // Broader local synthesis. These are intentionally conservative combinations,
    // but they greatly reduce dead ends without inventing random nonsense.
    const A=knowledge[n1],B=knowledge[n2];
    if(A&&B){
      const tags=new Set([...A.tags,...B.tags]);
      const both=(x,y)=>tags.has(x)&&tags.has(y);
      const synth=[
        [both('heat','material'),['🧱','Ceramic'],'heat + material → fired material',31],
        [both('water','solid'),['🧊','Ice'],'water + solid → frozen material',31],
        [both('water','organic'),['🌿','Plant Matter'],'water + organic matter → plant matter',30],
        [both('life','food'),['🍎','Food'],'life + food → nourishment',30],
        [both('metal','wood'),['🛠️','Tool'],'metal + wood → toolmaking',30],
        [both('metal','machine'),['⚙️','Machine'],'metal + machine → mechanism',30],
        [both('energy','machine'),['⚙️','Engine'],'energy + machine → power',30],
        [both('technology','conductive'),['🔌','Circuit'],'technology + conduction → circuit',30],
        [both('space','rock'),['🪐','Planet'],'space + rock → planetary body',30],
        [both('space','light'),['⭐','Star'],'space + light → star',30],
        [both('weather','air'),['🌬️','Wind'],'weather + air → wind',29],
        [both('weather','water'),['🌧️','Rain'],'weather + water → precipitation',29],
        [both('nature','life'),['🌱','Growth'],'nature + life → growth',28],
        [both('human','creator'),['🛠️','Maker'],'human + creator → maker',28],
        [both('human','social'),['🏙️','Community'],'human + social → community',28],
        [both('structure','shelter'),['🏠','Building'],'structure + shelter → building',28],
        [both('light','dark'),['🌗','Eclipse'],'light + dark → eclipse',28],
        [both('time','space'),['🌀','Space-Time'],'time + space → space-time',28],
        [both('energy','light'),['💡','Light'],'energy + light → light',27],
        [both('organic','material'),['🍎','Food'],'organic material → food',27],
        [both('mineral','solid'),['💎','Mineral'],'mineral + solid → mineral',26]
      ];
      const usable=synth.filter(x=>x[0]).sort((x,y)=>y[3]-x[3]);
      if(usable.length){
        const pick=usable[0];
        return {icon:pick[1][0],name:pick[1][1],note:'Local AI • '+pick[2],recipe:[a&&a.name,b&&b.name]};
      }
    }

    // Last-resort synthesis still has a semantic basis. It is preferable to
    // a dead end, but avoids claiming that unrelated objects have a real recipe.
    const fallback=[
      [A&&A.tags.includes('food')&&B&&B.tags.includes('food'),['🍽️','Meal'],'food + food → meal'],
      [A&&A.tags.includes('life')&&B&&B.tags.includes('life'),['🌱','Life Form'],'life + life → life form'],
      [A&&A.tags.includes('material')&&B&&B.tags.includes('material'),['🧱','Material'],'material + material → composite material'],
      [A&&A.tags.includes('energy')&&B&&B.tags.includes('energy'),['⚡','Energy'],'energy + energy → concentrated energy'],
      [A&&A.tags.includes('nature')&&B&&B.tags.includes('nature'),['🌿','Nature'],'nature + nature → natural system']
    ].filter(x=>x[0]);
    if(fallback.length){
      const f=fallback[0];
      return {icon:f[1][0],name:f[1][1],note:'Local AI • '+f[2],recipe:[a&&a.name,b&&b.name]};
    }

    return null;
  }

  window.HyperCraftLocalAI={
    combine:localAI,
    version:'0.3-generative-semantic',
    capabilities:['recipes','aliases','semantic-tags','weighted-rules','local-inference']
  };
})();