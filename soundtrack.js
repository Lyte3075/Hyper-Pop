/* Hyper-Pop Dreamscape Sound System
 * Original procedural soundtrack engine. No external dependencies or audio files.
 * Browsers may block autoplay; if so, the draggable music orb invites one tap to start.
 */
(() => {
  "use strict";
  if (window.__HYPER_POP_SOUNDTRACK__) return;
  window.__HYPER_POP_SOUNDTRACK__ = true;

  const STORE = "hyper-pop-soundtrack-v2";
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const excluded = /\/(?:duck|korona|cherri|v5-static|UW|yt2|package|emulator|scramjet-static)(?:\/|$)/i;
  if (excluded.test(location.pathname)) return;

  const page = location.pathname.toLowerCase();
  const getPageTheme = () => {
    if (/dont|do-not-press/.test(page)) return "danger";
    if (/random|surprise/.test(page)) return "surprise";
    if (/leaderboard|account|accounts|auth|profile/.test(page)) return "menu";
    if (/memory/.test(page)) return "memory";
    if (/number|math|calc/.test(page)) return "puzzle";
    if (/reaction|aim|clicker|sheep|game|craft|maze|stock|pop/.test(page)) return "arcade";
    if (/proxy|browser|search/.test(page)) return "explore";
    if (/tool|terminal|recipe|settings/.test(page)) return "tools";
    return "dreamscape";
  };

  let ctx, master, musicBus, fxBus, enabled = false, playerOpen = false;
  let volume = 0.2, scheduler = null, nextStepTime = 0, step = 0, chordIndex = -1;
  let theme = getPageTheme(), eventName = "Dreamscape", currentNodes = [];
  let drag = null, movedOrb = false, lastEventAt = 0, switchTimer = null;
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "{}");
    if (Number.isFinite(saved.volume)) volume = Math.max(0, Math.min(0.5, saved.volume));
    playerOpen = saved.open === true;
  } catch (_) {}

  const progression = {
    dreamscape: [[261.63,329.63,392,493.88],[220,261.63,329.63,392],[174.61,220,261.63,329.63],[196,246.94,293.66,392]],
    explore: [[220,277.18,329.63,415.3],[164.81,220,277.18,329.63],[196,246.94,293.66,392],[174.61,220,261.63,349.23]],
    tools: [[246.94,311.13,369.99,440],[196,246.94,293.66,369.99],[220,277.18,329.63,415.3],[164.81,220,261.63,329.63]],
    menu: [[261.63,329.63,392,523.25],[196,261.63,329.63,392],[220,293.66,349.23,440],[174.61,261.63,329.63,392]],
    arcade: [[261.63,329.63,392,493.88],[196,246.94,392,493.88],[220,329.63,392,523.25],[174.61,261.63,349.23,440]],
    puzzle: [[220,261.63,329.63,392],[246.94,293.66,369.99,440],[196,246.94,329.63,392],[174.61,220,293.66,349.23]],
    memory: [[261.63,329.63,392,493.88],[220,261.63,329.63,392],[246.94,311.13,369.99,440],[196,246.94,293.66,392]],
    surprise: [[293.66,369.99,440,587.33],[220,277.18,329.63,440],[261.63,329.63,392,523.25],[196,246.94,329.63,392]],
    danger: [[164.81,196,246.94,293.66],[146.83,174.61,220,261.63],[164.81,207.65,246.94,311.13],[130.81,196,233.08,293.66]]
  };
  const tracks = {
    dreamscape:{bpm:76,wave:"sine",motif:[0,2,4,7,4,2,1,4,7,4,2,5,4,2,0,2],extra:4,filter:2300},
    explore:{bpm:94,wave:"triangle",motif:[0,2,3,5,7,5,3,2,4,5,7,8,7,5,2,3],extra:2,filter:3200},
    tools:{bpm:82,wave:"sine",motif:[0,3,1,4,2,5,3,6,4,2,5,1,3,0,4,2],extra:6,filter:1700},
    menu:{bpm:68,wave:"sine",motif:[0,4,2,7,5,2,4,8,7,4,2,5,8,4,2,0],extra:3,filter:2800},
    arcade:{bpm:118,wave:"square",motif:[0,2,4,2,5,4,7,5,0,2,5,7,8,7,5,2],extra:1,filter:1500},
    puzzle:{bpm:58,wave:"triangle",motif:[0,2,5,4,1,3,6,4,2,5,3,1,4,6,3,2],extra:8,filter:1400},
    memory:{bpm:72,wave:"sine",motif:[0,3,5,7,5,3,2,4,6,4,2,1,3,5,4,2],extra:5,filter:1900},
    surprise:{bpm:104,wave:"triangle",motif:[0,4,7,3,8,5,2,6,1,7,4,8,3,6,2,5],extra:2,filter:3500},
    danger:{bpm:88,wave:"sawtooth",motif:[0,1,4,2,0,5,3,1,6,4,2,0,3,5,1,2],extra:2,filter:1100}
  };
  const scale = [0,2,4,7,9,12,14,16,19];

  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify({volume, open:playerOpen})); } catch (_) {}
  }
  function initAudio() {
    if (ctx) return;
    ctx = new AudioContextClass();
    master = ctx.createGain();
    master.gain.value = 0;
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.82;
    fxBus = ctx.createGain();
    fxBus.gain.value = 0.65;
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 2600;
    musicBus.connect(warmth);
    warmth.connect(master);
    fxBus.connect(master);
    master.connect(ctx.destination);
  }
  function envelope(gain, start, peak, attack, hold, release) {
    gain.gain.cancelScheduledValues(start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.setValueAtTime(peak, start + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
  }
  function tone(freq, start, opts={}) {
    const osc = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(freq, start);
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(opts.cutoff || 1800, start);
    envelope(gain, start, opts.level || 0.018, opts.attack ?? 0.12, opts.hold ?? 0.25, opts.release ?? 1.2);
    osc.connect(filter); filter.connect(gain); gain.connect(opts.bus || musicBus);
    osc.start(start);
    const end = start + (opts.attack ?? 0.12) + (opts.hold ?? 0.25) + (opts.release ?? 1.2) + 0.04;
    osc.stop(end);
    currentNodes.push(osc);
    osc.onended = () => { const i=currentNodes.indexOf(osc); if(i>=0) currentNodes.splice(i,1); };
  }
  function pad(freq, start, duration, level, detune=0) {
    const osc = ctx.createOscillator(), osc2 = ctx.createOscillator();
    const gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    osc.type = "triangle"; osc2.type = "sine";
    osc.frequency.setValueAtTime(freq, start);
    osc2.frequency.setValueAtTime(freq * 1.003, start);
    osc.detune.value = detune; osc2.detune.value = -detune;
    filter.type = "lowpass"; filter.frequency.setValueAtTime(1250, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + 1.8);
    gain.gain.setValueAtTime(level, start + duration - 2.2);
    gain.gain.linearRampToValueAtTime(0.0001, start + duration);
    osc.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(musicBus);
    osc.start(start); osc2.start(start);
    osc.stop(start + duration + 0.05); osc2.stop(start + duration + 0.05);
    currentNodes.push(osc, osc2);
  }
  function setChord(index, when) {
    const chords = progression[theme] || progression.dreamscape;
    const chord = chords[index % chords.length];
    chord.forEach((freq, i) => {
      pad(freq / 2, when, 8.8, i === 0 ? 0.026 : 0.014, i % 2 ? 4 : -3);
      pad(freq, when + 0.035 * i, 8.6, 0.008, i % 2 ? -2 : 3);
    });
    chordIndex = index;
  }
  function beat(when) {
    if (step % 16 === 0) setChord(Math.floor(step / 16), when);
    const chord = (progression[theme] || progression.dreamscape)[Math.floor(step / 16) % 4];
    const track = tracks[theme] || tracks.dreamscape;
    const idx = track.motif[step % track.motif.length];
    const base = chord[idx % chord.length] * (step % 8 === 6 ? 2 : 1);
    tone(base, when, {type:track.wave, level:theme==="arcade" ? 0.009 : 0.013, attack:theme==="arcade" ? 0.025 : 0.12, hold:0.18, release:theme==="arcade" ? 0.35 : 1.1, cutoff:track.filter});
    if (step % track.extra === 0) tone(base * (theme==="danger" ? 1.414 : 1.5), when + (theme==="arcade" ? 0.06 : 0.16), {type:theme==="danger" ? "sawtooth" : "sine", level:0.006, attack:0.08, hold:0.12, release:theme==="arcade" ? 0.3 : 1.4, cutoff:track.filter*1.2});
    if (theme === "arcade" && step % 2 === 0) tone(base / 2, when, {type:"square", level:0.008, attack:0.015, hold:0.09, release:0.22, cutoff:900});
    step++;
  }
  function schedulerTick() {
    if (!enabled || !ctx) return;
    while (nextStepTime < ctx.currentTime + 0.28) {
      beat(nextStepTime);
      nextStepTime += 60 / ((tracks[theme] || tracks.dreamscape).bpm) * 0.5;
    }
  }
  function start() {
    initAudio();
    ctx.resume().then(() => {
      if (ctx.state !== "running") {
        setStatus("Tap anywhere to start music");
        updateControls();
        return;
      }
      enabled = true;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(volume, ctx.currentTime, 1.1);
      nextStepTime = ctx.currentTime + 0.12;
      if (scheduler) clearInterval(scheduler);
      scheduler = setInterval(schedulerTick, 80);
      schedulerTick();
      setStatus(themeLabel(theme) + " · playing");
      updateControls();
    }).catch(() => {
      setStatus("Tap Play to enable audio");
    });
  }
  function stop() {
    enabled = false;
    if (scheduler) clearInterval(scheduler);
    scheduler = null;
    if (ctx && master) master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
    setStatus("Paused · tap to resume");
    updateControls();
  }
  function themeLabel(name) {
    return ({dreamscape:"Dreamscape",explore:"Open Skies",tools:"Soft Circuits",menu:"Starlight Menu",arcade:"Arcade Drift",puzzle:"Quiet Focus",memory:"Memory Garden",surprise:"Wonder Loop",danger:"Redshift"})[name] || "Dreamscape";
  }
  function setStatus(text) { const s=document.getElementById("hp-sound-status"); if(s) s.textContent=text; }
  function updateControls() {
    const b=document.getElementById("hp-sound-play");
    if(b) { b.textContent=enabled?"Pause music":"Play music"; b.setAttribute("aria-pressed",String(enabled)); }
  }
  function eventSound(kind) {
    if (!enabled || !ctx) return;
    const now = ctx.currentTime + 0.025;
    const sets = {
      click:[587.33,783.99], open:[523.25,659.25,783.99], win:[523.25,659.25,783.99,1046.5],
      lose:[392,349.23,293.66], score:[659.25,783.99], collect:[783.99,987.77],
      danger:[196,233.08,293.66], countdown:[440,554.37], start:[392,523.25,659.25],
      level:[523.25,659.25,783.99,987.77], correct:[659.25,783.99,987.77], wrong:[293.66,246.94],
      surprise:[587.33,739.99,880,1174.66], typing:[880]
    };
    const notes=sets[kind] || sets.click;
    notes.forEach((n,i)=>tone(n,now+i*0.105,{bus:fxBus,type:"sine",level:kind==="typing"?0.004:0.014,attack:0.045,hold:0.08,release:0.75,cutoff:3300}));
    const names={click:"Little Signal",open:"Page Open",win:"Victory Spark",lose:"Try Again",score:"Score Spark",collect:"Collected",danger:"Warning Signal",countdown:"Countdown",start:"Game Start",level:"Level Up",correct:"Correct",wrong:"Not Quite",surprise:"Surprise",typing:"Soft Key"};
    eventName=names[kind]||"Little Signal"; setStatus(themeLabel(theme)+" · "+eventName);
    lastEventAt=Date.now();
    setTimeout(()=>{ if(enabled && Date.now()-lastEventAt>850) setStatus(themeLabel(theme)+" · playing"); },900);
  }
  function silenceCurrentVoices() {
    const old=currentNodes.slice();
    currentNodes.length=0;
    old.forEach(node=>{ try{node.onended=null; node.stop();}catch(_){} });
  }
  function changeTheme(next) {
    if (!progression[next] || next===theme) return;
    theme=next;
    if (switchTimer) clearTimeout(switchTimer);
    if(enabled && ctx) {
      if(scheduler) clearInterval(scheduler);
      scheduler=null;
      musicBus.gain.cancelScheduledValues(ctx.currentTime);
      musicBus.gain.setTargetAtTime(0.0001,ctx.currentTime,0.06);
      switchTimer=setTimeout(()=>{
        silenceCurrentVoices();
        step=0; chordIndex=-1;
        if(!enabled || !ctx) return;
        musicBus.gain.cancelScheduledValues(ctx.currentTime);
        musicBus.gain.setValueAtTime(0.0001,ctx.currentTime);
        musicBus.gain.setTargetAtTime(0.82,ctx.currentTime,0.12);
        nextStepTime=ctx.currentTime+0.14;
        scheduler=setInterval(schedulerTick,80);
        schedulerTick();
        switchTimer=null;
      },220);
    }
    themeSelect.value=theme;
    setStatus(themeLabel(theme)+(enabled?" · switching track":" · ready"));
  }

  const style = document.createElement("style");
  style.textContent = `
    #hp-sound-orb{position:fixed;z-index:10000;right:14px;bottom:14px;width:42px;height:42px;border:1px solid #ffffff22;border-radius:12px;background:#0b0b12ef;color:#7df9ff;font:800 18px monospace;box-shadow:0 8px 30px #0008;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:grid;place-items:center;cursor:grab;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-user-drag:none;overscroll-behavior:contain;transition:transform .15s,border-color .15s}
    #hp-sound-orb:active{transform:scale(.94);border-color:#7df9ff88}#hp-sound-orb:focus-visible{outline:3px solid #7df9ff;outline-offset:3px}
    #hp-sound-orb svg{width:20px;height:20px;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    #hp-sound-panel{position:fixed;z-index:9999;left:auto;top:auto;right:18px;bottom:82px;width:min(300px,calc(100vw - 28px));padding:15px;border-radius:20px;border:1px solid #9b7bff55;background:rgba(15,14,31,.94);color:#f7f4ff;box-shadow:0 16px 50px #0008;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);font:13px/1.4 system-ui,sans-serif}
    #hp-sound-panel[hidden]{display:none}#hp-sound-panel .hp-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}#hp-sound-panel .hp-logo{width:38px;height:38px;display:grid;place-items:center;border-radius:13px;background:#9b7bff25;font-size:22px}#hp-sound-panel .hp-title{font-size:15px;font-weight:750}#hp-sound-panel .hp-muted{font-size:11px;color:#aaa7c1;margin-top:2px}#hp-sound-panel .hp-close{margin-left:auto;background:transparent;border:0;color:#aaa7c1;font-size:22px;cursor:pointer}#hp-sound-panel .hp-reset{width:24px;height:24px;min-width:24px;padding:0!important;display:grid;place-items:center;border-radius:7px!important;font-size:13px!important;color:#7df9ff!important;border-color:#7df9ff44!important}#hp-sound-panel button:not(.hp-close){background:#ffffff0c;color:#fff;border:1px solid #ffffff22;border-radius:11px;padding:9px 11px;font:inherit;cursor:pointer}#hp-sound-panel .hp-actions{display:flex;gap:8px;align-items:center}#hp-sound-panel .hp-play{flex:1;background:#9b7bff26!important}#hp-sound-panel label{display:block;color:#aaa7c1;font-size:10px;letter-spacing:.08em;margin:12px 0 5px}#hp-sound-panel input{width:100%;accent-color:#9b7bff}#hp-sound-panel select{width:100%;padding:9px;background:#17162a;color:#fff;border:1px solid #ffffff22;border-radius:10px;font:inherit}
    @media(max-width:500px){#hp-sound-orb{right:14px;bottom:14px;width:42px;height:42px}#hp-sound-panel{right:12px;bottom:68px}}
  `;
  document.head.appendChild(style);
  const orb=document.getElementById("hp-sound-orb") || document.createElement("button");
  orb.id="hp-sound-orb"; orb.type="button"; orb.setAttribute("aria-label","Open Hyper-Pop music player"); orb.setAttribute("aria-expanded",String(playerOpen));
  orb.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  const panel=document.createElement("section");
  panel.id="hp-sound-panel"; panel.hidden=!playerOpen; panel.setAttribute("aria-label","Hyper-Pop music player");
  panel.innerHTML=`
    <div class="hp-head"><div class="hp-logo">✦</div><div><div class="hp-title">Hyper-Pop Radio</div><div class="hp-muted" id="hp-sound-status">Dreamscape · ready</div></div><button class="hp-reset" id="hp-sound-reset" type="button" title="Move music button to its original spot" aria-label="Reset music button position">↺</button><button class="hp-close" id="hp-sound-close" aria-label="Close player">×</button></div>
    <div class="hp-actions"><button class="hp-play" id="hp-sound-play" type="button">Play music</button><button id="hp-sound-mute" type="button">Mute</button></div>
    <label for="hp-sound-theme">SOUNDTRACK</label><select id="hp-sound-theme">
      <option value="dreamscape">Dreamscape · homepage</option><option value="explore">Open Skies · browsing</option><option value="tools">Soft Circuits · tools</option><option value="menu">Starlight Menu · accounts</option><option value="arcade">Arcade Drift · games</option><option value="puzzle">Quiet Focus · puzzles</option><option value="memory">Memory Garden · memory games</option><option value="surprise">Wonder Loop · surprises</option><option value="danger">Redshift · danger</option>
    </select>
    <label for="hp-sound-volume">VOLUME</label><input id="hp-sound-volume" type="range" min="0" max="0.5" step="0.01" value="${volume}" aria-label="Music volume">
    <div class="hp-muted" style="margin-top:9px">Original instrumental soundscapes · tap Play if your browser blocks autoplay</div>
  `;
  document.body.append(orb,panel);
  const vol=panel.querySelector("#hp-sound-volume"), themeSelect=panel.querySelector("#hp-sound-theme");
  themeSelect.value=theme;
  function positionPanel() {
    if (panel.hidden || !orb.isConnected) return;
    const r=orb.getBoundingClientRect(), gap=10, margin=12;
    const width=Math.min(300,innerWidth-28), height=panel.offsetHeight || 290;
    const leftSide=r.left+ r.width/2 > innerWidth/2;
    let left=leftSide ? r.right-width : r.left;
    left=Math.max(margin,Math.min(innerWidth-width-margin,left));
    let top=r.top-height-gap;
    if(top<margin) top=r.bottom+gap;
    top=Math.max(margin,Math.min(innerHeight-height-margin,top));
    panel.style.left=left+"px"; panel.style.top=top+"px";
    panel.style.right="auto"; panel.style.bottom="auto";
  }
  function openPanel(open) { playerOpen=open; panel.hidden=!open; orb.setAttribute("aria-expanded",String(open)); if(open) requestPanelPosition(); persist(); }
  function requestPanelPosition(){ positionPanel(); }
  orb.addEventListener("click",()=>{ if(movedOrb){movedOrb=false;return;} openPanel(!playerOpen); });
  panel.querySelector("#hp-sound-close").addEventListener("click",()=>openPanel(false));
  panel.querySelector("#hp-sound-reset").addEventListener("click",()=>{
    orb.style.left=""; orb.style.top=""; orb.style.right="14px"; orb.style.bottom="14px";
    try{localStorage.removeItem("hyper-pop-sound-orb-position");}catch(_){}
    positionPanel();
  });
  panel.querySelector("#hp-sound-play").addEventListener("click",()=>enabled?stop():start());
  panel.querySelector("#hp-sound-mute").addEventListener("click",()=>{if(enabled && volume>0){volume=0;vol.value="0";if(ctx)master.gain.setTargetAtTime(0,ctx.currentTime,.12);}else{if(volume===0){volume=.2;vol.value=".2";} if(!enabled)start(); else if(ctx)master.gain.setTargetAtTime(volume,ctx.currentTime,.12);}persist();});
  vol.addEventListener("input",()=>{volume=Number(vol.value);persist();if(ctx&&enabled)master.gain.setTargetAtTime(volume,ctx.currentTime,.12);});
  themeSelect.addEventListener("change",()=>changeTheme(themeSelect.value));

  // Touch-safe dragging: the page does not scroll while the orb is being moved.
  orb.addEventListener("dragstart",e=>e.preventDefault());
  orb.addEventListener("pointerdown",e=>{
    if(e.button!==undefined && e.button!==0)return;
    e.preventDefault();
    drag={x:e.clientX,y:e.clientY,left:orb.getBoundingClientRect().left,top:orb.getBoundingClientRect().top,moved:false};
    try{orb.setPointerCapture(e.pointerId);}catch(_){}
  });
  orb.addEventListener("pointermove",e=>{
    if(!drag)return;
    if(e.cancelable)e.preventDefault();
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>7)drag.moved=true;
    if(drag.moved){
      orb.style.left=Math.max(0,Math.min(innerWidth-orb.offsetWidth,drag.left+dx))+"px";
      orb.style.top=Math.max(0,Math.min(innerHeight-orb.offsetHeight,drag.top+dy))+"px";
      orb.style.right="auto";orb.style.bottom="auto";
      positionPanel();
    }
  });
  const finishDrag=()=>{
    if(drag&&drag.moved){
      movedOrb=true;
      const r=orb.getBoundingClientRect();
      try{localStorage.setItem("hyper-pop-sound-orb-position",JSON.stringify({x:r.left,y:r.top}));}catch(_){}
      positionPanel();
    }
    drag=null;
  };
  orb.addEventListener("pointerup",finishDrag);
  orb.addEventListener("pointercancel",finishDrag);
  window.addEventListener("resize",()=>{
    const r=orb.getBoundingClientRect();
    orb.style.left=Math.max(0,Math.min(innerWidth-orb.offsetWidth,r.left))+"px";
    orb.style.top=Math.max(0,Math.min(innerHeight-orb.offsetHeight,r.top))+"px";
    orb.style.right="auto";orb.style.bottom="auto";
    positionPanel();
  });
  try{const p=JSON.parse(localStorage.getItem("hyper-pop-sound-orb-position")||"null");if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y)){orb.style.left=Math.max(0,Math.min(innerWidth-54,p.x))+"px";orb.style.top=Math.max(0,Math.min(innerHeight-54,p.y))+"px";orb.style.right="auto";orb.style.bottom="auto";}}catch(_){}

  if(playerOpen) positionPanel();

  // Page-specific soundtrack and common game-event hooks.
  window.HyperPopSoundtrack={
    play:start,pause:stop,playEvent:eventSound,setTheme:changeTheme,
    setVolume(v){volume=Math.max(0,Math.min(.5,Number(v)||0));vol.value=String(volume);persist();if(ctx&&enabled)master.gain.setTargetAtTime(volume,ctx.currentTime,.12);},
    get enabled(){return enabled;},
    get theme(){return theme;}
  };
  document.addEventListener("click",e=>{
    const el=e.target.closest("button,a,[role=button],.card,.open");
    if(!el||el.closest("#hp-sound-panel")||el===orb)return;
    const txt=(el.textContent||"").toLowerCase();
    if(/reset|quit|restart/.test(txt))eventSound("lose");
    else if(/win|victory|complete|finished|success/.test(txt))eventSound("win");
    else if(/start|begin|play/.test(txt))eventSound("start");
    else if(/level up|next level/.test(txt))eventSound("level");
    else if(/surprise|random/.test(txt))eventSound("surprise");
    else if(/submit|check|answer/.test(txt))eventSound("correct");
    else if(el.matches(".card,.open")||el.closest(".card"))eventSound("open");
    else eventSound("click");
  });
  document.addEventListener("keydown",e=>{
    if(!enabled||e.repeat||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.key.length===1 && /[a-z0-9]/i.test(e.key) && !/INPUT|TEXTAREA/.test(e.target.tagName))eventSound("typing");
  });

  // Try autoplay, then start on the first user gesture if the browser blocks sound.
  setStatus("Ready · trying autoplay");
  start();
  const startOnFirstGesture = () => {
    if (!enabled) start();
    if (enabled || (ctx && ctx.state === "running")) {
      document.removeEventListener("pointerdown", startOnFirstGesture, true);
      document.removeEventListener("touchstart", startOnFirstGesture, true);
      document.removeEventListener("keydown", startOnFirstGesture, true);
    }
  };
  document.addEventListener("pointerdown", startOnFirstGesture, true);
  document.addEventListener("touchstart", startOnFirstGesture, true);
  document.addEventListener("keydown", startOnFirstGesture, true);
})();
