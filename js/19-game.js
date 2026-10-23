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
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(t => { lastTime = t; frame(t); });
  }

  return { start };
})();

Game.start();
