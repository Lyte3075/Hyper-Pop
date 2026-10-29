/* Stock Pop page controller. Safe to re-initialize after Hyper-Pop soft navigation. */
(function(){
  function initStockPop(){
    if(!document.getElementById("stats")||!document.getElementById("market"))return;
    const KEY="hyperpop-stock-pop-v1";
    const names=["NovaByte","PixelForge","CloudNine","QuantumFox","RocketRoot","NeonGrid","MoonMint","TurboCore","DreamWare","SparkLabs","OrbitWorks","HyperMesh","BlueNova","PrismAI","EchoTech","VelvetCloud","Firefly","AstroLink","CopperPeak","SilverFox","Sunrise","NightOwl","Rainbyte","StarWorks","Vortex","Luma","ByteBloom","Skyline","Voltix","GreenPeak","CrystalCore","Pulse","BrightBox","IronLeaf","GoldNest","Cinder","AeroArc","DeepWave","FrostByte","WildRoot","Comet","Solaris","LunarLoop","TitanForge","CloudMint","PixelPeak","RapidRay","Zenith","CoreCraft","DataDash","GlowWorks","MagnetIQ","BlueOrbit","Redwood","EverPeak","TinyTitan","MegaMinds","FutureFuel","CircuitTree","DreamDock","AstroMint","CyberSprout","HyperHouse","PrismWorks","EchoPeak","NovaNest","RocketLabs","MoonForge","SkyMint","SparkPeak","QuantumNest","PixelPulse","CloudWorks","OrbitMint","VividCore","NeonPeak","TurboLeaf","LumaLabs","StarMint","BytePeak","SolarByte","NightGrid","RainWorks","VoltNest","CrystalLabs","PulseForge","BrightPeak","IronWorks","GoldByte","CinderLabs","AeroMint","DeepCore","FrostWorks","WildLabs","CometCore","LunarLabs","TitanByte","FutureForge","DataMint","InfinityWorks"];
    const sectors=["Tech","Energy","Robotics","Space","Games","Cloud","AI","Green","Media","Hardware"];
    const stocks=names.map((name,i)=>({name,ticker:"H"+String(i+1).padStart(2,"0"),sector:sectors[i%10],base:Math.round((5+(i%20)*4+(i%7)*7)*100)/100,risk:[0.65,0.9,1.15,1.45,1.8][(i*7+i%3)%5],quality:((i*13+7)%21-10)/100}));
    const FEE_RATE=0.005;
    function fresh(){return{cash:1000,holdings:{},prices:stocks.map(x=>x.base),day:1,selected:0,gameOver:false,sectorMood:sectors.map(()=>0),marketMood:0}}
    function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&typeof x.cash==="number"&&x.holdings&&Array.isArray(x.prices)&&x.prices.length===100){if(!Array.isArray(x.sectorMood)||x.sectorMood.length!==sectors.length)x.sectorMood=sectors.map(()=>0);if(typeof x.marketMood!=="number")x.marketMood=0;if(typeof x.day!=="number")x.day=1;if(typeof x.selected!=="number"||!stocks[x.selected])x.selected=0;if(typeof x.gameOver!=="boolean")x.gameOver=false;return x}}catch(e){}return fresh()}
    let s=load();
    const $=id=>document.getElementById(id);
    const money=n=>"$"+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
    const shares=i=>Number(s.holdings[i]||0);
    const value=i=>Math.max(.01,Number(s.prices[i]||stocks[i].base));
    const portfolio=()=>Object.keys(s.holdings).reduce((t,i)=>t+shares(i)*value(i),0);
    const net=()=>s.cash+portfolio();
    function save(){localStorage.setItem(KEY,JSON.stringify(s))}
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    let audioCtx;
    function tone(freq,duration,type="sine",volume=.045,when=0){
     try{
      audioCtx=audioCtx||new AudioCtx();
      if(audioCtx.state==="suspended")audioCtx.resume();
      const o=audioCtx.createOscillator(),g=audioCtx.createGain(),t=audioCtx.currentTime+when;
      o.type=type;o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
      o.connect(g);g.connect(audioCtx.destination);o.start(t);o.stop(t+duration+.02);
     }catch(e){}
    }
    function uiSound(kind){
     const map={select:[520,.055,"sine"],buy:[420,.08,"triangle"],sell:[300,.09,"triangle"],advance:[680,.07,"sine"],reset:[240,.08,"sawtooth"],error:[150,.12,"square"],click:[560,.045,"sine"]};
     const x=map[kind]||map.click;tone(x[0],x[1],x[2],.04);
     if(kind==="buy"){tone(660,.08,"triangle",.035,.07);tone(880,.12,"sine",.03,.14)}
     if(kind==="sell"){tone(220,.09,"triangle",.035,.07);tone(170,.13,"sine",.025,.15)}
     if(kind==="advance"){tone(820,.07,"sine",.03,.07);tone(1040,.1,"sine",.025,.14)}
    }
    function moneySound(delta){
     if(delta>0){tone(523,.08,"triangle",.045);tone(659,.08,"triangle",.04,.08);tone(784,.13,"sine",.035,.16)}
     else if(delta<0){tone(392,.08,"triangle",.04);tone(294,.1,"triangle",.035,.08);tone(220,.14,"sine",.03,.17)}
    }
    function note(t,bad=false){$("msg").textContent=t;$("msg").style.color=bad?"#ff9aad":"#ffeeb0"}
    function select(i){uiSound("select");s.selected=i;save();render()}
    function buy(){
     if(s.gameOver)return;
     const i=s.selected,q=Math.max(1,Math.floor(Number($("#qty").value)||1));
     const subtotal=q*value(i),fee=subtotal*FEE_RATE,total=subtotal+fee;
     const types=Object.keys(s.holdings).filter(i=>shares(i)>0);
     if(s.cash+0.00001<total){uiSound("error");return note("Not enough cash. Shares cost "+money(subtotal)+" plus a "+(FEE_RATE*100).toFixed(1)+"% trading fee ("+money(fee)+").",true)}
     if(!shares(i)&&types.length>=15){uiSound("error");return note("Portfolio full. You can hold 15 different stocks.",true)}
     s.cash-=total;s.holdings[i]=shares(i)+q;uiSound("buy");moneySound(-total);save();
     note("Bought "+q+" share"+(q===1?"":"s")+" of "+stocks[i].name+". Trading fee: "+money(fee)+".");render()
    }
    function sell(){
     if(s.gameOver)return;
     const i=s.selected,q=Math.max(1,Math.floor(Number($("#qty").value)||1));
     if(shares(i)<q){uiSound("error");return note("You don't own that many shares.",true)}
     const gross=q*value(i),fee=gross*FEE_RATE,proceeds=gross-fee;
     s.cash+=proceeds;s.holdings[i]-=q;if(s.holdings[i]<=0)delete s.holdings[i];
     uiSound("sell");moneySound(proceeds);save();
     note("Sold "+q+" share"+(q===1?"":"s")+" of "+stocks[i].name+". Trading fee: "+money(fee)+".");render()
    }
    function advance(){
     if(s.gameOver){uiSound("error");return}
     let delta=0,eventText="";
     s.marketMood=Math.max(-0.025,Math.min(0.025,s.marketMood*0.72+(Math.random()-.5)*0.008));
     let event=null;const roll=Math.random();
     if(roll<0.035){event={kind:"recession",label:"Market scare",impact:-0.055};s.marketMood-=0.012}
     else if(roll<0.07){event={kind:"rally",label:"Market rally",impact:0.045};s.marketMood+=0.01}
     else if(roll<0.17){const si=Math.floor(Math.random()*sectors.length),impact=(Math.random()<0.5?-1:1)*(0.025+Math.random()*0.035);s.sectorMood[si]=Math.max(-0.07,Math.min(0.07,s.sectorMood[si]+impact));event={kind:"sector",label:sectors[si]+" sector "+(impact>0?"surge":"slump"),sector:si,impact}}
     s.sectorMood=s.sectorMood.map(v=>v*0.88);
     stocks.forEach((x,i)=>{
       const old=value(i),sectorIndex=i%sectors.length;
       const companyNoise=(Math.random()*2-1)*0.035*x.risk;
       const rareNews=Math.random()<0.025?(Math.random()*2-1)*0.10*x.risk:0;
       const drift=x.quality*0.18+s.marketMood+s.sectorMood[sectorIndex]*0.22;
       const pct=Math.max(-0.32,Math.min(0.32,drift+companyNoise+rareNews+(event&&event.kind==="recession"?event.impact*0.65:0)+(event&&event.kind==="rally"?event.impact*0.55:0)+(event&&event.kind==="sector"&&event.sector===sectorIndex?event.impact:0)));
       s.prices[i]=Math.max(0.01,old*(1+pct));if(shares(i))delta+=shares(i)*(s.prices[i]-old)
     });
     s.day++;uiSound("advance");moneySound(delta);save();if(event)eventText=" Event: "+event.label+".";
     if(net()<=0.01){s.gameOver=true;s.cash=0;save();note("💀 BANKRUPT. You lost everything. Reset to play again."+eventText,true)}
     else note((delta>=0?"📈 ":"📉 ")+(delta>=0?"Your holdings gained ":"Your holdings lost ")+money(Math.abs(delta))+" today. Day "+s.day+"."+eventText);
     render()
    }
    function reset(){uiSound("reset");s=fresh();save();note("Fresh portfolio. $1,000 loaded.");render()}
    function render(){const n=net(),p=portfolio(),count=Object.keys(s.holdings).filter(i=>shares(i)>0).length;$("stats").innerHTML='<div class="stat"><small>Cash</small><b class="money">'+money(s.cash)+'</b></div><div class="stat"><small>Invested</small><b>'+money(p)+'</b></div><div class="stat"><small>Net worth · Day '+s.day+'</small><b class="'+(n>=1000?"money":"loss")+'">'+money(n)+'</b></div>';$("selected").textContent=stocks[s.selected].name+" ("+stocks[s.selected].ticker+") · "+money(value(s.selected))+" · "+shares(s.selected)+" owned · "+stocks[s.selected].sector+" · risk "+stocks[s.selected].risk.toFixed(2)+"× volatility · trading fee "+(FEE_RATE*100).toFixed(1)+"%";const q=$("search").value.toLowerCase();$("market").innerHTML=stocks.map((x,i)=>{if(q&&!((x.name+" "+x.ticker+" "+x.sector).toLowerCase().includes(q)))return "";const v=value(i),change=(v/x.base-1)*100;return '<button class="stock '+(i===s.selected?"active":"")+'" data-i="'+i+'"><div><span class="name">'+x.name+'</span> <span class="ticker">'+x.ticker+'</span><div class="sub">'+x.sector+(shares(i)?" · "+shares(i)+" owned":"")+'</div></div><div class="price">'+money(v)+'</div><div class="move '+(change>=0?"up":"down")+'">'+(change>=0?"+":"")+change.toFixed(1)+"%</div></button>"}).join("");document.querySelectorAll(".stock").forEach(b=>b.onclick=()=>select(Number(b.dataset.i)));$("holdings").innerHTML=count?Object.keys(s.holdings).filter(i=>shares(i)>0).map(i=>'<div class="holding"><div><b>'+stocks[i].name+'</b><br><span class="sub">'+shares(i)+' shares × '+money(value(i))+'</span></div><div style="display:flex;align-items:center;gap:8px"><b>'+money(shares(i)*value(i))+'</b><button class="btn red holding-sell" type="button" data-sell="'+i+'" style="padding:7px 9px">Sell</button></div></div>').join(""):'<div class="empty">No stocks yet. Pick one from the market.</div>';document.querySelectorAll(".holding-sell").forEach(b=>b.onclick=()=>{s.selected=Number(b.dataset.sell);$("qty").value=String(shares(s.selected));sell()});$("next").disabled=$("buy").disabled=$("sell").disabled=s.gameOver;document.querySelectorAll(".holding-sell").forEach(b=>b.disabled=s.gameOver)}
    $("buy").onclick=buy;$("sell").onclick=sell;$("next").onclick=advance;$("reset").onclick=reset;$("search").oninput=render;document.addEventListener("click",e=>{const b=e.target.closest("button");if(!b||b.disabled||["buy","sell","next","reset"].includes(b.id)||b.classList.contains("stock")||b.classList.contains("holding-sell"))return;uiSound("click")});render();
    
  }
  if(!window.__HP_STOCK_POP_NAV_BOUND__){
    window.__HP_STOCK_POP_NAV_BOUND__=true;
    window.addEventListener("hyperpop:navigate",initStockPop);
  }
  initStockPop();
})();