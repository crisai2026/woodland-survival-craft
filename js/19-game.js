// MAIN MENU: the logo at the top, and big buttons like in Knight's Quest.
// When the game opens: Continue (your saved world) or New game. Esc during the game opens it again (Resume).
const Menu = (() => {
  const box = document.getElementById('mainMenu');
  const buttonsEl = document.getElementById('menuButtons');
  const noteEl = document.getElementById('menuNote');
  const skipKey = CONFIG.save.key + '-skip-menu';   // just started a new world: go straight into it
  let open = false, paused = false, saved = false, cursor = 0, confirm = false;

  // The logo: a pixel forest, an axe and a pickaxe, and the name of the game. Nothing moves.
  function drawLogo() {
    const c = document.getElementById('menuLogo'), g = c.getContext('2d'), W = c.width;
    g.clearRect(0, 0, W, c.height);
    g.imageSmoothingEnabled = false;
    const tree = (x, y, s) => {                                     // a blocky pine tree
      g.fillStyle = '#6e4a2c'; g.fillRect(x - s, y, s * 2, s * 3);
      [['#2f6b2c', 0], ['#3f7a3a', 1], ['#468541', 2]].forEach(([col, k]) => {
        const w = (7 - k * 2) * s, top = y - (k + 1) * s * 3;
        g.fillStyle = col; g.fillRect(x - w, top, w * 2, s * 3);
      });
    };
    tree(52, 168, 5); tree(104, 178, 4); tree(W - 52, 168, 5); tree(W - 104, 178, 4);
    g.fillStyle = '#3f5a33'; g.fillRect(14, 190, W - 28, 6);         // a strip of ground
    g.drawImage(Icons.canvas('woodAxe'), W / 2 - 52, 6, 48, 48);    // the tools of a lumberjack
    g.drawImage(Icons.canvas('stonePickaxe'), W / 2 + 4, 6, 48, 48);
    g.textAlign = 'center';
    g.fillStyle = 'rgba(0, 0, 0, 0.45)'; g.font = 'bold 58px serif'; g.fillText('Woodland', W / 2 + 3, 117);
    g.fillStyle = '#fbbf24'; g.fillText('Woodland', W / 2, 114);
    g.fillStyle = 'rgba(0, 0, 0, 0.45)'; g.font = 'bold 40px serif'; g.fillText('Survival Craft', W / 2 + 2, 163);
    g.fillStyle = '#f8fafc'; g.fillText('Survival Craft', W / 2, 161);
  }

  // The background: the lumberjack stands on a grassy hill on the left and looks out over the forest
  // (a calm evening sky, mountains, rows of pine trees and a lake). Pixel art like the game. Nothing moves.
  const LUMBERJACK = [            // facing right, his axe stuck in a tree stump next to him. Dressed like Felix:
    '....SSSS......',             // a red hoodie with the hood up (white drawstrings, a front pocket),
    '...SSSSSS.....',             // shorts, and white sneakers with a green line
    '...Shsssss....',
    '...Ssssses....',
    '...Sssssss....',
    '...Shhhhs.....',
    '...SShhh......',
    '...SSwSwS.....',
    '..SSSwSwSSssa.',
    '..SSSSSSS...a.',
    '..SDDDDDS...a.',
    '..SDSSSDS...a.',
    '..DDDDDDD...a.',
    '...jjjjj....a.',
    '...jj.jj....a.',
    '...ss.ss...mam',
    '...ss.ss...mmm',
    '...ww.ww..TTTT',
    '..wgw.wgw.tttt',
    '..........tttt'];
  const LJ_COLORS = { k: '#7f2e28', h: '#4b3526', s: '#e2b78d', e: '#2b2b2b', S: '#b5463b', D: '#7f2e28',
                      j: '#3d5778', J: '#2e4460', b: '#5a3e2a', a: '#7a5230', m: '#a8adb0', T: '#c9a27a', t: '#6e4a2c',
                      w: '#f4f4f0', g: '#3fa34d' };
  function drawBackground() {
    const c = document.getElementById('menuBg');
    const px = Math.max(3, Math.round(window.innerHeight / 210));          // one blocky pixel = px screen pixels
    const W = Math.ceil(window.innerWidth / px), H = Math.ceil(window.innerHeight / px);
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    const rnd = World.makeRandom(7);                                     // the same picture every time
    const rect = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    // Sky: soft bands from blue to a warm evening glow near the hills.
    const sky = ['#5b7fa6', '#6b8db0', '#7c9bb8', '#8faabe', '#a7b8c0', '#c2c1b8', '#d9c6a8', '#e8c99a'];
    const skyH = H * 0.62;
    sky.forEach((col, i) => rect(col, 0, skyH * i / sky.length, W, skyH / sky.length + 1));
    // The sun, low and soft, with a gentle glow.
    const sunX = W * 0.72, sunY = H * 0.47;
    [[16, 'rgba(255, 236, 190, 0.18)'], [11, 'rgba(255, 236, 190, 0.28)'], [6, '#fbe7b5']].forEach(([r, col]) => {
      g.fillStyle = col; g.beginPath(); g.arc(sunX, sunY, r, 0, Math.PI * 2); g.fill();
    });
    // A few blocky clouds.
    [[0.12, 0.12, 22], [0.42, 0.2, 16], [0.82, 0.1, 26], [0.62, 0.3, 12]].forEach(([fx, fy, w]) => {
      const x = W * fx, y = H * fy;
      rect('rgba(244, 240, 230, 0.75)', x, y, w, 3); rect('rgba(244, 240, 230, 0.75)', x + 3, y - 2, w - 7, 2);
      rect('rgba(214, 214, 214, 0.55)', x + 2, y + 3, w - 4, 1);
    });
    // Far mountains (blue-grey), then nearer ones.
    const ridge = (base, amp, col, step) => {
      let y = base;
      for (let x = 0; x < W; x += step) {
        y = Math.max(base - amp, Math.min(base + amp * 0.3, y + (rnd() - 0.5) * amp * 0.5));
        rect(col, x, y, step, H - y);
      }
    };
    ridge(H * 0.5, H * 0.1, '#7d8fa6', 2);
    ridge(H * 0.56, H * 0.07, '#6c8296', 2);
    // Pine trees, row after row: further away they are smaller and more blue.
    const pine = (x, base, h, col, trunk) => {
      for (let r = 0; r < h; r++) { const hw = Math.floor(r * 0.36) + (r % 3 === 2 ? 1 : 0); rect(col, x - hw, base - h + r, hw * 2 + 1, 1); }
      if (trunk) rect(trunk, x, base, 1, Math.max(1, Math.round(h / 6)));
    };
    const rowOfTrees = (base, hMin, hMax, gap, col, ground) => {
      rect(ground, 0, base, W, H - base);
      for (let x = -4; x < W + 4; x += gap * (0.7 + rnd() * 0.6)) pine(Math.round(x), Math.round(base + rnd() * 2), Math.round(hMin + rnd() * (hMax - hMin)), col, null);
    };
    rowOfTrees(H * 0.62, 6, 10, 4, '#4f6f6a', '#4f6f6a');
    // The lake in the valley, catching the evening light.
    const lx = W * 0.62, ly = H * 0.7, lw = W * 0.26, lh = H * 0.045;
    g.fillStyle = '#7fa3bf'; g.beginPath(); g.ellipse(lx, ly, lw, lh, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a9c4d6'; g.beginPath(); g.ellipse(lx, ly - lh * 0.25, lw * 0.85, lh * 0.45, 0, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 6; k++) rect('#f3dfae', sunX - 6 + rnd() * 12, ly - lh * 0.5 + k * 1.6, 3 + rnd() * 6, 1);   // the sun on the water
    rowOfTrees(H * 0.74, 9, 15, 5, '#3d5e48', '#3d5e48');
    rowOfTrees(H * 0.86, 14, 22, 7, '#2f4d38', '#2f4d38');
    // The grassy hill on the left, where the lumberjack stands.
    const topX = Math.round(Math.min(W * 0.18, 60)), topY = Math.round(H * 0.6), spread = Math.max(W * 0.34, 90);
    for (let x = 0; x < W; x++) {
      const y = Math.round(topY + Math.pow((x - topX) / spread, 2) * H * 0.55);
      if (y >= H) continue;
      rect('#6f9a4e', x, y, 1, H - y);
      rect('#8ab35e', x, y, 1, 1);                                            // a light edge on top
      rect('#5f8a43', x, y + Math.round((H - y) * 0.5), 1, H);                 // a little darker lower down
    }
    for (let k = 0; k < 14; k++) {                                              // little flowers and grass tufts
      const x = Math.round(rnd() * spread * 1.1), y = Math.round(topY + Math.pow((x - topX) / spread, 2) * H * 0.55) + 2 + Math.round(rnd() * 12);
      if (y < H - 1) rect(k % 3 ? '#4f7f3a' : ['#f2d6e0', '#f4f1e6', '#e8c547'][k % 3 === 0 ? (k / 3) % 3 : 0], x, y, 1, k % 3 ? 2 : 1);
    }
    // Big dark pines in the front on the right.
    for (let x = W * 0.78; x < W + 6; x += 9 + rnd() * 6) pine(Math.round(x), H + 2, Math.round(26 + rnd() * 12), '#24402c', '#4a3324');
    // The lumberjack on top of the hill, looking out over the forest, with a soft shadow.
    const k = H > 150 ? 2 : 1;                                          // bigger lumberjack on bigger screens
    const sx = topX - 6 * k, sy = topY - 19 * k;
    rect('rgba(0, 0, 0, 0.18)', sx + 2 * k, topY, 10 * k, k);
    LUMBERJACK.forEach((row, r) => [...row].forEach((ch, col) => { if (ch !== '.') rect(LJ_COLORS[ch], sx + col * k, sy + r * k, k, k); }));
  }
  window.addEventListener('resize', () => { if (open) drawBackground(); });

  function items() {
    return [paused ? { key: 'resume', label: 'Resume', on: true } : { key: 'continue', label: 'Continue', on: saved },
            { key: 'new', label: 'New game', on: true }];
  }
  function render() {
    const list = items();
    buttonsEl.innerHTML = list.map((it, i) =>
      `<button class="menuBtn${i === cursor ? ' active' : ''}" data-i="${i}" ${it.on ? '' : 'disabled'}>${it.label}</button>`).join('<div style="height:14px"></div>');
    if (confirm) noteEl.innerHTML = '<span class="warn">Start over? Your world and your things will be lost.</span><br>Click New game again to confirm · Esc to cancel';
    else noteEl.innerHTML = 'Arrows / W-S to choose · Enter or click to pick' +
                            (!paused && !saved ? '<br>No saved game yet — start a new game.' : '');
  }
  function show(asPause) {
    open = true; paused = asPause; confirm = false;
    cursor = !paused && !saved ? 1 : 0;
    Mechanics.clearKeys();
    document.body.classList.add('menuOpen');
    box.classList.add('open');
    drawBackground(); drawLogo(); render();
  }
  function close() {
    open = false; confirm = false;
    box.classList.remove('open');
    document.body.classList.remove('menuOpen');
    Mechanics.clearKeys();
  }
  function pick(i) {
    const it = items()[i];
    if (!it || !it.on) return;
    if (it.key === 'continue' || it.key === 'resume') { close(); if (it.key === 'continue') Hotbar.say('Welcome back!'); return; }
    // New game: with a world to lose, ask once more first.
    if ((saved || paused) && !confirm) { confirm = true; cursor = i; render(); return; }
    if (saved || paused) {
      try { sessionStorage.setItem(skipKey, '1'); } catch (e) {}
      Save.newWorld();                                  // the page starts again, straight into the new world
      return;
    }
    close();                                            // no saved world yet: this fresh forest is the new game
    Hotbar.say('A new forest! Chop a tree to start.');
  }

  buttonsEl.addEventListener('mousemove', e => {
    const b = e.target.closest('.menuBtn');
    if (b && !b.disabled && +b.dataset.i !== cursor) { cursor = +b.dataset.i; confirm = confirm && items()[cursor].key === 'new'; render(); }
  });
  buttonsEl.addEventListener('click', e => { const b = e.target.closest('.menuBtn'); if (b) pick(+b.dataset.i); });
  window.addEventListener('keydown', e => {
    if (!open) {                                         // Esc during the game (nothing else open): the menu, as a pause
      if (e.code === 'Escape' && !e.defaultPrevented && !e.invClosed && !Screens.busy() && !InventoryScreen.isOpen()) { e.preventDefault(); show(true); }
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
    const n = items().length;
    const move = d => { do { cursor = (cursor + d + n) % n; } while (!items()[cursor].on); confirm = false; render(); };
    if (e.code === 'ArrowUp' || e.code === 'KeyW') move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') move(1);
    else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') { if (!e.repeat) pick(cursor); }
    else if (e.code === 'Escape') { if (confirm) { confirm = false; render(); } else if (paused) close(); }
  }, true);                                              // first, so nothing else in the game reacts while the menu is open

  // When the game opens: show the menu (unless you just chose New game).
  function start(hasSave) {
    saved = hasSave;
    let skip = false;
    try { skip = sessionStorage.getItem(skipKey) === '1'; sessionStorage.removeItem(skipKey); } catch (e) {}
    if (skip) { Hotbar.say('A new forest! Chop a tree to start.'); return; }
    show(false);
  }

  return { start, show, close, isOpen: () => open };
})();

const Game = (() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const dark = document.createElement('canvas');     // the night layer, with holes for lights
  const dctx = dark.getContext('2d');
  let viewW = 0, viewH = 0, dpr = 1, lastTime = 0, saveTimer = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    viewW = window.innerWidth; viewH = window.innerHeight;
    canvas.width = dark.width = Math.floor(viewW * dpr);
    canvas.height = dark.height = Math.floor(viewH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }

  function drawNight(camX, camY) {
    const amount = World.isUnder() ? CONFIG.caves.darkness : Time.nightAmount() * CONFIG.time.maxDarkness;
    if (amount < 0.01) return;
    dctx.globalCompositeOperation = 'source-over';
    dctx.clearRect(0, 0, viewW, viewH);
    dctx.fillStyle = `rgba(${CONFIG.colors.night}, ${amount})`;
    dctx.fillRect(0, 0, viewW, viewH);
    dctx.globalCompositeOperation = 'destination-out';
    const pl = Mechanics.player;
    const lights = World.lights(camX, camY, viewW, viewH).concat(Animals.lights(camX, camY), Under.lights(camX, camY));
    const own = World.isUnder() ? CONFIG.caves.playerLight : CONFIG.player.light;
    lights.push({ x: pl.x - camX, y: pl.y - camY, r: Math.max(own, Inventory.best(it => it.light, it => it.light)) });
    lights.forEach(l => {
      const g = dctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.55, 'rgba(0,0,0,0.75)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.fillStyle = g;
      dctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    });
    ctx.drawImage(dark, 0, 0, viewW, viewH);
  }

  function draw() {
    const pl = Mechanics.player;
    const camX = Math.round(pl.x - viewW / 2);
    const camY = Math.round(pl.y - viewH / 2);
    ctx.fillStyle = World.isUnder() ? CONFIG.colors.caveRock[1] : CONFIG.colors.outside;
    ctx.fillRect(0, 0, viewW, viewH);
    World.draw(ctx, camX, camY, viewW, viewH);
    Under.draw(ctx, camX, camY, viewW, viewH);
    Animals.draw(ctx, camX, camY, viewW, viewH);
    Drops.draw(ctx, camX, camY);
    Under.drawCoins(ctx, camX, camY);
    Mechanics.drawPlayer(ctx, pl.x - camX, pl.y - camY);
    Mechanics.drawShot(ctx, camX, camY);
    drawNight(camX, camY);
    Easter.draw(ctx, camX, camY);
    Hud.draw(ctx, viewW);
  }

  // If something unexpected goes wrong, the game keeps running and the details go to the console.
  let errorShown = false;
  function frame(time) {
    try { step(time); }
    catch (e) {
      console.error('Woodland Survival Craft error:', e && e.stack || e);
      if (!errorShown) { errorShown = true; Hotbar.say('Something went wrong, but the game keeps going.'); }
      lastTime = time;
    }
    requestAnimationFrame(frame);
  }

  function step(time) {
    const dt = Math.min((time - lastTime) / 1000, CONFIG.game.maxFrameTime);
    lastTime = time;
    // The world pauses while the inventory is open, while sleeping, and after fainting.
    if (!InventoryScreen.isOpen() && !Screens.busy()) {
      Time.update(dt);
      World.update(dt);
      Animals.update(dt);
      Mechanics.update(dt);
      Drops.update(dt);
      Under.update(dt);
      Easter.update(dt);
      saveTimer += dt;
      if (saveTimer >= CONFIG.save.everySeconds) { saveTimer = 0; Save.write(); }
    }
    // Campfire sound: louder as you come closer (quieter while the game waits).
    const pl = Mechanics.player, hear = CONFIG.sound.fireHearDistance;
    const d = World.nearestDistance(pl.x, pl.y, 'campfire', hear);
    const paused = InventoryScreen.isOpen() || Screens.busy();
    let fire = d < hear ? (1 - d / hear) * (paused ? 0.4 : 1) : 0;
    if (Tent.isOpen()) fire = Math.max(fire * 0.4, Tent.fireLevel());   // the furnace inside the tent
    Sound.update(dt, fire);
    Goals.update();
    draw();
  }

  function start() {
    const saved = Save.read();
    let loaded = false;
    if (saved && saved.version === 1) {
      try {
        World.load(saved.world, !!(saved.player && 'loaded' in saved.player), saved.player);
        Animals.load(saved.animals);
        Drops.load(saved.drops || []);
        Mechanics.load(saved.player);
        Inventory.load(saved.inventory);
        Time.load(saved.time);
        loaded = true;
      } catch (e) { loaded = false; }
    }
    if (!loaded) {
      World.generate(Save.nextSeed());
      Mechanics.init();
      Animals.init();
      Screens.setHelp(true);            // show the controls on the very first visit
    }
    Hotbar.render();
    Menu.start(loaded);
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(t => { lastTime = t; frame(t); });
  }

  return { start };
})();

Game.start();
