/* Hyper-Pop Dreamscape soundtrack
 * Original procedural music made with Web Audio API. No external files, services, or dependencies.
 * Audio begins only after the visitor presses the player button.
 */
(() => {
  "use strict";

  const KEY = "hyper-pop-soundtrack-enabled";
  const VOL_KEY = "hyper-pop-soundtrack-volume";
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  let ctx = null;
  let master = null;
  let padBus = null;
  let musicTimer = null;
  let step = 0;
  let enabled = false;
  let volume = Number(localStorage.getItem(VOL_KEY) ?? 0.22);
  let eventUntil = 0;
  let activeNodes = new Set();

  const chords = [
    [261.63, 329.63, 392.00, 493.88], // Cmaj7
    [220.00, 261.63, 329.63, 392.00], // Am7
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [196.00, 246.94, 293.66, 392.00]  // Gadd9 colour
  ];
  const melody = [0, 7, 12, 7, 4, 12, 16, 12, 7, 4, 2, 7, 12, 16, 14, 7];
  const semitones = [0, 2, 4, 7, 9, 12, 14, 16, 19];
  const root = 130.81;

  function node(n) {
    activeNodes.add(n);
    n.onended = () => activeNodes.delete(n);
    return n;
  }

  function ensureAudio() {
    if (ctx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    padBus = ctx.createGain();
    padBus.gain.value = 0.52;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 1700;
    padFilter.connect(padBus);
    padBus.connect(master);
    window.__hyperPopAudio = { context: ctx, master };
  }

  function softTone(freq, start, duration, opts = {}) {
    const osc = node(ctx.createOscillator());
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(freq, start);
    if (opts.detune) osc.detune.value = opts.detune;
    filter.type = "lowpass";
    filter.frequency.value = opts.cutoff || 2200;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(opts.level || 0.06, start + (opts.attack || 0.35));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(opts.bus || padBus);
    osc.start(start);
    osc.stop(start + duration + 0.04);
  }

  function playChord(index, when) {
    const chord = chords[index % chords.length];
    chord.forEach((freq, i) => {
      softTone(freq / 2, when, 5.6, { level: i === 0 ? 0.045 : 0.024, attack: 1.1, cutoff: 850, detune: i % 2 ? -4 : 3 });
      softTone(freq, when + i * 0.11, 4.8, { level: 0.018, attack: 0.8, cutoff: 1500, detune: i % 2 ? 3 : -3 });
    });
  }

  function pluck(freq, when, loud = 0.035) {
    softTone(freq, when, 1.15, { type: "triangle", level: loud, attack: 0.025, cutoff: 3000, bus: master });
    softTone(freq * 2.002, when, 0.42, { type: "sine", level: loud * 0.17, attack: 0.015, cutoff: 4000, bus: master });
  }

  function scheduleMusic() {
    if (!enabled || !ctx) return;
    const now = ctx.currentTime + 0.08;
    if (step % 8 === 0) playChord(Math.floor(step / 8) % chords.length, now);
    const noteIndex = melody[step % melody.length];
    const note = root * Math.pow(2, semitones[noteIndex % semitones.length] / 12) * (noteIndex > 11 ? 2 : 1);
    pluck(note, now + 0.04, 0.018);
    if (step % 4 === 2) pluck(note * 1.5, now + 0.34, 0.009);
    step++;
  }

  function playEvent(kind = "click") {
    if (!enabled || !ctx) return;
    const now = ctx.currentTime + 0.015;
    const sets = {
      game: [523.25, 659.25, 783.99, 1046.5],
      tool: [392, 493.88, 587.33, 783.99],
      surprise: [659.25, 783.99, 987.77, 1318.51],
      click: [587.33, 783.99]
    };
    const notes = sets[kind] || sets.click;
    notes.forEach((freq, i) => pluck(freq, now + i * 0.075, kind === "click" ? 0.025 : 0.032));
    eventUntil = performance.now() + 900;
  }

  function start() {
    ensureAudio();
    ctx.resume();
    enabled = true;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(volume, ctx.currentTime, 0.45);
    if (musicTimer) clearInterval(musicTimer);
    scheduleMusic();
    musicTimer = setInterval(scheduleMusic, 720);
    localStorage.setItem(KEY, "true");
    updateButton();
  }

  function stop() {
    enabled = false;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    if (ctx && master) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.22);
    }
    localStorage.setItem(KEY, "false");
    updateButton();
  }

  const player = document.createElement("section");
  player.id = "hyper-pop-music-player";
  player.setAttribute("aria-label", "Hyper-Pop soundtrack player");
  player.innerHTML = `
    <style>
      #hyper-pop-music-player{position:fixed;z-index:9999;right:16px;bottom:16px;width:min(270px,calc(100vw - 32px));color:#f7f4ff;font:13px/1.35 system-ui,sans-serif;background:rgba(15,14,31,.92);border:1px solid #9b7bff55;border-radius:18px;padding:12px 13px;box-shadow:0 12px 40px #0007;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      #hyper-pop-music-player .hp-row{display:flex;align-items:center;gap:10px}
      #hyper-pop-music-player .hp-orb{width:34px;height:34px;flex:none;border-radius:12px;background:linear-gradient(135deg,#9b7bff,#4be0e3);display:grid;place-items:center;color:#0b0b16;font-size:18px}
      #hyper-pop-music-player .hp-title{font-weight:750;letter-spacing:.01em}
      #hyper-pop-music-player .hp-sub{font-size:11px;color:#aaa7c1;margin-top:2px}
      #hyper-pop-music-player button{border:1px solid #ffffff20;border-radius:11px;background:#ffffff0c;color:#fff;padding:8px 11px;font:inherit;cursor:pointer;touch-action:manipulation}
      #hyper-pop-music-player button:focus-visible,#hyper-pop-music-player input:focus-visible{outline:2px solid #4be0e3;outline-offset:2px}
      #hyper-pop-music-player .hp-toggle{margin-left:auto;min-width:67px;background:#9b7bff22}
      #hyper-pop-music-player .hp-controls{display:flex;align-items:center;gap:9px;margin-top:10px}
      #hyper-pop-music-player label{font-size:11px;color:#aaa7c1;white-space:nowrap}
      #hyper-pop-music-player input{width:100%;accent-color:#9b7bff}
      @media(max-width:580px){#hyper-pop-music-player{right:10px;bottom:10px}}
    </style>
    <div class="hp-row">
      <div class="hp-orb" aria-hidden="true">✦</div>
      <div><div class="hp-title">Hyper-Pop Radio</div><div class="hp-sub" id="hp-music-status">Dreamscape · instrumental</div></div>
      <button class="hp-toggle" id="hp-music-toggle" type="button">Play</button>
    </div>
    <div class="hp-controls"><label for="hp-music-volume">VOLUME</label><input id="hp-music-volume" type="range" min="0" max="0.6" step="0.01" value="${volume}" aria-label="Soundtrack volume"></div>
  `;
  document.body.appendChild(player);

  const toggle = player.querySelector("#hp-music-toggle");
  const status = player.querySelector("#hp-music-status");
  const slider = player.querySelector("#hp-music-volume");

  function updateButton() {
    toggle.textContent = enabled ? "Pause" : "Play";
    toggle.setAttribute("aria-pressed", String(enabled));
    status.textContent = enabled ? (performance.now() < eventUntil ? "Little signal · event mix" : "Dreamscape · instrumental") : "Paused · ready when you are";
  }

  toggle.addEventListener("click", () => enabled ? stop() : start());
  slider.addEventListener("input", () => {
    volume = Number(slider.value);
    localStorage.setItem(VOL_KEY, String(volume));
    if (ctx && master && enabled) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.08);
  });

  // Tiny musical accents for interactions, without interrupting the ambient bed.
  document.addEventListener("click", event => {
    const target = event.target.closest("a, button, [role='button']");
    if (!target || target.closest("#hyper-pop-music-player")) return;
    if (!enabled) return;
    if (target.matches(".card, .open") || target.closest(".card")) {
      const text = (target.textContent || "").toLowerCase();
      playEvent(/surprise|random/.test(text) ? "surprise" : /game|arcade|play|reaction|sheep|clicker|aim|memory/.test(text) ? "game" : "tool");
    } else if (target.matches(".btn, .navlinks a")) {
      playEvent("click");
    }
  });

  // Respect saved preference, but never autoplay audio before a user gesture.
  if (localStorage.getItem(KEY) === "true") {
    status.textContent = "Tap Play to resume · instrumental";
  }
  window.HyperPopSoundtrack = {
    playEvent,
    play: start,
    pause: stop,
    setVolume(value) {
      volume = Math.max(0, Math.min(0.6, Number(value) || 0));
      slider.value = String(volume);
      localStorage.setItem(VOL_KEY, String(volume));
      if (ctx && master && enabled) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.08);
    }
  };
})();
