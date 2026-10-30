const Sound = (() => {
  const S = CONFIG.sound;
  const key = CONFIG.save.key + '-audio';
  const st = { music: S.musicOn, sounds: S.soundsOn, ambient: S.ambientOn, volume: S.volume };
  try { Object.assign(st, JSON.parse(localStorage.getItem(key) || '{}')); } catch (e) {}
  function store() { try { localStorage.setItem(key, JSON.stringify(st)); } catch (e) {} }

  let ac = null, master, musicGain, sfxGain, fireGain, lapGain, noiseBuf, musicTimer = null, nextNote = 0, beat = 0, note = 2;
  let lapPhase = 0, echoIn = null, caveGain = null, caveAir = null, caveT = 0;
  let ambGain, windGain, leafGain, windPhase = 0;
  const between = ([a, b]) => a + Math.random() * (b - a);
  const timers = { bird: between(S.birdEvery) / 2, owl: between(S.owlEvery) / 2, wolf: between(S.wolfEvery), cricket: 0 };

  // Browsers only allow sound after a key press or a click, so we start here.
  function ensure() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return true; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ac = new AC();
    master = ac.createGain(); master.gain.value = st.volume; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = st.sounds ? 1 : 0; sfxGain.connect(master);
    // A cave echo: sounds sent here come back softly a few times, a little darker each time.
    echoIn = ac.createGain(); echoIn.gain.value = 1;
    const dl = ac.createDelay(1.5); dl.delayTime.value = 0.32;
    const fb = ac.createGain(); fb.gain.value = 0.42;
    const lpE = ac.createBiquadFilter(); lpE.type = 'lowpass'; lpE.frequency.value = 2200;
    echoIn.connect(dl); dl.connect(lpE); lpE.connect(fb); fb.connect(dl); lpE.connect(sfxGain);
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // The campfire: the warm, low "whoosh" of the flames and a very quiet hiss.
    // The little crackles and pops are added in update(). Louder as you come closer.
    fireGain = ac.createGain(); fireGain.gain.value = 0; fireGain.connect(sfxGain);
    const lap = ac.createBufferSource(); lap.buffer = noiseBuf; lap.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    lapGain = ac.createGain(); lapGain.gain.value = 0.5;
    lap.connect(lp).connect(lapGain).connect(fireGain); lap.start();
    const hiss = ac.createBufferSource(); hiss.buffer = noiseBuf; hiss.loop = true;
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5000;
    const hissGain = ac.createGain(); hissGain.gain.value = 0.06;
    hiss.connect(hp).connect(hissGain).connect(fireGain); hiss.start(0, 0.7);
    // Forest sounds: soft wind and leaves that slowly come and go. Birds, crickets,
    // owls and far-away wolves are added in updateAmbient().
    ambGain = ac.createGain(); ambGain.gain.value = 0; ambGain.connect(master);
    const wind = ac.createBufferSource(); wind.buffer = noiseBuf; wind.loop = true;
    const wl = ac.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 420;
    windGain = ac.createGain(); windGain.gain.value = 0.2;
    wind.connect(wl).connect(windGain).connect(ambGain); wind.start(0, 1.3);
    const leaves = ac.createBufferSource(); leaves.buffer = noiseBuf; leaves.loop = true;
    const lb = ac.createBiquadFilter(); lb.type = 'bandpass'; lb.frequency.value = 2400; lb.Q.value = 0.6;
    leafGain = ac.createGain(); leafGain.gain.value = 0.02;
    leaves.connect(lb).connect(leafGain).connect(ambGain); leaves.start(0, 0.3);
    // The cave: a very low, soft hum of air moving through the rock (only underground).
    caveGain = ac.createGain(); caveGain.gain.value = 0; caveGain.connect(master);
    const hum = ac.createBufferSource(); hum.buffer = noiseBuf; hum.loop = true;
    const hl = ac.createBiquadFilter(); hl.type = 'lowpass'; hl.frequency.value = 160;
    caveAir = ac.createGain(); caveAir.gain.value = 0.35;
    hum.connect(hl).connect(caveAir).connect(caveGain); hum.start(0, 0.9);
    if (st.music) startMusic();
    return true;
  }
  window.addEventListener('keydown', ensure);
  window.addEventListener('mousedown', ensure);

  // A soft note: starts quickly, fades out slowly.
  function tone(freq, dur, type, vol, dest, at, endFreq) {
    const t = at || ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.06, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // A short soft noise (for chops, the rifle, crackles).
  function noise(dur, freq, vol, type, at, dest) {
    const t = at || ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest || sfxGain);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  // ----- Sounds -----
  function ready() { return ensure() && st.sounds; }
  function hit(kind) {
    if (!ready()) return;
    if (kind === 'hollow') {                       // a deep, hollow "tock": there is space behind this rock
      tone(160, 0.3, 'sine', 0.22, null, 0, 110); tone(320, 0.12, 'triangle', 0.06); noise(0.08, 500, 0.12);
    } else if (kind === 'wood') {                         // a soft wooden "thock"
      noise(0.08, 900, 0.3); tone(150, 0.14, 'sine', 0.3, null, 0, 90);
    } else if (kind === 'stone') {                 // a gentle "tink"
      tone(880, 0.12, 'triangle', 0.1); tone(1320, 0.08, 'sine', 0.05); noise(0.05, 2500, 0.08, 'highpass');
    } else if (kind === 'plant') {                 // a soft rustle of leaves
      noise(0.12, 2600, 0.08, 'bandpass');
    } else {                                       // a soft thud
      tone(110, 0.12, 'sine', 0.28, null, 0, 70); noise(0.06, 500, 0.15);
    }
  }
  function rifle() {                               // a muffled "pof", not a loud bang
    if (!ready()) return;
    noise(0.2, 1000, 0.4); tone(90, 0.22, 'sine', 0.3, null, 0, 45);
  }
  function click() { if (ready()) tone(1400, 0.04, 'square', 0.03); }
  function reload() {
    if (!ready()) return;
    tone(900, 0.05, 'square', 0.035); tone(600, 0.06, 'square', 0.035, null, ac.currentTime + 0.12);
  }
  // Called every frame: campfire sound by distance (level 0 = far, 1 = right next to it).
  // Like sitting in front of a real campfire: soft crackles, sometimes a few together, sometimes a little pop.
  function crackle(level, at) {
    noise(0.004 + Math.random() * 0.012, 2500 + Math.random() * 4000, (0.05 + Math.random() * 0.12) * level, 'highpass', at);
  }
  function pop(level) { noise(0.03 + Math.random() * 0.03, 700 + Math.random() * 500, 0.14 * level, 'bandpass'); }
  function update(dt, fireLevel) {
    if (!ac) return;
    updateAmbient(dt);
    fireGain.gain.setTargetAtTime(fireLevel * 0.12, ac.currentTime, 0.4);
    lapPhase += dt * (0.7 + Math.random() * 0.6);                 // the flames slowly "breathe"
    lapGain.gain.setTargetAtTime(0.35 + 0.25 * Math.sin(lapPhase) + Math.random() * 0.1, ac.currentTime, 0.25);
    if (!st.sounds || fireLevel <= 0) return;
    if (Math.random() < dt * 14 * fireLevel) {
      crackle(fireLevel);
      if (Math.random() < 0.3) {
        const n = 1 + Math.floor(Math.random() * 3);
        for (let i = 1; i <= n; i++) crackle(fireLevel, ac.currentTime + i * (0.02 + Math.random() * 0.05));
      }
    }
    if (Math.random() < dt * 0.8 * fireLevel) pop(fireLevel);
  }
  // A soft, magical chime (the secret).
  function chime() {
    if (!ready()) return;
    [523.3, 659.3, 784.0, 1046.5, 1318.5].forEach((fr, i) => tone(fr, 1.6, 'sine', 0.06, null, ac.currentTime + i * 0.16));
  }

  // The last hit on a tree: a slow wooden creak, then a soft "whump" as it falls into the leaves.
  function timber() {
    if (!ready()) return;
    const t = ac.currentTime + 0.05;
    const o = ac.createOscillator(), bp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(60, t + 0.9);
    bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 5;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.25);
    g.gain.linearRampToValueAtTime(0.08, t + 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    o.connect(bp).connect(g).connect(sfxGain); o.start(t); o.stop(t + 1.05);
    const fall = t + 0.95;
    noise(0.7, 450, 0.35, 'lowpass', fall);                       // soft crash
    tone(70, 0.6, 'sine', 0.3, null, fall, 38);                   // low thump
    noise(0.9, 3200, 0.05, 'highpass', fall + 0.05);              // leaves rustling
  }

  // Garlic slingshot: a soft "thwip"; a garlic hit: a soft "pof"; bats: a quiet flutter.
  function sling() { if (!ready()) return; noise(0.07, 1800, 0.12, 'bandpass'); tone(500, 0.08, 'sine', 0.05, null, 0, 900); }
  function splat() { if (!ready()) return; noise(0.09, 700, 0.2); tone(220, 0.1, 'sine', 0.1, null, 0, 150); }
  function bats() {
    if (!ready()) return;
    for (let i = 0; i < 14; i++) noise(0.03, 1200 + Math.random() * 800, 0.05, 'bandpass', ac.currentTime + i * 0.07 + Math.random() * 0.03);
  }

  // A skeleton throws a bone: a soft "fwip". A werewolf: a far-away howl (the same soft howl as the forest wolves).
  function toss() { if (!ready()) return; noise(0.12, 1400, 0.06, 'bandpass'); }
  function howl() { if (ensure() && st.sounds) wolfHowl(); }

  // Fishing: a soft "plip" when the line goes in, a gentle "blip-blip" when a fish bites, a little splash when you catch it.
  function cast() { if (!ready()) return; tone(700, 0.08, 'sine', 0.05, null, 0, 300); noise(0.12, 1600, 0.06, 'bandpass', ac.currentTime + 0.25); }
  function bite() { if (!ready()) return; tone(660, 0.12, 'sine', 0.07); tone(880, 0.14, 'sine', 0.07, null, ac.currentTime + 0.18); }
  function catchFish() { if (!ready()) return; noise(0.25, 1200, 0.12, 'bandpass'); tone(520, 0.15, 'sine', 0.06, null, ac.currentTime + 0.1, 780); }
  function reel() { if (!ready()) return; for (let i = 0; i < 4; i++) tone(1000, 0.03, 'square', 0.015, null, ac.currentTime + i * 0.06); }

  // The chainsaw: a short, soft, low "brrr" (muffled, never loud).
  function chainsaw() {
    if (!ready()) return;
    const t = ac.currentTime, o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(95, t + 0.12); o.frequency.linearRampToValueAtTime(75, t + 0.25);
    lp.type = 'lowpass'; lp.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(lp).connect(g).connect(sfxGain); o.start(t); o.stop(t + 0.3);
    noise(0.12, 900, 0.05, 'bandpass', t + 0.05);
  }

  // A gate: a soft wooden creak. A lock: two small clicks.
  function gate() {
    if (!ready()) return;
    const t = ac.currentTime, o = ac.createOscillator(), bp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t); o.frequency.linearRampToValueAtTime(110, t + 0.35);
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 6;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(bp).connect(g).connect(sfxGain); o.start(t); o.stop(t + 0.45);
    noise(0.06, 600, 0.12, 'lowpass', t + 0.4);
  }
  // The same two sounds as in Knight's Quest (same notes and waves), a little softer.
  function kqChest() { if (!ready()) return; tone(520, 0.1, 'triangle', 0.12); tone(780, 0.16, 'triangle', 0.12, null, ac.currentTime + 0.09); }
  function kqCoin()  { if (!ready()) return; tone(990, 0.07, 'square', 0.06); tone(1480, 0.12, 'square', 0.06, null, ac.currentTime + 0.07); }
  function flutter() { if (!ready()) return; for (let i = 0; i < 4; i++) noise(0.05, 900, 0.025, 'bandpass', ac.currentTime + i * 0.08); }
  // A real water drop into a puddle: a tiny tap, then a short "bloop" whose pitch rises quickly (the bubble),
  // from a random place left or right, with the cave's echo. Sometimes two drops close together.
  function dropAt(at, f, vol, pan) {
    const p = ac.createStereoPanner(); p.pan.value = pan;
    const out = ac.createGain(); out.gain.value = 1;
    out.connect(p); p.connect(sfxGain);
    const send = ac.createGain(); send.gain.value = 0.7; out.connect(send); send.connect(echoIn);
    noise(0.012, 3500, vol * 0.5, 'highpass', at, out);              // the tap
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, at);
    o.frequency.exponentialRampToValueAtTime(f * 2.2, at + 0.045);    // the bubble: pitch goes up fast
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
    o.connect(g).connect(out); o.start(at); o.stop(at + 0.12);
  }
  // Other cave sounds, all soft and with the cave echo:
  function toCave(pan) {                            // a sound bus: left/right, plus the echo
    const p = ac.createStereoPanner(); p.pan.value = pan; p.connect(sfxGain);
    const out = ac.createGain(); out.connect(p);
    const send = ac.createGain(); send.gain.value = 0.6; out.connect(send); send.connect(echoIn);
    return out;
  }
  function pebbles() {                              // a few small stones falling somewhere: "tik ... tik-tik"
    if (!st.sounds) return;
    const out = toCave(Math.random() * 1.6 - 0.8), t = ac.currentTime;
    let at = t;
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      at += 0.08 + Math.random() * 0.18;
      noise(0.02, 2500 + Math.random() * 1500, 0.05 * (1 - i * 0.12), 'bandpass', at, out);
      tone(1800 + Math.random() * 900, 0.04, 'triangle', 0.012, out, at);
    }
  }
  function trickle() {                              // water running a little, far away
    if (!st.sounds) return;
    const out = toCave(Math.random() * 1.4 - 0.7), t = ac.currentTime;
    for (let i = 0; i < 8; i++) {
      const at = t + i * 0.09 + Math.random() * 0.05, f = 900 + Math.random() * 900;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * 1.7, at + 0.04);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.02, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
      o.connect(g).connect(out); o.start(at); o.stop(at + 0.1);
    }
  }
  function squeaks() {                              // bats squeaking, high and quiet
    if (!st.sounds) return;
    const out = toCave(Math.random() * 1.6 - 0.8), t = ac.currentTime;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      const at = t + i * (0.12 + Math.random() * 0.1), f = 3000 + Math.random() * 1200;
      tone(f, 0.05, 'sine', 0.012, out, at, f * 1.25);
    }
  }
  function rumble() {                               // the rock settling, deep and far away (soft, slow)
    if (!st.sounds) return;
    const out = toCave(0), t = ac.currentTime;
    const src = ac.createBufferSource(); src.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 120;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + 2.4);
    src.connect(f).connect(g).connect(out); src.start(t, Math.random()); src.stop(t + 2.5);
  }
  function drip() {
    if (!ensure() || !st.sounds) return;
    const t = ac.currentTime, pan = Math.random() * 1.6 - 0.8, f = 650 + Math.random() * 700;
    const vol = 0.05 + Math.random() * 0.06;                           // some near, some far away
    dropAt(t, f, vol, pan);
    if (Math.random() < 0.3) dropAt(t + 0.35 + Math.random() * 0.4, f * (0.9 + Math.random() * 0.25), vol * 0.7, pan);
  }
  function lock() { if (!ready()) return; tone(1600, 0.03, 'square', 0.025); tone(1200, 0.04, 'square', 0.025, null, ac.currentTime + 0.09); }

  // ----- Forest sounds (background) -----
  function chirp(at, base, vol) {                                 // one little bird note
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(base, at); o.frequency.exponentialRampToValueAtTime(base * 1.35, at + 0.08);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.12);
    o.connect(g).connect(ambGain); o.start(at); o.stop(at + 0.15);
  }
  function bird() {
    const t = ac.currentTime, base = 1800 + Math.random() * 1400, n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) chirp(t + i * (0.13 + Math.random() * 0.08), base * (0.9 + Math.random() * 0.25), 0.035);
  }
  function crickets(night) {                                      // a quick "tri-tri-tri"
    const t = ac.currentTime, f = 4200 + Math.random() * 600;
    for (let i = 0; i < 3; i++) tone(f, 0.03, 'sine', 0.012 * night, ambGain, t + i * 0.05);
  }
  function hoot(at, f, dur) {                                     // soft and round, slow start
    const o = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, at); o.frequency.linearRampToValueAtTime(f * 0.9, at + dur);
    lp.type = 'lowpass'; lp.frequency.value = 800;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.06, at + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(lp).connect(g).connect(ambGain); o.start(at); o.stop(at + dur + 0.05);
  }
  function owl() {                                                // "hoo ... hoo-hoo"
    const t = ac.currentTime, f = 360 + Math.random() * 40;
    hoot(t, f, 0.5); hoot(t + 0.9, f, 0.3); hoot(t + 1.25, f * 0.97, 0.55);
  }
  function wolfHowl() {                                           // far away: quiet, slow, never sudden
    const t = ac.currentTime, dur = 3.2;
    const o = ac.createOscillator(), lfo = ac.createOscillator(), lfoGain = ac.createGain();
    const lp = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(540, t + 1.0);
    o.frequency.linearRampToValueAtTime(560, t + 2.0); o.frequency.linearRampToValueAtTime(400, t + dur);
    lfo.frequency.value = 5; lfoGain.gain.value = 7; lfo.connect(lfoGain).connect(o.frequency);
    lp.type = 'lowpass'; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.9);
    g.gain.linearRampToValueAtTime(0.04, t + 2.2); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp).connect(g).connect(ambGain);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }
  function updateAmbient(dt) {
    const tent = typeof Tent !== 'undefined' && Tent.isOpen(), under = World.isUnder();
    const want = st.ambient && !under ? S.ambientVolume * (tent ? S.insideTent : 1) : 0;   // no forest sounds underground
    ambGain.gain.setTargetAtTime(want, ac.currentTime, 0.8);       // fades in and out slowly
    windPhase += dt * 0.15;                                        // the wind slowly rises and falls
    windGain.gain.setTargetAtTime(0.14 + 0.08 * Math.sin(windPhase) + 0.04 * Math.sin(windPhase * 2.7), ac.currentTime, 1);
    leafGain.gain.setTargetAtTime(0.012 + 0.012 * Math.max(0, Math.sin(windPhase * 1.3)), ac.currentTime, 1);
    caveGain.gain.setTargetAtTime(under && st.sounds ? 1 : 0, ac.currentTime, 1.2);   // the cave hum fades in and out
    if (under) {                                                   // in every cave: dripping water and other soft cave sounds
      caveT += dt;
      caveAir.gain.setTargetAtTime(0.28 + 0.12 * Math.sin(caveT * 0.2) + 0.06 * Math.sin(caveT * 0.53), ac.currentTime, 1);
      timers.drip = (timers.drip || 2) - dt;
      if (timers.drip <= 0) { timers.drip = between(S.dripEvery); drip(); }
      timers.cave = (timers.cave === undefined ? 4 : timers.cave) - dt;
      if (timers.cave <= 0) {
        timers.cave = between(S.caveSoundEvery);
        const r = Math.random();
        if (r < 0.3) pebbles(); else if (r < 0.55) trickle(); else if (r < 0.8) squeaks(); else rumble();
      }
      return;
    }
    if (!st.ambient) return;
    const night = Time.nightAmount();
    timers.bird -= dt; timers.owl -= dt; timers.wolf -= dt; timers.cricket -= dt;
    if (timers.bird <= 0) { timers.bird = between(S.birdEvery); if (night < 0.3) bird(); }
    if (timers.cricket <= 0) { timers.cricket = 0.5 + Math.random() * 1.2; if (night > 0.3) crickets(night); }
    if (timers.owl <= 0) { timers.owl = between(S.owlEvery); if (night > 0.7) owl(); }
    if (timers.wolf <= 0) { timers.wolf = between(S.wolfEvery); if (night > 0.7) wolfHowl(); }
  }

  // ----- Music, now and then (like Minecraft): a piece plays for a while, then it is quiet. -----
  // Daytime: a calm, bright tune. Night: a slow, low, mysterious tune (soft, never sudden).
  const DAY = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 587.3];          // C major pentatonic
  const NIGHT = [110.0, 116.5, 130.8, 146.8, 155.6, 164.8, 196.0, 220.0]; // A with a dark, spooky colour
  let phraseEnd = 0, restEnd = 0, phraseNight = false;
  function startPhrase() {
    phraseNight = Time.nightAmount() > 0.5 || World.isUnder();      // in a cave: the mysterious tune
    phraseEnd = ac.currentTime + between(S.musicPlay);
    restEnd = phraseEnd + between(S.musicRest);
    nextNote = ac.currentTime + 0.3; beat = 0; note = phraseNight ? 3 : 2;
  }
  function schedule() {
    if (!ac) return;
    if (ac.currentTime >= restEnd) startPhrase();                  // quiet time is over: a new piece
    while (nextNote < ac.currentTime + 0.8) {
      if (nextNote >= phraseEnd) { nextNote = restEnd; break; }   // quiet until the next piece
      const night = phraseNight, scale = night ? NIGHT : DAY, step = night ? 1.7 : 0.85;
      if (beat % 8 === 0) {                        // a soft low chord (at night: a deep, slow drone)
        if (night) { tone(55, step * 8, 'sine', 0.08, musicGain, nextNote); tone(82.4, step * 8, 'sine', 0.04, musicGain, nextNote); }
        else { tone(scale[0] / 2, step * 7, 'sine', 0.07, musicGain, nextNote); tone(scale[3] / 2, step * 7, 'sine', 0.05, musicGain, nextNote); }
      }
      if (Math.random() > (night ? 0.4 : 0.25)) {  // the tune walks gently up and down
        note = Math.max(0, Math.min(scale.length - 1, note + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
        tone(scale[note], night ? 3.2 : 1.7, night ? 'sine' : 'triangle', night ? 0.1 : 0.09, musicGain, nextNote);
      }
      nextNote += step; beat++;
    }
  }
  // ----- Knight's Quest music, in the secret rooms: the same tunes, notes and waves as in the game -----
  const KQ_NOTE = name => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const m = /^([A-G]#?)(\d)$/.exec(name);
    return m ? 440 * Math.pow(2, (names.indexOf(m[1]) + (+m[2] + 1) * 12 - 69) / 12) : 440;
  };
  const KQ_TRACKS = {
    cheery: { stepMs: 190, wave: 'square', gain: 0.16,       // the forest levels
      lead: ['C5', 'E5', 'G5', 'E5', 'F5', 'A5', 'G5', 'E5', 'D5', 'F5', 'A5', 'F5', 'E5', 'G5', 'C6', 'G5'],
      bass: ['C3', null, 'G2', null, 'F2', null, 'C3', null, 'D3', null, 'A2', null, 'G2', null, 'G2', null] },
    beautiful: { stepMs: 340, wave: 'triangle', gain: 0.15,  // the princess is free
      lead: ['G4', 'B4', 'D5', 'G5', 'F#5', 'D5', 'B4', 'D5', 'E5', 'C5', 'A4', 'C5', 'B4', 'G4', 'D5', 'B4'],
      bass: ['G2', null, 'D3', null, 'E2', null, 'B2', null, 'C3', null, 'G2', null, 'D3', null, 'D3', null] },
    creepy: { stepMs: 420, wave: 'triangle', gain: 0.13,     // the dark levels
      lead: ['A3', null, 'C4', null, 'A3', 'G#3', null, null, 'F3', null, 'E3', null, null, 'D#3', null, null],
      bass: ['A1', null, null, null, 'F1', null, null, null, 'D1', null, null, null, 'E1', null, null, null] }
  };
  let kqGain = null, kqTimer = null, kqTrack = null, kqStep = 0, kqLevel = -1, kqLp = null, kqDry = null;
  // The tunes of Knight's Quest, played as quiet cave ambience: slower, with long echoes.
  // Smooth, not 8-bit: each note is two soft sine waves a tiny bit apart (a gentle shimmer) plus a very quiet
  // higher one for warmth. It swells in slowly and rings out, like a soft bell far away.
  function kqNote(freq, wave, ms, vol) {
    const t = ac.currentTime, g = ac.createGain(), dur = ms / 1000, att = CONFIG.sound.kqSoftness;
    const end = t + att + dur * 1.6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + att);                        // swells in, never a click
    g.gain.exponentialRampToValueAtTime(0.0001, end);                         // long, soft ring-out
    g.connect(kqGain);
    [[-4, 0.62], [4, 0.62], [1200, 0.1]].forEach(([cents, amt]) => {           // shimmer pair + a soft octave above
      const o = ac.createOscillator(), og = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.detune.setValueAtTime(cents, t);
      og.gain.value = amt; o.connect(og).connect(g); o.start(t); o.stop(end + 0.05);
    });
  }
  // track: 'cheery', 'beautiful', 'creepy', or null to stop. Our own music waits while it plays.
  // level: 0 to 1, how close you are to the room (1 = inside). Further away it is quieter and more muffled.
  function setKqLevel(level) {
    if (Math.abs(level - kqLevel) < 0.01) return;
    kqLevel = level;
    const t = ac.currentTime;
    kqGain.gain.cancelScheduledValues(t);
    kqGain.gain.setTargetAtTime(CONFIG.sound.kqMusic * level, t, 0.6);           // slow and smooth, never sudden
    kqLp.frequency.cancelScheduledValues(t);
    kqLp.frequency.setTargetAtTime(500 + 1100 * level, t, 0.6);                  // from behind the rock: muffled
    const E = CONFIG.sound.kqEcho;                                                // far away: mostly echo, little direct sound
    kqDry.gain.cancelScheduledValues(t);
    kqDry.gain.setTargetAtTime(E.dry * (E.dryFar + (1 - E.dryFar) * level), t, 0.6);
  }
  function kqMusic(track, level = 1) {
    if (!ensure()) return;
    if (!track) level = 0;
    if (track === kqTrack) { if (kqGain && track) setKqLevel(level); return; }
    if (!kqGain) {                                        // a little muffled, as if from far inside the rock, and echoing
      kqGain = ac.createGain(); kqGain.gain.value = 0;
      kqLp = ac.createBiquadFilter(); kqLp.type = 'lowpass'; kqLp.frequency.value = 1600;
      kqGain.connect(kqLp);
      const E = CONFIG.sound.kqEcho;
      kqDry = ac.createGain(); kqDry.gain.value = E.dry; kqLp.connect(kqDry); kqDry.connect(sfxGain);
      const pan = (node, p) => { if (!ac.createStereoPanner) return node; const sp = ac.createStereoPanner(); sp.pan.value = p; node.connect(sp); return sp; };
      // Quick reflections off the nearby rock walls: many small echoes, a little apart, some left, some right,
      // each one darker (rock swallows the high sounds). They blur together into the feeling of a stone room.
      const early = ac.createGain(); early.gain.value = E.earlyMix;
      const rockTone = ac.createBiquadFilter(); rockTone.type = 'lowpass'; rockTone.frequency.value = 2400;
      kqLp.connect(rockTone);
      for (let k = 0; k < E.early; k++) {
        const ms = E.earlyMs[0] + (E.earlyMs[1] - E.earlyMs[0]) * (k + Math.random() * 0.8) / E.early;
        const dl = ac.createDelay(1); dl.delayTime.value = ms / 1000;
        const g = ac.createGain(); g.gain.value = (0.9 - 0.6 * k / E.early) * (0.7 + Math.random() * 0.3);
        rockTone.connect(dl); dl.connect(g);
        pan(g, (k % 2 ? 1 : -1) * (0.3 + Math.random() * 0.5)).connect(early);
      }
      early.connect(sfxGain);
      // The far walls answer softly, once, a little later: darker and quieter, from both sides. No repeating.
      const wallTone = ac.createBiquadFilter(); wallTone.type = 'lowpass'; wallTone.frequency.value = 1100;
      kqLp.connect(wallTone);
      E.wall.forEach((t, k) => {
        const dl = ac.createDelay(2); dl.delayTime.value = t;
        const g = ac.createGain(); g.gain.value = E.wallMix * (k ? 0.7 : 1);
        wallTone.connect(dl); dl.connect(g); pan(g, k ? 0.6 : -0.6).connect(sfxGain);
      });
      // The long wash of a big cave (made inside the game): it starts a moment after the note, fades smoothly,
      // and gets darker as it fades, because high sounds die out first in real caves. Left and right differ a little.
      const sr = ac.sampleRate, len = Math.floor(sr * E.reverb), pre = Math.floor(sr * E.preDelay);
      const ir = ac.createBuffer(2, len + pre, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch); let lp = 0;
        for (let i = 0; i < len; i++) {
          const x = i / len, a = 0.15 + 0.8 * x;                             // the tone gets darker over time
          lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
          const swell = Math.min(1, i / (sr * 0.04));                         // the wash builds up smoothly
          d[i + pre] = lp * swell * Math.exp(-6.9 * x) * (1 + 1.5 * x);       // fades away (darker parts kept as loud)
        }
      }
      const rev = ac.createConvolver(); rev.buffer = ir;
      const revOut = ac.createGain(); revOut.gain.value = E.reverbMix;
      kqLp.connect(rev); rev.connect(revOut); revOut.connect(sfxGain);
    }
    if (kqTimer) { clearInterval(kqTimer); kqTimer = null; }
    kqTrack = track;
    kqGain.gain.cancelScheduledValues(ac.currentTime);
    if (!track) {
      kqLevel = -1;
      kqGain.gain.setTargetAtTime(0, ac.currentTime, 0.6);
      if (st.music) musicGain.gain.setTargetAtTime(0.8, ac.currentTime, 1.5);
      return;
    }
    musicGain.gain.setTargetAtTime(0, ac.currentTime, 0.4);
    kqLevel = -1; setKqLevel(level);                      // fades in, never sudden
    const def = KQ_TRACKS[track], stepMs = def.stepMs * CONFIG.sound.kqSlower;   // slower: ambient, not a level
    kqStep = 0;
    kqTimer = setInterval(() => {
      const lead = def.lead[kqStep % def.lead.length], bass = def.bass[kqStep % def.bass.length];
      if (lead) kqNote(KQ_NOTE(lead), def.wave, stepMs * 0.9, def.gain);
      if (bass) kqNote(KQ_NOTE(bass), 'triangle', stepMs * 1.6, def.gain * 0.8);
      kqStep++;
    }, stepMs);
  }
  function startMusic() {
    if (!ac || kqTrack) return;
    musicGain.gain.cancelScheduledValues(ac.currentTime);
    musicGain.gain.setTargetAtTime(0.8, ac.currentTime, 1.5);           // fades in slowly
    if (!musicTimer) { startPhrase(); musicTimer = setInterval(schedule, 200); }   // the first piece starts now
  }
  function stopMusic() {
    if (!ac) return;
    musicGain.gain.setTargetAtTime(0, ac.currentTime, 0.6);             // fades out
    setTimeout(() => { if (!st.music && musicTimer) { clearInterval(musicTimer); musicTimer = null; } }, 3000);
  }

  // ----- Buttons and keys -----
  const musicBtn = document.getElementById('musicBtn');
  const soundBtn = document.getElementById('soundBtn');
  const ambientBtn = document.getElementById('ambientBtn');
  const volumeEl = document.getElementById('volume');
  function showButtons() {
    musicBtn.textContent = st.music ? 'Music: ON' : 'Music: OFF';
    soundBtn.textContent = st.sounds ? 'Sounds: ON' : 'Sounds: OFF';
    ambientBtn.textContent = st.ambient ? 'Forest sounds: ON' : 'Forest sounds: OFF';
    volumeEl.value = Math.round(st.volume * 100);
  }
  function toggleMusic() {
    st.music = !st.music; store(); showButtons();
    if (!ensure()) return Hotbar.say('This browser cannot play sound.');
    st.music ? startMusic() : stopMusic();
    Hotbar.say(st.music ? 'Music on (M to turn it off).' : 'Music off.');
  }
  musicBtn.addEventListener('click', toggleMusic);
  soundBtn.addEventListener('click', () => {
    st.sounds = !st.sounds; store(); showButtons();
    if (ensure()) sfxGain.gain.setTargetAtTime(st.sounds ? 1 : 0, ac.currentTime, 0.1);
  });
  ambientBtn.addEventListener('click', () => {
    st.ambient = !st.ambient; store(); showButtons(); ensure();       // fades in or out in updateAmbient()
  });
  volumeEl.addEventListener('input', () => {
    st.volume = volumeEl.value / 100; store();
    if (ensure()) master.gain.setTargetAtTime(st.volume, ac.currentTime, 0.05);
  });
  window.addEventListener('keydown', e => { if (e.code === 'KeyM' && !e.repeat) toggleMusic(); });
  showButtons();

  return { hit, rifle, click, reload, update, chime, timber, sling, splat, bats, gate, lock, toss, howl, cast, bite, catchFish, reel, chainsaw,
           kqChest, kqCoin, flutter, kqMusic, squeaks: () => ac && squeaks(), kqPlaying: () => kqTrack, kqLevel: () => kqLevel, settings: () => ({ ...st }) };
})();
