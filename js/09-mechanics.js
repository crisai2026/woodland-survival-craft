const Mechanics = (() => {
  const P = CONFIG.player;
  const ACT = CONFIG.actions;
  const S = CONFIG.survival;
  const C = CONFIG.colors;
  const keys = new Set();      // keys held down now
  const tapped = new Set();    // keys pressed since the last frame (so quick taps count)
  const keyMap = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    KeyF: 'action', Space: 'jump', KeyQ: 'place', KeyR: 'use'
  };

  window.addEventListener('keydown', e => {
    const k = keyMap[e.code];
    if (k) { keys.add(k); if (!e.repeat) tapped.add(k); e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    const k = keyMap[e.code];
    if (k) keys.delete(k);
  });
  window.addEventListener('blur', () => clearKeys());   // no stuck keys
  // The right mouse button works like holding R (like eating in Minecraft).
  const gameCanvas = document.getElementById('game');
  gameCanvas.addEventListener('contextmenu', e => e.preventDefault());
  gameCanvas.addEventListener('mousedown', e => { if (e.button === 2) { keys.add('use'); tapped.add('use'); } });
  window.addEventListener('mouseup', e => { if (e.button === 2) keys.delete('use'); });
  function down(k) { return keys.has(k) || tapped.has(k); }
  function clearKeys() { keys.clear(); tapped.clear(); }
  // (eating stops when keys are cleared, because R is no longer held)

  const player = { x: 0, y: 0, angle: 0, targetAngle: 0, walkTime: 0, cooldown: 0, swing: 0, jump: 0,
                   eatT: 0, reloadT: 0, reloading: false };
  // The rifle: shots loaded now, and the thin line of the last shot.
  const RF = CONFIG.rifle;
  let loaded = 0, shotLine = null, lastEmptyMessage = -1e9;
  function holdingRifle() { const s = Inventory.selectedItem(); return !!(s && CONFIG.items[s.id].gun); }
  function holdingSling() { const s = Inventory.selectedItem(); return !!(s && CONFIG.items[s.id].sling); }
  function holding(id) { const s = Inventory.selectedItem(); return !!(s && s.id === id); }
  function holdingSaw() { const s = Inventory.selectedItem(); return !!(s && CONFIG.items[s.id].saw); }
  // The garlic slingshot: garlic flying through the air (slowly, so you can see it).
  const SL = CONFIG.slingshot;
  let garlicShots = [], lastNoGarlic = -1e9;
  function fireSling() {
    player.cooldown = SL.cooldown;
    if (!Inventory.count('garlic')) {
      const now = performance.now();
      if (now - lastNoGarlic > 2500) { lastNoGarlic = now; Hotbar.say('No garlic. Pick wild garlic (white flowers) or grow some.'); }
      return;
    }
    Inventory.take('garlic', 1);
    player.swing = ACT.swingTime;
    Sound.sling();
    const a = player.targetAngle - Math.PI / 2, start = P.hitbox / 2 + 4;
    garlicShots.push({ x: player.x + Math.cos(a) * start, y: player.y + Math.sin(a) * start,
                       dx: Math.cos(a), dy: Math.sin(a), d: 0 });
  }
  function updateSling(dt) {
    garlicShots.forEach(g => {
      const step = SL.speed * dt, nx = g.x + g.dx * step, ny = g.y + g.dy * step;
      const animal = Animals.findNear(nx, ny, 0.45);
      if (animal) {                                    // a hit: the garlic is used up
        g.done = true;
        Sound.splat();
        const drops = Animals.hit(animal, 1, true);
        const at = animal.kind === 'vampire' ? player : animal;   // the vampire's gift lands next to you
        if (drops) Object.entries(drops).forEach(([item, n]) => Drops.spawn(item, n, at.x, at.y));
        return;
      }
      if (World.isSolidAt(nx, ny) || g.d + step > SL.range) {   // a miss: the garlic lands, you can pick it up again
        g.done = true;
        Drops.spawn('garlic', 1, g.x, g.y);
        return;
      }
      g.x = nx; g.y = ny; g.d += step;
    });
    garlicShots = garlicShots.filter(g => !g.done);
  }
  // ----- Fishing -----
  // F with the rod facing water: the line goes in. Wait calmly. When a fish bites, a steady "!" shows
  // over the bobber and a soft sound plays: press F again to catch it. No hurry, no penalty.
  const FI = CONFIG.fishing;
  let line = null;             // { x, y, phase: 'wait' | 'bite', t, biteAt }
  function holdingRod() { const s = Inventory.selectedItem(); return !!(s && CONFIG.items[s.id].rod); }
  function newBite() { return FI.biteMin + Math.random() * (FI.biteMax - FI.biteMin); }
  function useRod() {
    player.cooldown = 0.3;
    if (line) {
      if (line.phase === 'bite') return catchFish();
      line = null; Sound.reel();
      return Hotbar.say('You pulled the line in.');
    }
    const ts = CONFIG.world.tileSize;
    for (let steps = 1; steps <= FI.reach; steps++) {
      const t = frontTile(steps);
      if (!World.isWater(t.tx, t.ty)) continue;
      line = { x: (t.tx + 0.3 + Math.random() * 0.4) * ts, y: (t.ty + 0.3 + Math.random() * 0.4) * ts, phase: 'wait', t: 0, biteAt: newBite() };
      player.swing = ACT.swingTime;
      Sound.cast();
      return Hotbar.say('The line is in the water. Wait for a fish to bite...');
    }
    Hotbar.say('Face the water (a pond or a river) and press F to fish.');
  }
  function catchFish() {
    const id = Math.random() < FI.salmonChance ? 'salmon' : 'fish';
    line = null;
    Sound.catchFish();
    const left = Inventory.add(id, 1);
    if (left) Drops.spawn(id, 1, player.x, player.y);
    stats.fished = (stats.fished || 0) + 1;
    Hotbar.say(id === 'salmon' ? 'You caught a salmon! A big one.' : 'You caught a fish!');
  }
  function updateFishing(dt) {
    if (!line) return;
    if (!holdingRod() || Math.hypot(player.x - line.x, player.y - line.y) > FI.walkAway) { line = null; return; }
    line.t += dt;
    if (line.phase === 'wait' && line.t >= line.biteAt) {
      line.phase = 'bite'; line.t = 0;
      Sound.bite();
      Hotbar.say('A fish is biting! Press F now.');
    } else if (line.phase === 'bite' && line.t >= FI.biteWindow) {
      line.phase = 'wait'; line.t = 0; line.biteAt = newBite();
      Hotbar.say('The fish swam away. Wait, another one will come.');
    }
  }
  function drawLine(ctx, camX, camY) {
    if (!line) return;
    const a = player.angle - Math.PI / 2, p = P.size / 13;
    const hx = player.x + Math.cos(a) * 6 * p - Math.sin(a) * 6 * p, hy = player.y + Math.sin(a) * 6 * p + Math.cos(a) * 6 * p;
    const bx = Math.round(line.x - camX), by = Math.round(line.y - camY) + (line.phase === 'bite' ? 3 : 0);
    ctx.strokeStyle = C.fishLine; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx - camX, hy - camY); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = C.waterLight; ctx.lineWidth = 1.5;                       // a still ring around the bobber
    ctx.beginPath(); ctx.arc(bx, by + 2, line.phase === 'bite' ? 9 : 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = C.bobber;    ctx.fillRect(bx - 3, by - 3, 6, 6);           // the bobber (dips a little when a fish bites)
    ctx.fillStyle = C.bobberTop; ctx.fillRect(bx - 3, by - 3, 6, 2);
    if (line.phase === 'bite') {                                                // a steady "!" (no blinking)
      ctx.fillStyle = C.alertBox; ctx.fillRect(bx - 7, by - 30, 14, 18);
      ctx.fillStyle = C.alertText; ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', bx, by - 16); ctx.textAlign = 'left';
    }
  }
  let useLock = false;         // true while R is held after using it on a bed or campfire
  const survival = { health: S.maxHealth, hunger: S.maxHunger, hungerT: 0, starveT: 0, healT: 0 };
  let home = null;             // where you wake up (last bed or tent you slept in)
  let stats = freshStats();
  function freshStats() { return { broke: {}, crafted: {}, placed: {}, ate: 0, slept: 0, cooked: 0 }; }
  function cooked() { stats.cooked = (stats.cooked || 0) + 1; }
  function count(group, id) { stats[group][id] = (stats[group][id] || 0) + 1; }

  function init() {
    const s = World.spawnPoint();
    player.x = s.x; player.y = s.y;
  }

  function canStand(x, y) {
    const h = P.hitbox / 2;
    if (World.isSolidAt(x - h, y - h) || World.isSolidAt(x + h, y - h) ||
        World.isSolidAt(x - h, y + h) || World.isSolidAt(x + h, y + h)) return false;
    return !Animals.blocksAt(x, y, h, null, true);     // you can walk past your dog
  }

  function facingPoint(dist) {
    const a = player.targetAngle - Math.PI / 2;
    return { x: player.x + Math.cos(a) * dist, y: player.y + Math.sin(a) * dist };
  }

  // The square next to you in the direction you face (up, down, left or right).
  function frontTile(steps = 1) {
    const a = player.targetAngle - Math.PI / 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    const t = World.tileOf(player.x, player.y);
    if (Math.abs(dx) >= Math.abs(dy)) t.tx += Math.sign(dx) * steps; else t.ty += Math.sign(dy) * steps;
    return t;
  }

  function nearTable()    { return World.hasNear(player.x, player.y, 'table', CONFIG.crafting.tableReach); }
  function nearCampfire() { return World.hasNear(player.x, player.y, 'campfire', CONFIG.crafting.campfireReach); }

  function toolPower(tool) {
    const best = Inventory.best(it => it.tool === tool, it => it.power);
    return tool === 'axe' ? Math.max(CONFIG.tools.basicAxePower, best) : best;
  }
  function huntPower() {
    const axe = Math.max(CONFIG.tools.basicAxePower, Inventory.best(it => it.tool === 'axe' && !it.saw, it => it.power));
    return Math.max(CONFIG.tools.basicHuntPower, Inventory.best(it => it.hunt, it => it.hunt), axe);
  }

  // F with the rifle: one shot in the direction you face.
  function shoot() {
    player.cooldown = RF.cooldown;
    if (player.reloading) return;
    if (loaded === 0) {
      Sound.click();
      const now = performance.now();
      if (now - lastEmptyMessage > 2500) {
        lastEmptyMessage = now;
        Hotbar.say(Inventory.count('ammo') ? 'Out of ammo. Press R to reload.' : 'No ammo. Make some at the crafting table (iron + coal).');
      }
      return;
    }
    loaded--;
    Inventory.changed();
    Sound.rifle();
    const a = player.targetAngle - Math.PI / 2, dx = Math.cos(a), dy = Math.sin(a);
    const startD = P.hitbox / 2 + 4;
    let endD = RF.range, hit = null;
    for (let d = startD; d <= RF.range; d += 4) {
      const x = player.x + dx * d, y = player.y + dy * d;
      hit = Animals.findNear(x, y, 0.45);
      if (hit) { endD = d; break; }
      if (World.isSolidAt(x, y)) { endD = d; break; }        // trees, rocks and walls stop the shot
    }
    shotLine = { x1: player.x + dx * startD, y1: player.y + dy * startD,
                 x2: player.x + dx * endD,   y2: player.y + dy * endD, t: RF.lineTime };
    if (hit) {
      const drops = Animals.hit(hit, RF.power);
      if (drops) Object.entries(drops).forEach(([item, n]) => Drops.spawn(item, n, hit.x, hit.y));
    }
  }

  // R with the rifle: reload from the ammo in your inventory.
  function startReload() {
    if (player.reloading) return null;
    if (loaded >= RF.shots) return `The rifle is full (${loaded}/${RF.shots}).`;
    if (!Inventory.count('ammo')) return 'No ammo. Make some at the crafting table (iron + coal).';
    player.reloading = true; player.reloadT = 0;
    Sound.click();
    return 'Reloading...';
  }
  function updateReload(dt) {
    if (!player.reloading) return;
    if (!holdingRifle()) { player.reloading = false; player.reloadT = 0; return; }   // changed item: stop
    player.reloadT += dt;
    if (player.reloadT >= RF.reloadTime) {
      player.reloading = false; player.reloadT = 0;
      loaded += Inventory.take('ammo', RF.shots - loaded);
      Inventory.changed();
      Sound.reload();
      Hotbar.say(`Reloaded: ${loaded}/${RF.shots}.`);
    }
  }

  // F: hit the animal or thing just in front of the player.
  function useAxe() {
    const saw = holdingSaw();
    player.swing = ACT.swingTime;
    player.cooldown = saw ? CONFIG.tools.chainsawCooldown : ACT.cooldown;
    const r = facingPoint(ACT.reach);
    const animal = Animals.findNear(r.x, r.y);
    if (animal && saw) { Hotbar.say('The chainsaw is only for trees and wood. Choose another item to hunt.'); player.cooldown = 1; return; }
    if (animal) {
      const drops = Animals.hit(animal, huntPower());
      Sound.hit('animal');
      if (drops) Object.entries(drops).forEach(([item, n]) => Drops.spawn(item, n, animal.x, animal.y));
      return;
    }
    const target = World.breakableAt(r.x, r.y);
    if (!target) return;
    const gate = World.gateAt(target.tx, target.ty);
    if (gate && gate.locked) { Hotbar.say('The gate is locked. Unlock it with your gate key first.'); return; }
    const power = toolPower(target.block.tool);
    if (power === 0) { Hotbar.say('You need a pickaxe for this. Make one at a crafting table.'); return; }
    if (power < (target.block.minPower || 0)) { Hotbar.say(`You need a stone pickaxe for ${target.name === 'gold' ? 'gold' : 'iron'}.`); return; }
    if (saw && target.block.tool !== 'axe') { Hotbar.say('The chainsaw is only for trees and wood.'); player.cooldown = 1; return; }
    if (saw) Sound.chainsaw(); else Sound.hit(target.name === 'crackedRock' ? 'hollow' : target.block.plant ? 'plant' : target.block.tool === 'pickaxe' ? 'stone' : 'wood');
    const drops = World.hitBlock(target.tx, target.ty, power);
    if (!drops && target.name === 'crackedRock') Hotbar.say('This rock sounds hollow...');
    if (drops) {
      count('broke', target.name);
      if (World.isUnder() && (target.name === 'coal' || target.name === 'iron' || target.name === 'gold')) stats.caveOre = (stats.caveOre || 0) + 1;
      if (target.name === 'tree') Sound.timber();     // creak, then the tree falls with a soft crash
      const ts = CONFIG.world.tileSize;
      Object.entries(drops).forEach(([item, n]) => Drops.spawn(item, n, (target.tx + 0.5) * ts, (target.ty + 0.5) * ts));
    }
  }

  // Q: place the item in the chosen hotbar slot on the square in front of you.
  function placeSelected() {
    const s = Inventory.selectedItem();
    if (!s) return 'Your hand is empty. Choose an item with a number key.';
    const item = CONFIG.items[s.id];
    if (item.insideTent) {
      Screens.notice(`You can't place your ${item.name.toLowerCase()} outside of your tent. Face your tent and press R to go inside, then place it there.`);
      return null;
    }
    if (!item.placeable) return `${item.name} can't be placed.`;
    if (World.isUnder() && item.placeable === 'tent') return 'Put your tent outside, in the forest.';
    if (World.isUnder() && item.placeable === 'garlic0') return 'Garlic needs sunlight. Plant it outside.';
    if (item.placeable === 'gate') return placeGate();
    const ts = CONFIG.world.tileSize, h = P.hitbox / 2;
    for (const steps of [1, 2]) {                // if you are too close, try one square further
      const { tx, ty } = frontTile(steps);
      const cx = (tx + 0.5) * ts, cy = (ty + 0.5) * ts;
      const onPlayer = Math.abs(player.x - cx) < h + ts / 2 && Math.abs(player.y - cy) < h + ts / 2;
      if (onPlayer || Animals.blocksAt(cx, cy, ts / 2, null)) continue;
      if (World.place(tx, ty, item.placeable)) {
        Inventory.takeOne(Inventory.selected());
        count('placed', item.placeable);
        return null;
      }
      break;
    }
    return 'No space here. Face open grass.';
  }

  // Q with a gate: it is 2 squares wide and goes across the way you are facing.
  // It uses the square in front of you and the one next to it (right first, then left).
  function placeGate() {
    const ts = CONFIG.world.tileSize, h = P.hitbox / 2;
    const a = player.targetAngle - Math.PI / 2, dir = Math.abs(Math.sin(a)) > Math.abs(Math.cos(a)) ? 'h' : 'v';
    const free = (tx, ty) => {
      const cx = (tx + 0.5) * ts, cy = (ty + 0.5) * ts;
      return !(Math.abs(player.x - cx) < h + ts / 2 && Math.abs(player.y - cy) < h + ts / 2) && !Animals.blocksAt(cx, cy, ts / 2, null);
    };
    for (const steps of [1, 2]) {
      const t = frontTile(steps);
      for (const shift of [0, -1]) {               // the front square is the left/top door, or the right/bottom door
        const tx = dir === 'h' ? t.tx + shift : t.tx, ty = dir === 'h' ? t.ty : t.ty + shift;
        const tx2 = dir === 'h' ? tx + 1 : tx, ty2 = dir === 'h' ? ty : ty + 1;
        if (!free(tx, ty) || !free(tx2, ty2)) continue;
        if (World.placeGate(tx, ty, dir)) {
          Inventory.takeOne(Inventory.selected());
          count('placed', 'gate');
          return null;
        }
      }
    }
    return 'A gate needs 2 free squares side by side. Face open grass.';
  }

  // R pressed: sleep if you face a bed or tent, cook if you face a campfire with raw meat.
  // Returns { msg, used }. used = true means R did something, so holding it does not eat.
  function useTap() {
    const r = facingPoint(ACT.reach);
    const spots = [World.tileOf(r.x, r.y), frontTile(1)];
    const thing = name => spots.find(t => World.nameAt(t.tx, t.ty) === name);
    // The secret ring of mushrooms.
    const rc = World.ringCenter();
    if (rc && Math.hypot(player.x - rc.x, player.y - rc.y) < 30) return { msg: Easter.activate(), used: true };
    const gateSpot = thing('gate');
    if (gateSpot) return { msg: useGate(gateSpot.tx, gateSpot.ty), used: true };
    const tent = thing('tent');
    if (tent) { Tent.open(tent.tx, tent.ty); return { msg: null, used: true }; }
    const cave = thing('cave');
    if (cave) { Under.enter(cave.tx, cave.ty); return { msg: null, used: true }; }
    if (thing('caveExit')) { Under.leave(); return { msg: null, used: true }; }
    const chest = thing('chest');
    if (chest) return { msg: Under.openChest(chest.tx, chest.ty), used: true };
    const shelf = thing('shelf');
    if (shelf) return { msg: Under.useShelf(shelf.tx, shelf.ty), used: true };
    // Feed a wolf (raw or cooked meat). After a few times it becomes your dog.
    const held = Inventory.selectedItem(), heldItem = held && CONFIG.items[held.id];
    const wolf = Animals.findNear(r.x, r.y);
    if (wolf && Animals.canTame(wolf) && heldItem && (heldItem.food || held.id === 'bone')) {   // meat or a bone
      Inventory.takeOne(Inventory.selected());
      const res = Animals.feed(wolf);
      if (res === 'pet') { stats.tamed = (stats.tamed || 0) + 1; return { msg: 'The wolf is now your dog! It will follow you everywhere.', used: true }; }
      return { msg: `The wolf likes the ${heldItem.name.toLowerCase()} (${res}/${CONFIG.animals.taming.feedsNeeded}).`, used: true };
    }
    if (wolf && Animals.canTame(wolf) && !(heldItem && heldItem.gun))
      return { msg: `Hold meat or a bone and press R to feed the wolf. Feed it ${CONFIG.animals.taming.feedsNeeded} times and it becomes your dog.`, used: true };
    const bed = spots.find(t => { const b = World.blockAt(t.tx, t.ty); return b && b.sleep; });
    if (bed) {                                   // a bed outside, from an old save
      if (!Time.canSleep()) return { msg: 'You can only sleep in the evening or at night.', used: true };
      sleepHere();
      return { msg: null, used: true };
    }
    const s = Inventory.selectedItem();
    const item = s && CONFIG.items[s.id];
    const fire = thing('campfire');
    if (fire && item && item.cooksInto) {
      if (!World.addCooking(fire.tx, fire.ty, s.id)) return { msg: `The campfire is full (${CONFIG.food.campfireSlots} pieces). Wait a little.`, used: true };
      Inventory.takeOne(Inventory.selected());
      return { msg: `The ${item.name.toLowerCase().replace('raw ', '')} is cooking. It will be ready soon.`, used: true };
    }
    if (item && item.gun) return { msg: startReload(), used: true };
    if (fire && !(item && item.food)) return { msg: 'Hold raw meat or fish and press R to cook it on the campfire.', used: true };
    if (item && item.food) {
      if (survival.hunger >= S.maxHunger) return { msg: 'You are not hungry.', used: true };
      return { msg: null, used: false };        // keep holding R to eat
    }
    return { msg: World.isUnder() ? 'R: hold food to eat it. Face the light at the way out to go back outside.'
                                  : 'R: hold food to eat it, face a campfire to cook, or face your tent to go inside.', used: true };
  }

  // R at a gate: open or close it. Holding the gate key: lock or unlock it (only when it is closed).
  function useGate(tx, ty) {
    const g = World.gateAt(tx, ty), ts = CONFIG.world.tileSize;
    if (!g) return null;
    if (holding('key')) {
      if (g.open) return 'Close the gate first, then lock it.';
      World.setGate(tx, ty, { locked: !g.locked });
      Sound.lock();
      return g.locked ? 'The gate is locked. Nothing can open it now.' : 'The gate is unlocked.';
    }
    if (g.locked) return 'The gate is locked. Hold your gate key and press R to unlock it.';
    const cx = (tx + 0.5) * ts, cy = (ty + 0.5) * ts, h = P.hitbox / 2;
    if (g.open) {                                    // closing: nobody may stand in the gate
      const inside = World.gateSquares(tx, ty).some(t => {
        const x = (t.tx + 0.5) * ts, y = (t.ty + 0.5) * ts;
        return (Math.abs(player.x - x) < h + ts / 2 && Math.abs(player.y - y) < h + ts / 2) || Animals.blocksAt(x, y, ts / 2, null);
      });
      if (inside) return 'Something is in the way. Step out of the gate first.';
      World.setGate(tx, ty, { open: false });
    } else {                                         // opening: the doors swing away from you
      World.setGate(tx, ty, { open: true, side: g.dir === 'h' ? (cy >= player.y ? 1 : -1) : (cx >= player.x ? 1 : -1) });
    }
    Sound.gate();
    return null;
  }

  // Go to sleep. You will wake up here next time you faint.
  function sleepHere() {
    home = { x: player.x, y: player.y };
    stats.slept++;
    Screens.sleep();
  }

  // Holding R with food: a small bar fills, then you eat it.
  function updateEating(dt) {
    if (!keys.has('use')) useLock = false;
    const s = Inventory.selectedItem();
    const item = s && CONFIG.items[s.id];
    if (!keys.has('use') || useLock || !item || !item.food || survival.hunger >= S.maxHunger) { player.eatT = 0; return; }
    player.eatT += dt;
    if (player.eatT >= CONFIG.food.eatTime) {
      player.eatT = 0;
      survival.hunger = Math.min(S.maxHunger, survival.hunger + item.food);
      survival.hungerT = 0;
      Inventory.takeOne(Inventory.selected());
      stats.ate++;
      Hotbar.say(`Yum! You ate ${item.name.toLowerCase()} (+${item.food} chickens).`);
    }
  }

  // An animal bites you.
  let lastHurtMessage = -1e9;
  function hurt(n, name) {
    survival.health = Math.max(0, survival.health - n);
    survival.healT = 0;
    const now = performance.now();
    if (now - lastHurtMessage > 4000) {
      lastHurtMessage = now;
      Hotbar.say(name === 'Vampire' ? 'A vampire is attacking you! Use garlic, or walk away.'
                                    : `A ${name.toLowerCase()} is attacking you! Fight back with F, or walk away.`);
      player.eatT = 0;
    }
    if (survival.health <= 0) Screens.faint(`You fainted. A ${name.toLowerCase()} hurt you. ${wakeText()}`);
  }
  function wakeText() { return home ? 'You wake up at your bed.' : 'You wake up at the start of the forest.'; }

  function updateSurvival(dt) {
    const sv = survival;
    sv.hungerT += dt;
    if (sv.hungerT >= S.hungerEverySeconds) {
      sv.hungerT = 0;
      sv.hunger = Math.max(0, sv.hunger - 1);
      if (sv.hunger === 3) Hotbar.say('You are getting hungry. Choose food and hold R to eat.');
      if (sv.hunger === 0) Hotbar.say('You are starving! Hold R with food to eat, or you lose hearts.');
    }
    if (sv.hunger === 0) {
      sv.starveT += dt;
      if (sv.starveT >= S.starveDamageEverySeconds) { sv.starveT = 0; sv.health = Math.max(0, sv.health - 1); }
    } else sv.starveT = 0;
    if (sv.hunger >= S.healWhenHungerAtLeast && sv.health < S.maxHealth) {
      sv.healT += dt;
      if (sv.healT >= S.healEverySeconds) { sv.healT = 0; sv.health++; }
    } else sv.healT = 0;
    if (sv.health <= 0) Screens.faint(`You fainted from hunger. ${wakeText()}`);
  }

  function wakeUp() {
    if (World.isUnder()) Under.leave(true);           // you wake up outside, never in a cave
    const p = home || World.spawnPoint();
    player.x = p.x; player.y = p.y;
    survival.health = S.maxHealth;
    survival.hunger = S.wakeUpHunger;
    survival.hungerT = survival.starveT = survival.healT = 0;
  }

  function update(dt) {
    let dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    let dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      const step = P.speed * dt;
      // Move one direction at a time so he slides along trees.
      // If something ever ends up on top of him, he can still walk out of it.
      const stuck = !canStand(player.x, player.y);
      if (stuck || canStand(player.x + dx * step, player.y)) player.x += dx * step;
      if (stuck || canStand(player.x, player.y + dy * step)) player.y += dy * step;
      player.targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
      player.walkTime += dt;
    }
    // Turn smoothly toward the new direction.
    let diff = player.targetAngle - player.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.angle += diff * Math.min(1, dt * P.turnSpeed);

    player.cooldown = Math.max(0, player.cooldown - dt);
    player.swing = Math.max(0, player.swing - dt);
    if (down('action') && player.cooldown === 0) { holdingRifle() ? shoot() : holdingSling() ? fireSling() : holdingRod() ? useRod() : useAxe(); tapped.delete('action'); }
    updateSling(dt);
    updateFishing(dt);
    if (shotLine) { shotLine.t -= dt; if (shotLine.t <= 0) shotLine = null; }

    // Space: a small, smooth jump (for fun; it does not go over trees).
    player.jump = Math.max(0, player.jump - dt);
    if (down('jump') && player.jump === 0) { player.jump = P.jumpTime; tapped.delete('jump'); }

    if (tapped.has('place')) { const msg = placeSelected(); if (msg) Hotbar.say(msg); }
    if (tapped.has('use')) {
      const res = useTap();
      if (res.msg) Hotbar.say(res.msg);
      if (res.used) useLock = true;
    }
    updateEating(dt);
    updateReload(dt);

    // Keep a tap of F or Space waiting if we are still in cooldown; forget the rest.
    ['up', 'down', 'left', 'right', 'place', 'use'].forEach(k => tapped.delete(k));

    updateSurvival(dt);
  }

  // Draw the lumberjack seen from above. He faces "up" before rotating.
  function drawPlayer(ctx, sx, sy, who) {
    const st = who || player;      // who: another position to draw (inside the tent)
    const p = P.size / 13;
    const swing = Math.sin(st.walkTime * 8) * p * 0.6;
    const chop = Math.sin((st.swing / ACT.swingTime) * Math.PI) * 0.9;       // 0 → 0.9 → 0
    const lift = Math.sin((st.jump / P.jumpTime) * Math.PI) * P.jumpHeight;  // 0 → top → 0
    ctx.save();
    ctx.translate(Math.round(sx), Math.round(sy));
    // The shadow stays on the ground and gets a little smaller in the air.
    const shrink = 1 - lift / (P.jumpHeight * 4);
    ctx.fillStyle = C.shadow;
    ctx.beginPath();
    ctx.ellipse(2, 3, 7.5 * p * shrink, 5 * p * shrink, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(0, -lift);
    ctx.scale(1 + lift / 60, 1 + lift / 60);
    ctx.rotate(st.angle);
    if (Inventory.count('cape')) {                     // the vampire cape, on your back
      ctx.fillStyle = C.vampCape;   ctx.fillRect(-6.5 * p, 0, 13 * p, 5 * p);
      ctx.fillStyle = C.vampLining; ctx.fillRect(-6.5 * p, 4.2 * p, 13 * p, 0.8 * p);
    }
    // shoulders (plaid shirt)
    ctx.fillStyle = C.shirt;      ctx.fillRect(-6 * p, -2.5 * p, 12 * p, 5 * p);
    ctx.fillStyle = C.shirtDark;
    ctx.fillRect(-4.5 * p, -2.5 * p, p, 5 * p);
    ctx.fillRect(3.5 * p, -2.5 * p, p, 5 * p);
    ctx.fillRect(-6 * p, 0, 12 * p, p);
    // left hand
    ctx.fillStyle = C.skin;
    ctx.fillRect(-7 * p, -2 * p + swing, 2 * p, 2 * p);
    // right hand with the axe (the axe swings gently when chopping)
    ctx.save();
    ctx.translate(6 * p, -1 * p - swing);
    if (holdingRod()) {                                               // a long thin fishing rod
      ctx.fillStyle = C.axeHandle; ctx.fillRect(-0.5 * p, -11 * p, p, 11 * p);
      ctx.fillStyle = C.skin;      ctx.fillRect(-1 * p, -1 * p, 2 * p, 2 * p);
    } else if (holdingSaw()) {                                        // a small orange chainsaw
      ctx.fillStyle = C.sawBar;  ctx.fillRect(-0.7 * p, -8 * p, 1.4 * p, 6 * p);
      ctx.fillStyle = C.sawBody; ctx.fillRect(-1.5 * p, -2.5 * p, 3 * p, 3.5 * p);
      ctx.fillStyle = C.skin;    ctx.fillRect(-1 * p, 0.2 * p, 2 * p, 1.6 * p);
    } else if (holdingSling()) {                                      // a Y-shaped slingshot
      ctx.fillStyle = C.axeHandle;
      ctx.fillRect(-0.5 * p, -3 * p, p, 3 * p); ctx.fillRect(-2 * p, -5 * p, p, 2.5 * p); ctx.fillRect(1 * p, -5 * p, p, 2.5 * p);
      ctx.fillStyle = C.wolfLight; ctx.fillRect(-1.5 * p, -4.6 * p, 3 * p, 0.6 * p);
      ctx.fillStyle = C.skin;      ctx.fillRect(-1 * p, -1 * p, 2 * p, 2 * p);
    } else if (holdingRifle()) {
      ctx.fillStyle = C.rifleStock;  ctx.fillRect(-1 * p, -1 * p, 2 * p, 4 * p);   // stock
      ctx.fillStyle = C.rifleBarrel; ctx.fillRect(-0.5 * p, -9 * p, p, 8 * p);    // barrel
      ctx.fillStyle = C.skin;        ctx.fillRect(-1 * p, -1 * p, 2 * p, 2 * p);
    } else {
      ctx.rotate(-chop);
      ctx.fillStyle = C.skin;       ctx.fillRect(-1 * p, -1 * p, 2 * p, 2 * p);
      ctx.fillStyle = C.axeHandle;  ctx.fillRect(-0.5 * p, -6 * p, p, 5 * p);
      ctx.fillStyle = Inventory.count('goldenAxe') ? C.gold : Inventory.count('ironAxe') || Inventory.count('chainsaw') ? C.ironHead : C.axeHead;
      ctx.fillRect(0.5 * p, -6 * p, 2 * p, 2.5 * p);
    }
    ctx.restore();
    // head (hair on top, forehead shows the front)
    ctx.fillStyle = C.hair;       ctx.fillRect(-3 * p, -3 * p, 6 * p, 6 * p);
    ctx.fillStyle = C.skin;       ctx.fillRect(-3 * p, -3 * p, 6 * p, 1.2 * p);
    ctx.restore();
    // Eating: a small bar above you fills up.
    if (st.eatT > 0) World.drawHitBar(ctx, sx, sy - P.size * 0.9 - 6, st.eatT / CONFIG.food.eatTime);
    if (st.reloading) World.drawHitBar(ctx, sx, sy - P.size * 0.9 - 6, st.reloadT / RF.reloadTime);
  }

  // The thin line of the last shot (fades out, no flash). Drawn in world position.
  function drawShot(ctx, camX, camY) {
    drawLine(ctx, camX, camY);
    garlicShots.forEach(g => {                         // flying garlic: a small white bulb with a shadow
      const x = Math.round(g.x - camX), y = Math.round(g.y - camY);
      ctx.fillStyle = C.shadow; ctx.fillRect(x - 2, y + 4, 7, 3);
      ctx.fillStyle = C.garlicBulb; ctx.fillRect(x - 3, y - 3, 7, 7);
      ctx.fillStyle = C.garlicStripe; ctx.fillRect(x, y - 3, 1, 7);
      ctx.fillStyle = C.garlicLeaf; ctx.fillRect(x - 1, y - 5, 3, 2);
    });
    if (!shotLine) return;
    ctx.save();
    ctx.globalAlpha = shotLine.t / RF.lineTime;
    ctx.strokeStyle = C.shotLine; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shotLine.x1 - camX, shotLine.y1 - camY);
    ctx.lineTo(shotLine.x2 - camX, shotLine.y2 - camY);
    ctx.stroke();
    ctx.restore();
  }

  function save() {
    const at = World.isUnder() ? World.outsidePos() : player;   // saved in a cave: next time you start outside it
    return { x: Math.round(at.x), y: Math.round(at.y), angle: player.targetAngle,
             health: survival.health, hunger: survival.hunger, home, stats, loaded };
  }
  function load(d) {
    player.x = d.x; player.y = d.y; player.angle = player.targetAngle = d.angle || 0;
    survival.health = d.health; survival.hunger = d.hunger;
    home = d.home || null;
    stats = Object.assign(freshStats(), d.stats || {});
    loaded = d.loaded || 0;
  }

  return { init, update, drawPlayer, player, survival, clearKeys, nearTable, nearCampfire, wakeUp,
           save, load, count, hurt, cooked, drawShot, sleepHere, holding, toolPower, loaded: () => loaded, stats: () => stats };
})();
