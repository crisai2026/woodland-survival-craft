const Tent = (() => {
  const screen = document.getElementById('tentScreen');
  const canvas = document.getElementById('tentCanvas');
  const g = canvas.getContext('2d');
  const statusEl = document.getElementById('tentStatus');
  const SPEED = 130, R0 = 11;                         // walking speed inside, your size
  const BED = { x: 80, y: 80, w: 100, h: 150 };       // the place for the bed
  const FURN = { x: 176, y: 280, w: 60, h: 52 };      // the place for the stone furnace
  const DOGBED = { x: 362, y: 296, w: 56, h: 36 };    // a little bed for your dog
  const DOOR = { x1: 265, x2: 335 };                  // the opening at the bottom
  let open = false, tx = 0, ty = 0, raf = 0, last = 0, msg = '', msgT = 0;
  const me = { x: 300, y: 330, angle: 0, targetAngle: 0, walkTime: 0, swing: 0, jump: 0,
               eatT: 0, reloading: false, reloadT: 0 };
  const keys = new Set();
  const keyMap = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
                   ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };

  function rect(color, x, y, w, h) { g.fillStyle = color; g.fillRect(x, y, w, h); }

  // Everything inside is drawn with simple blocks, like the rest of the game. Nothing moves.
  function draw() {
    const hasBed = World.tentHasBed(tx, ty);
    rect('#3f5a33', 0, 0, 600, 400);                                   // grass around the tent
    rect('#cdbf9c', 30, 20, 540, 350);                                 // canvas walls
    for (let x = 30; x <= 570; x += 90) rect('#b9ab88', x - 1, 20, 2, 350);   // wall seams
    rect('#7a5a3c', 60, 50, 480, 300);                                 // wooden floor
    for (let y = 80; y < 350; y += 30) rect('#6a4c32', 60, y, 480, 2);  // floor boards
    // Entrance (bottom middle), open to the grass.
    rect('#3f5a33', 265, 350, 70, 20); rect('#b9ab88', 245, 340, 20, 30); rect('#b9ab88', 335, 340, 20, 30);
    // A string of little flags along the top wall.
    rect('#6e4a2c', 70, 58, 460, 2);
    const flagColors = ['#c95b4b', '#e0b04a', '#6f9a4e', '#5b8ec9'];
    for (let i = 0; i < 15; i++) {
      g.fillStyle = flagColors[i % 4];
      g.beginPath(); g.moveTo(76 + i * 30, 60); g.lineTo(92 + i * 30, 60); g.lineTo(84 + i * 30, 72); g.fill();
    }
    // Warm, steady lantern light (no flicker).
    g.fillStyle = 'rgba(242, 190, 90, 0.16)';
    g.beginPath(); g.arc(212, 104, 90, 0, Math.PI * 2); g.fill();
    // Big rug in the middle.
    rect('#a8463c', 200, 150, 200, 130); rect('#e0b04a', 208, 158, 184, 114); rect('#a8463c', 214, 164, 172, 102);
    for (let i = 0; i < 4; i++) rect('#e0b04a', 250 + i * 30, 207, 12, 12);
    // The stone furnace (or the empty place for it).
    const td = World.tentData(tx, ty);
    if (td.furnace) {
      const f = World.furnace(td.furnace), burning = f.cooking.length > 0;
      if (burning) {                                                   // warm, steady glow
        g.fillStyle = 'rgba(242, 150, 70, 0.18)';
        g.beginPath(); g.arc(FURN.x + 30, FURN.y + 30, 62, 0, Math.PI * 2); g.fill();
      }
      rect('#5f5f5b', FURN.x + 4, FURN.y + 4, FURN.w, FURN.h);          // shadow
      rect('#8a8a86', FURN.x, FURN.y, FURN.w, FURN.h);                  // stones
      for (let row = 1; row < 4; row++) rect('#6f6f6b', FURN.x, FURN.y + row * 13, FURN.w, 2);
      for (let row = 0; row < 4; row++) rect('#6f6f6b', FURN.x + (row % 2 ? 18 : 38), FURN.y + row * 13, 2, 13);
      rect('#2b2b2b', FURN.x + 18, FURN.y + 30, 24, 16);                // opening
      if (burning) { rect('#e8893a', FURN.x + 21, FURN.y + 36, 18, 10); rect('#f2c14e', FURN.x + 26, FURN.y + 39, 8, 6); }
      for (let i = 0; i < Math.min(World.furnaceReady(f), 4); i++) rect('#8a4a2a', FURN.x + 4 + i * 14, FURN.y + 6, 10, 8);  // cooked food on top
      if (burning) World.drawHitBar(g, FURN.x + 30, FURN.y - 10, f.cooking[0][0] / CONFIG.furnace.cookTime);
    } else {
      g.save(); g.setLineDash([6, 5]); g.strokeStyle = '#f1ede0'; g.lineWidth = 2;
      g.strokeRect(FURN.x, FURN.y, FURN.w, FURN.h); g.restore();
      g.fillStyle = '#f1ede0'; g.font = '600 12px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText('Furnace', FURN.x + 30, FURN.y + 30); g.textAlign = 'left';
    }
    // A little dog bed. Your dog (if you have one) sleeps here.
    rect('#9c6a4a', DOGBED.x, DOGBED.y, DOGBED.w, DOGBED.h); rect('#c9a27a', DOGBED.x + 4, DOGBED.y + 4, DOGBED.w - 8, DOGBED.h - 8);
    if (Animals.hasPet()) {
      rect('#8a8d8f', DOGBED.x + 10, DOGBED.y + 9, 28, 17); rect('#64676a', DOGBED.x + 14, DOGBED.y + 11, 18, 4);
      rect('#64676a', DOGBED.x + 6, DOGBED.y + 20, 12, 4);                                  // tail
      rect('#8a8d8f', DOGBED.x + 34, DOGBED.y + 12, 12, 12);                                // head
      rect('#64676a', DOGBED.x + 34, DOGBED.y + 9, 4, 4); rect('#64676a', DOGBED.x + 42, DOGBED.y + 9, 4, 4);  // ears
      rect('#c0392b', DOGBED.x + 32, DOGBED.y + 12, 2, 12);                                 // collar
      g.fillStyle = '#f1ede0'; g.font = '600 11px system-ui, sans-serif'; g.fillText('z', DOGBED.x + 48, DOGBED.y + 4);
      g.font = '600 9px system-ui, sans-serif'; g.fillText('z', DOGBED.x + 54, DOGBED.y - 3);
    }
    // The bed (or the empty place for it).
    if (hasBed) {
      rect('#5a4030', 84, 84, 100, 150);                               // shadow
      rect('#8a6437', 80, 80, 100, 150);                               // frame
      rect('#efe9dd', 90, 88, 80, 30); rect('#ddd5c4', 90, 112, 80, 4); // pillow
      rect('#b5463b', 88, 124, 84, 100);                               // blanket
      rect('#8f342c', 88, 150, 84, 6); rect('#8f342c', 88, 190, 84, 6); // stripes
      rect('#e0b04a', 88, 206, 84, 14);                                // folded throw
    } else {
      g.save(); g.setLineDash([8, 6]); g.strokeStyle = '#f1ede0'; g.lineWidth = 2;
      g.strokeRect(80, 80, 100, 150); g.restore();
      g.fillStyle = '#f1ede0'; g.font = '600 14px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText('Your bed', 130, 150); g.fillText('goes here', 130, 168); g.textAlign = 'left';
    }
    // Little crate next to the bed, with a lantern on it.
    rect('#8a6437', 192, 92, 40, 36); rect('#6e4a2c', 192, 108, 40, 3); rect('#6e4a2c', 210, 92, 3, 36);
    rect('#3a3a3a', 204, 76, 16, 20); rect('#f2c14e', 207, 80, 10, 12); rect('#3a3a3a', 209, 70, 6, 6);
    // Small table with a mug and a book.
    rect('#a47a4f', 320, 88, 60, 40); rect('#7a5230', 320, 124, 60, 4);
    rect('#efe6d6', 332, 96, 12, 12); rect('#c9b48a', 334, 98, 8, 4);  // mug
    rect('#5b8ec9', 352, 98, 18, 13); rect('#e9e4d8', 354, 100, 14, 2); // book
    // Bookshelf crate with books (top right).
    rect('#8a6437', 440, 76, 90, 54); rect('#6e4a2c', 440, 102, 90, 3);
    const books = ['#c95b4b', '#5b8ec9', '#e0b04a', '#6f9a4e', '#9c6ab0', '#c95b4b', '#e9e4d8'];
    books.forEach((c, i) => rect(c, 446 + i * 11, 80 + (i % 3) * 2, 8, 20 - (i % 3) * 2));
    rect('#efe9dd', 448, 108, 30, 18); rect('#c9b48a', 484, 110, 40, 16);   // folded clothes, a box
    // Potted plant.
    rect('#a0573a', 500, 160, 24, 22); rect('#8a4a30', 500, 160, 24, 4);
    [[504, 146, 6, 14], [512, 140, 6, 20], [520, 148, 6, 12], [496, 150, 8, 6], [524, 144, 6, 8]]
      .forEach(([x, y, w, h]) => rect('#4f8a3f', x, y, w, h));
    // Soft cushions by the rug.
    rect('#5b8ec9', 420, 200, 40, 34); rect('#4a78ad', 420, 228, 40, 6);
    rect('#e0b04a', 444, 238, 40, 34); rect('#c99a3a', 444, 266, 40, 6);
    // Stack of firewood by the entrance.
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - i; j++) {
      rect('#6e4a2c', 92 + j * 22 + i * 11, 316 - i * 16, 20, 14); rect('#a47a4f', 97 + j * 22 + i * 11, 320 - i * 16, 10, 6);
    }
    // Basket with wool by the entrance.
    rect('#9c7445', 450, 296, 64, 40); rect('#7a5a34', 450, 312, 64, 3);
    rect('#e9e4d8', 458, 288, 20, 14); rect('#e9e4d8', 482, 286, 22, 16);
  }

  // Furniture you can't walk through: [x, y, width, height].
  function furniture() {
    const list = [[192, 70, 40, 58], [320, 88, 60, 40], [440, 76, 90, 54], [496, 140, 32, 42],
                  [420, 200, 40, 34], [444, 238, 40, 34], [92, 284, 66, 46], [450, 286, 64, 50]];
    if (World.tentHasBed(tx, ty)) list.push([BED.x, BED.y, BED.w, BED.h]);
    if (World.tentData(tx, ty).furnace) list.push([FURN.x, FURN.y, FURN.w, FURN.h]);
    return list;
  }
  function overlaps(x, y, [fx, fy, fw, fh]) { return x + R0 > fx && x - R0 < fx + fw && y + R0 > fy && y - R0 < fy + fh; }
  function blocked(x, y) {
    if (x - R0 < 60 && x < me.x) return true;                                    // tent walls
    if (x + R0 > 540 && x > me.x) return true;
    if (y - R0 < 50 && y < me.y) return true;
    if (y + R0 > 350 && !(x - R0 >= DOOR.x1 && x + R0 <= DOOR.x2) && y > me.y) return true; // only the door is open
    // Furniture blocks you, but never something you are already standing in,
    // so you can always walk out (you can never get stuck).
    return furniture().some(f => overlaps(x, y, f) && !overlaps(me.x, me.y, f));
  }
  function near(box) {
    const dx = Math.max(box.x - me.x, 0, me.x - (box.x + box.w));
    const dy = Math.max(box.y - me.y, 0, me.y - (box.y + box.h));
    return Math.hypot(dx, dy) < R0 + 16;
  }
  function nearBed() { return near(BED); }
  function nearFurnace() { return near(FURN); }
  // When something is placed where you stand, step to a free spot next to it.
  function stepAside(box) {
    if (!overlaps(me.x, me.y, [box.x, box.y, box.w, box.h])) return;
    const fits = (x, y) => x - R0 >= 60 && x + R0 <= 540 && y - R0 >= 50 && y + R0 <= 350 &&
                           !furniture().some(f => overlaps(x, y, f));
    const spots = [[box.x + box.w + R0 + 2, me.y], [box.x - R0 - 2, me.y], [me.x, box.y - R0 - 2],
                   [me.x, box.y + box.h + R0 + 2], [300, 330]];
    const free = spots.find(([x, y]) => fits(x, y));
    if (free) { me.x = free[0]; me.y = free[1]; }
  }

  function say(t) { msg = t; msgT = 3; }
  function hint() {
    if (nearFurnace()) {
      const f = World.furnace(World.tentData(tx, ty).furnace);
      if (!f) return 'Your furnace goes here. Choose the stone furnace with a number key and press Q.';
      if (World.furnaceReady(f)) return `${World.furnaceReady(f)} cooked food ready. R: take it.`;
      if (f.cooking.length) return `Cooking ${f.cooking.length} pieces... Hold raw meat or fish and press R to add more. F: take the furnace.`;
      return 'Your furnace. Hold raw meat or fish and press R to cook it (it uses coal). F: take the furnace.';
    }
    if (near(DOGBED) && Animals.hasPet()) return 'Your dog is sleeping. Shh...';
    if (!nearBed()) return 'Walk with W A S D or the arrows. Walk out of the door to leave.';
    if (World.tentHasBed(tx, ty)) return Time.canSleep() ? 'Your bed. R: sleep · F: take the bed.'
                                                          : 'Your bed. You can sleep (R) in the evening or at night. F: take the bed.';
    return 'Your bed goes here. Choose the bed with a number key and press Q.';
  }

  // Q: put the bed in its place.
  function placeBed() {
    if (!nearBed()) return say('Walk to the dashed square first. That is where your bed goes.');
    if (World.tentHasBed(tx, ty)) return say('Your bed is already here.');
    const s = Inventory.selectedItem();
    if (!s || s.id !== 'bed')
      return say(Inventory.count('bed') ? 'Choose your bed with a number key, then press Q.'
                                        : 'You need a bed. Make one at the crafting table: 3 wool on top of 3 planks.');
    Inventory.takeOne(Inventory.selected());
    World.setTentBed(tx, ty, true);
    stepAside(BED);                            // standing on the bed space? step to the side
    Mechanics.count('placed', 'bedInTent');
    say('Your bed is in your tent. Cozy!');
  }
  // Q: put the stone furnace in its place.
  function placeFurnace() {
    if (!nearFurnace()) return say('Walk to the dashed square by the firewood. That is where your furnace goes.');
    const td = World.tentData(tx, ty);
    if (td.furnace) return say('Your furnace is already here.');
    const s = Inventory.selectedItem();
    if (!s || s.id !== 'furnace')
      return say(Inventory.count('furnace') ? 'Choose your stone furnace with a number key, then press Q.'
                                            : 'You need a stone furnace. Make one at the crafting table: 8 stone in a ring.');
    Inventory.takeOne(Inventory.selected());
    td.furnace = { fuel: 0, cooking: [], done: {} };
    stepAside(FURN);
    Mechanics.count('placed', 'furnaceInTent');
    say('Your furnace is ready. Hold raw meat and press R to cook.');
  }
  function placeQ() {
    const s = Inventory.selectedItem();
    if (nearFurnace() || (s && s.id === 'furnace')) return placeFurnace();
    return placeBed();
  }
  // R at the furnace: put raw meat in (uses coal), or take the cooked meat out.
  function useFurnace() {
    const f = World.furnace(World.tentData(tx, ty).furnace), F = CONFIG.furnace;
    const s = Inventory.selectedItem(), item = s && CONFIG.items[s.id];
    if (item && item.cooksInto) {
      if (f.cooking.length >= F.maxPieces) return say(`The furnace is full (${F.maxPieces} pieces). Wait a little.`);
      if (f.fuel <= 0) {
        if (!Inventory.count('coal')) return say('The furnace needs coal. Bring some coal and try again.');
        Inventory.take('coal', 1); f.fuel += F.piecesPerCoal;
      }
      Inventory.takeOne(Inventory.selected());
      f.fuel--; f.cooking.push([0, s.id]);
      return say(`The ${item.name.toLowerCase()} is cooking in the furnace.`);
    }
    if (World.furnaceReady(f)) {
      let got = 0;
      Object.keys(f.done).forEach(id => { const left = Inventory.add(id, f.done[id]); got += f.done[id] - left; f.done[id] = left; });
      return say(got ? `You took ${got} cooked food. Yum!` : 'There is no space in your inventory.');
    }
    return say(f.cooking.length ? 'The food is still cooking. Wait a little.' : 'Hold raw meat or fish and press R to cook it.');
  }
  // F at the furnace: take it back (with the meat inside).
  function takeFurnace() {
    const td = World.tentData(tx, ty), f = World.furnace(td.furnace);
    if (!f) return;
    if (Inventory.add('furnace', 1)) return say('There is no space in your inventory.');
    const pl = Mechanics.player, give = (id, n) => { const l = Inventory.add(id, n); if (l) Drops.spawn(id, l, pl.x, pl.y); };
    f.cooking.forEach(e => give(e[1], 1));
    Object.entries(f.done).forEach(([id, n]) => { if (n) give(id, n); });
    td.furnace = null;
    say('You took your furnace.');
  }
  function useR() { if (nearFurnace() && World.tentData(tx, ty).furnace) return useFurnace(); sleep(); }
  function useF() { if (nearFurnace()) return takeFurnace(); takeBed(); }

  // R: sleep in the bed.
  function sleep() {
    if (!World.tentHasBed(tx, ty)) return say('Place your bed first (Q, at the dashed square).');
    if (!nearBed()) return say('Walk to your bed to sleep.');
    if (!Time.canSleep()) return say('You can only sleep in the evening or at night.');
    close();
    Mechanics.sleepHere();
  }
  // F: take the bed back.
  function takeBed() {
    if (!World.tentHasBed(tx, ty) || !nearBed()) return;
    if (Inventory.add('bed', 1)) return say('There is no space in your inventory.');
    World.setTentBed(tx, ty, false);
    say('You took your bed.');
  }

  function step(dt) {
    let dx = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
    let dy = (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0);
    if (dx || dy) {
      const len = Math.hypot(dx, dy); dx /= len; dy /= len;
      const st = SPEED * dt;
      if (!blocked(me.x + dx * st, me.y)) me.x += dx * st;      // slide along furniture
      if (!blocked(me.x, me.y + dy * st)) me.y += dy * st;
      me.targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
      me.walkTime += dt;
    }
    let diff = me.targetAngle - me.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    me.angle += diff * Math.min(1, dt * 12);
    if (me.y > 362) { close(); return; }                          // walked out of the door
    msgT = Math.max(0, msgT - dt);
    statusEl.textContent = msgT > 0 ? msg : hint();
    World.cookFurnaces(dt);                      // the furnace keeps cooking while you are inside
  }

  function loop(t) {
    if (!open) return;
    try {
      step(Math.min((t - last) / 1000, 0.05));
      last = t;
      if (open) { draw(); Mechanics.drawPlayer(g, me.x, me.y, me); }
    } catch (e) { console.error('Tent error:', e && e.stack || e); }
    if (open) raf = requestAnimationFrame(loop);
  }

  function openTent(x, y) {
    tx = x; ty = y; open = true;
    me.x = 300; me.y = 330; me.angle = me.targetAngle = 0; msgT = 0;   // just inside the door, facing in
    keys.clear();
    Mechanics.clearKeys();
    screen.classList.add('open');
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }
  function close() {
    open = false;
    cancelAnimationFrame(raf);
    keys.clear();
    screen.classList.remove('open');
    Mechanics.clearKeys();
  }

  document.getElementById('tentLeave').addEventListener('click', close);
  window.addEventListener('keydown', e => {
    if (!open) return;
    const k = keyMap[e.code];
    if (k) { keys.add(k); e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'KeyQ') { e.preventDefault(); placeQ(); }
    else if (e.code === 'KeyR') { e.preventDefault(); useR(); }
    else if (e.code === 'KeyF') { e.preventDefault(); useF(); }
    else if (e.code === 'Escape' || e.code === 'KeyE') { e.preventDefault(); close(); }
  });
  window.addEventListener('keyup', e => { const k = keyMap[e.code]; if (k) keys.delete(k); });
  window.addEventListener('blur', () => keys.clear());

  // How much fire sound to play inside (the furnace crackles while it cooks).
  function fireLevel() {
    if (!open) return 0;
    const f = World.tentData(tx, ty).furnace;
    return f && f.cooking.length ? 0.75 : 0;
  }

  return { open: openTent, close, isOpen: () => open, fireLevel };
})();
