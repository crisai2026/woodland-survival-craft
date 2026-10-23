const Under = (() => {
  const C = CONFIG.colors, CV = CONFIG.caves, ts = CONFIG.world.tileSize;
  let coins = [], bats = [], time = 0, g = null;
  const SECRETS = ['coffins', 'minions', 'dragon'];
  const SECRET_TEXT = {
    coffins: 'Here rest the brave Knight and the Princess from Knight\'s Quest, together.',
    minions: 'The bones of the Dragon\'s minions from Knight\'s Quest: furry, insect, tentacle and winged.',
    dragon: 'The bones of the Dragon from Knight\'s Quest. The knight won.'
  };
  // Inside a secret room you hear music from Knight's Quest (it fades out when you walk out).
  const SECRET_MUSIC = { coffins: 'beautiful', minions: 'cheery', dragon: 'creepy' };

  // ----- Going in and coming out -----
  function enter(tx, ty) {
    const info = World.caveAt(tx, ty);
    if (!info || World.isUnder()) return;
    const pl = Mechanics.player;
    const start = World.enterCave(info.id, { x: pl.x, y: pl.y });
    const cv = World.caveInfo();
    pl.x = start.x; pl.y = start.y; pl.angle = pl.targetAngle = 0;
    Drops.enterUnder();
    Animals.enterUnder(cv.monsters || []).forEach(a => { a.x = pl.x; a.y = pl.y + 10; });   // your dog comes too
    if (cv.monsterDay !== Time.day()) { cv.monsterDay = Time.day(); spawnCreatures(cv); }  // new ones each day
    coins = cv.coins || [];
    bats = cv.deco.filter(d => d.type === 'bat').map(d => ({ hx: (d.x + 0.5) * ts, hy: (d.y + 0.5) * ts, x: (d.x + 0.5) * ts, y: (d.y + 0.5) * ts,
                                                         mode: 'hang', t: 0, vx: 0, vy: 0 }));
    Mechanics.clearKeys();
    const st = Mechanics.stats();
    st.cavesIn = (st.cavesIn || 0) + 1;
    Hotbar.say(`${cv.title}. It is dark in here. The light behind you is the way out (R).`);
  }
  function leave(quiet) {
    const cv = World.caveInfo();
    if (!cv) return;
    cv.monsters = Animals.leaveUnder();
    cv.coins = coins; coins = [];
    Drops.leaveUnder();
    const pos = World.leaveCave(), pl = Mechanics.player;
    pl.x = pos.x; pl.y = pos.y; pl.angle = pl.targetAngle = Math.PI;              // facing away from the opening
    Animals.list().filter(a => a.pet).forEach(a => {                                // your dog comes out next to you
      for (const [dx, dy] of [[0, 45], [45, 0], [-45, 0], [0, -45], [0, 0]])
        if (Animals.canStandAt(a, pl.x + dx, pl.y + dy) || (!dx && !dy)) { a.x = pl.x + dx; a.y = pl.y + dy; break; }
    });
    Mechanics.clearKeys();
    if (!quiet) Hotbar.say('You are back outside in the forest.');
  }

  // Zombies, skeletons and vampires live in the caves (it is always dark there). Never near the way out,
  // never in a secret room, never in the light. Peaceful mode: none.
  function spawnCreatures(cv) {
    if (Screens.peaceful()) return;
    const K = CV.kinds[cv.id % CV.kinds.length], A = cv.area;
    const have = kind => Animals.list().filter(a => a.kind === kind && !a.dying).length;
    Object.entries(K.creatures).forEach(([kind, n]) => {
      for (let tries = 0; have(kind) < n && tries < 400; tries++) {
        const tx = A.x0 + Math.floor(Math.random() * (A.x1 - A.x0)), ty = A.y0 + Math.floor(Math.random() * (A.y1 - A.y0));
        if (World.tileAt(tx, ty) !== World.GRASS) continue;
        if (Math.hypot(tx - cv.exit.tx, ty - cv.exit.ty) < CV.safeAround) continue;
        if (cv.secrets.some(r => tx >= r.x - 1 && ty >= r.y - 1 && tx <= r.x + r.w && ty <= r.y + r.h)) continue;
        Animals.spawnAt(kind, (tx + 0.5) * ts, (ty + 0.5) * ts);
      }
    });
  }

  // ----- Treasure chests and coins (like in Knight's Quest) -----
  // E (or R) next to a chest opens it: the chest sound, and coins pop out and bounce.
  function openChest(tx, ty) {
    const c = World.chestAt(tx, ty);
    if (!c) return null;
    if (c.opened) return 'This chest is empty now.';
    c.opened = true;
    Sound.kqChest();
    const x = (tx + 0.5) * ts, y = (ty + 0.5) * ts;
    for (let i = 0; i < c.coins; i++) {
      const a = Math.random() * Math.PI * 2, sp = 25 + Math.random() * 45;
      coins.push({ x, y: y + 6, z: 14, vx: Math.cos(a) * sp, vy: Math.abs(Math.sin(a)) * sp + 15, vz: 110 + Math.random() * 70,
                   spin: Math.random() * Math.PI, age: 0 });
    }
    const st = Mechanics.stats();
    st.chests = (st.chests || 0) + 1;
    return 'You opened the secret treasure chest! Something shiny pops out...';
  }
  // E: open a chest next to you. Returns true if it did (then the inventory does not open).
  function useE() {
    if (!World.isUnder()) return false;
    const pl = Mechanics.player, t = World.tileOf(pl.x, pl.y);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const c = World.chestAt(t.tx + dx, t.ty + dy);
      if (!c || c.opened) continue;
      if (Math.hypot((t.tx + dx + 0.5) * ts - pl.x, (t.ty + dy + 0.5) * ts - pl.y) > 62) continue;
      Hotbar.say(openChest(t.tx + dx, t.ty + dy));
      return true;
    }
    return false;
  }
  function updateCoins(dt) {
    const pl = Mechanics.player;
    coins.forEach(c => {
      c.age += dt; c.spin += dt * 5;
      c.vz -= 420 * dt; c.z += c.vz * dt;
      if (c.z <= 0) { c.z = 0; c.vz = Math.abs(c.vz) > 40 ? -c.vz * 0.45 : 0; c.vx *= 0.6; c.vy *= 0.6; }   // a little bounce
      const nx = c.x + c.vx * dt, ny = c.y + c.vy * dt;
      if (World.isSolidAt(nx, c.y)) c.vx = -c.vx * 0.5; else c.x = nx;
      if (World.isSolidAt(c.x, ny)) c.vy = -c.vy * 0.5; else c.y = ny;
      const d = Math.hypot(pl.x - c.x, pl.y - c.y);
      if (c.age < 0.6 || !Inventory.canAdd('coin')) return;
      if (d < 24 && c.z < 8) { Inventory.add('coin', 1); c.taken = true; Sound.kqCoin(); return; }
      if (d < 70 && c.z === 0) { const step = Math.min(d, 150 * dt); c.x += (pl.x - c.x) / d * step; c.y += (pl.y - c.y) / d * step; }
    });
    if (coins.some(c => c.taken)) {
      coins = coins.filter(c => !c.taken);
      if (!coins.length) { Sound.chime(); Hotbar.say("You found the Knight's Quest trophy coin! A secret prize, just for you."); }
    }
  }
  function drawCoins(ctx, camX, camY) {
    coins.forEach(c => {
      const x = Math.round(c.x - camX), y = Math.round(c.y - camY);
      ctx.fillStyle = C.shadow; ctx.beginPath(); ctx.ellipse(x, y + 7, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.coin; ctx.beginPath();
      ctx.ellipse(x, y - c.z, Math.max(1.2, 7 * Math.abs(Math.cos(c.spin))), 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.coinEdge; ctx.lineWidth = 2; ctx.stroke();
    });
  }

  // ----- Your trophy shelf (R) -----
  function useShelf(tx, ty) {
    const n = Inventory.count('coin'), st = Mechanics.stats();
    const found = SECRETS.filter(k => st.secrets && st.secrets[k]).length;
    const secretsText = found ? ` You found ${found} of ${SECRETS.length} secrets.` : '';
    if (!n) {
      const on = World.shelfCoins(tx, ty);
      return on ? `Your trophy shelf: ${on} Knight's Quest coins.${secretsText}`
                : 'Your trophy shelf is empty. Find treasure chests in the caves and bring the coins here.';
    }
    Inventory.take('coin', n);
    const total = World.addShelfCoins(tx, ty, n);
    st.shelfCoins = total;
    Sound.kqCoin();
    return `You put ${n} coin${n > 1 ? 's' : ''} on your trophy shelf. Now there are ${total}!${secretsText}`;
  }

  // ----- Secrets: break the hidden rock, the room lights up -----
  function checkSecrets() {
    const cv = World.caveInfo(), pl = Mechanics.player, st = Mechanics.stats();
    cv.secrets.forEach(r => {                           // just broken through: the torches come on, one by one
      if (!r.revealed || r.announced) return;
      r.announced = true;
      st.secrets = st.secrets || {};
      st.secrets[r.key] = true;
      Sound.chime();
      const n = SECRETS.filter(k => st.secrets[k]).length;
      Hotbar.say(`You broke through! A secret! ${SECRET_TEXT[r.key]} (${n} of ${SECRETS.length} secrets)`);
    });
    const tx = pl.x / ts, ty = pl.y / ts;               // inside a found room: music from Knight's Quest
    const room = cv.secrets.find(r => r.revealed && tx >= r.x && ty >= r.y && tx <= r.x + r.w && ty <= r.y + r.h);
    Sound.kqMusic(room ? SECRET_MUSIC[room.key] : null);
  }
  // The torches in a secret room: on the walls, away from the chest. lit: 0 (dark) to 1, one after another.
  function roomTorches(r) {
    const spots = [[0.5, 0.35], [r.w - 0.5, 0.35], [0.5, r.h - 0.35], [r.w - 0.5, r.h - 0.35]]
      .filter(([x, y]) => !(Math.abs(x - 0.5 - r.chest[0]) < 0.6 && Math.abs(y - 0.5 - r.chest[1]) < 0.7));
    const since = r.revealedAt ? (performance.now() - r.revealedAt) / 1000 : 99;
    return spots.map(([x, y], i) => ({ x: (r.x + x) * ts, y: (r.y + y) * ts, lit: Math.max(0, Math.min(1, (since - 0.4 - i * 0.5) / 0.8)) }));
  }

  // ----- Bats hang still. When you come close, they flutter away (they never hurt you). -----
  // Now and then a little group of bats flies past you, across the screen (they never hurt you).
  let flightT = 8;
  function batFlight(dt) {
    flightT -= dt;
    if (flightT > 0) return;
    flightT = CV.batFlights[0] + Math.random() * (CV.batFlights[1] - CV.batFlights[0]);
    const pl = Mechanics.player, a = Math.random() * Math.PI * 2, n = 3 + Math.floor(Math.random() * 3);
    const sx = pl.x - Math.cos(a) * 520, sy = pl.y - Math.sin(a) * 340;
    for (let i = 0; i < n; i++)
      bats.push({ x: sx + (Math.random() - 0.5) * 60, y: sy + (Math.random() - 0.5) * 60, mode: 'fly', t: -i * 0.15,
                  vx: Math.cos(a) * (150 + Math.random() * 30), vy: Math.sin(a) * (110 + Math.random() * 20), visitor: true, life: 7 });
    Sound.flutter(); Sound.squeaks();
  }
  function updateBats(dt) {
    batFlight(dt);
    bats = bats.filter(b => !(b.visitor && b.t > b.life));
    const pl = Mechanics.player;
    bats.forEach(b => {
      const d = Math.hypot(pl.x - b.x, pl.y - b.y);
      if (b.mode === 'hang' && d < 110) {
        const a = Math.atan2(b.y - pl.y, b.x - pl.x) + (Math.random() - 0.5);
        b.mode = 'fly'; b.t = 0; b.vx = Math.cos(a) * 80; b.vy = Math.sin(a) * 80;
        Sound.flutter();
      } else if (b.mode === 'fly') {
        b.t += dt; if (b.t < 0) return;
        b.x += b.vx * dt; b.y += (b.vy + Math.sin(b.t * 6) * 25) * dt;
        if (b.t > 3 && !b.visitor) { b.mode = 'gone'; b.t = 0; }
      } else if (b.mode === 'gone') {
        b.t += dt;
        if (b.t > 25 && Math.hypot(pl.x - b.hx, pl.y - b.hy) > 320) { b.mode = 'hang'; b.x = b.hx; b.y = b.hy; }
      }
    });
  }
  function drawBats(ctx, camX, camY) {
    bats.forEach(b => {
      if (b.mode === 'gone') return;
      const x = Math.round(b.x - camX), y = Math.round(b.y - camY);
      ctx.fillStyle = C.caveBat;                          // a little lighter than outside, so you can see them in the dark
      if (b.mode === 'hang') {                           // folded up, hanging still
        ctx.fillRect(x - 3, y - 4, 6, 8); ctx.fillRect(x - 4, y - 2, 1, 5); ctx.fillRect(x + 3, y - 2, 1, 5);
        ctx.fillRect(x - 3, y - 6, 2, 2); ctx.fillRect(x + 1, y - 6, 2, 2);
      } else {
        if (b.t < 0) return;
        ctx.globalAlpha = b.visitor ? 1 : Math.max(0, Math.min(1, 3 - b.t));
        const up = Math.sin(b.t * 9) > 0 ? -2 : 1;
        ctx.fillRect(x - 2, y - 2, 4, 4); ctx.fillRect(x - 7, y - 2 + up, 5, 2); ctx.fillRect(x + 2, y - 2 + up, 5, 2);
        ctx.globalAlpha = 1;
      }
    });
  }

  // ----- Drawing the cave's decorations and secrets -----
  function rect(color, x, y, w, h) { g.fillStyle = color; g.fillRect(x, y, w, h); }
  function wisp(d) {                                    // haunted mine: pale lights drifting very slowly (no blinking)
    return { x: (d.x + 0.5) * ts + Math.sin(time * 0.25 + d.k * 2) * 50, y: (d.y + 0.5) * ts + Math.cos(time * 0.2 + d.k) * 40 };
  }
  function drawDeco(d, sx, sy) {
    const w = 2 * ts;
    if (d.type === 'rail') {                            // two rails on wooden sleepers, along the tunnel
      if (d.dir === 'h') { for (let k = 0; k < ts; k += 10) rect(C.mineWood, sx + k + 2, sy + ts - 14, 5, 28); rect(C.rail, sx, sy + ts - 10, ts, 3); rect(C.rail, sx, sy + ts + 7, ts, 3); }
      else { for (let k = 0; k < ts; k += 10) rect(C.mineWood, sx + ts - 14, sy + k + 2, 28, 5); rect(C.rail, sx + ts - 10, sy, 3, ts); rect(C.rail, sx + ts + 7, sy, 3, ts); }
    } else if (d.type === 'beam') {                     // a wooden support beam across the tunnel
      if (d.dir === 'h') { rect(C.mineWood, sx + 16, sy - 2, 9, w + 4); rect('#5a3d26', sx + 16, sy - 2, 9, 4); rect('#5a3d26', sx + 16, sy + w - 2, 9, 4); }
      else { rect(C.mineWood, sx - 2, sy + 16, w + 4, 9); rect('#5a3d26', sx - 2, sy + 16, 4, 9); rect('#5a3d26', sx + w - 2, sy + 16, 4, 9); }
    } else if (d.type === 'cart') {                     // an old mine cart with a little coal and iron
      const cx = sx + ts - 17, cy = sy + ts - 13;
      rect('rgba(0,0,0,0.25)', cx + 3, cy + 3, 34, 26);
      rect('#4a4d50', cx, cy, 34, 26); rect('#6f6f6b', cx + 3, cy + 3, 28, 20);
      rect('#2b2b2b', cx + 6, cy + 6, 10, 8); rect(C.ironSpot, cx + 18, cy + 9, 8, 6); rect('#2b2b2b', cx + 12, cy + 14, 8, 6);
    } else if (d.type === 'lantern') {
      rect(C.mineWood, sx + 18, sy + 14, 4, 20);
      rect('#3a3a3a', sx + 14, sy + 6, 12, 13); rect(C.lantern, sx + 16, sy + 8, 8, 9);
      g.fillStyle = 'rgba(242, 193, 78, 0.12)'; g.beginPath(); g.arc(sx + 20, sy + 12, 22, 0, Math.PI * 2); g.fill();
    } else if (d.type === 'crystal') {                  // soft blue and purple crystals
      [[12, 26, 8], [24, 20, 11], [30, 30, 6]].forEach(([x, y, hgt], i) => {
        g.fillStyle = (i + d.k) % 2 ? C.crystalA : C.crystalB;
        g.beginPath(); g.moveTo(sx + x, sy + y - hgt * 2); g.lineTo(sx + x + hgt * 0.6, sy + y); g.lineTo(sx + x, sy + y + 4); g.lineTo(sx + x - hgt * 0.6, sy + y); g.fill();
      });
    } else if (d.type === 'bones') {                    // a few old bones on the floor
      g.save(); g.translate(sx + 20, sy + 20); g.rotate(d.k * 0.9);
      rect(C.boneWhite, -9, -1, 18, 3); rect(C.boneWhite, -11, -3, 3, 3); rect(C.boneWhite, -11, 1, 3, 3); rect(C.boneWhite, 8, -3, 3, 3); rect(C.boneWhite, 8, 1, 3, 3);
      g.rotate(1.3); rect(C.boneShade, -6, 6, 12, 2);
      g.restore();
    } else if (d.type === 'sword') {                    // a Knight's Quest sword scratched into the floor (the clue to a secret)
      g.save(); g.translate(sx + 20, sy + 20);
      const r = World.caveInfo().secrets.find(r => Math.abs(r.rock[0] - d.x) + Math.abs(r.rock[1] - d.y) === 1);   // the hidden rock next to it
      if (r) g.rotate(Math.atan2(r.rock[1] - d.y, r.rock[0] - d.x) + Math.PI / 2); else if (d.dir === 'h') g.rotate(Math.PI / 2);   // the tip points to it
      g.globalAlpha = CV.swordMark;
      rect('#2a2622', -2, -16, 6, 24); rect('#2a2622', -8, 6, 18, 5);    // dark scratch shadow
      rect('#d9dde3', -3, -17, 6, 23);                                    // blade
      rect('#f4f6f8', -1, -19, 2, 3);                                     // tip
      rect('#c9a24a', -9, 5, 18, 4);                                      // cross-guard
      rect('#8a5a2b', -2, 9, 4, 7);                                       // handle
      rect('#c9a24a', -3, 16, 6, 3);                                      // pommel
      g.globalAlpha = 1; g.restore();
    } else if (d.type === 'wisp') {
      const p = wisp(d), x = p.x - d.x * ts + sx, y = p.y - d.y * ts + sy;
      g.fillStyle = 'rgba(190, 235, 230, 0.18)'; g.beginPath(); g.arc(x, y, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(220, 250, 245, 0.55)'; g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
    }
  }
  function drawSecret(r, sx, sy) {                      // sx, sy: the top-left corner of the secret room on screen
    if (r.key === 'coffins') { coffin(sx + 50, sy + 40, 'knight'); coffin(sx + 145, sy + 40, 'princess'); candle(sx + 28, sy + 70); candle(sx + 215, sy + 70); }
    if (r.key === 'minions') drawMinions(r, sx, sy);
    if (r.key === 'dragon') dragonBones(sx + 40, sy + 80);
  }
  function coffin(x, y, who) {                     // an open wooden coffin
    rect('#3d2a1c', x + 3, y + 3, 44, 68);
    rect('#5a3d26', x, y, 44, 68); rect('#7a5236', x + 4, y + 4, 36, 60); rect('#a8463c', x + 7, y + 7, 30, 54);
    if (who === 'knight') {                        // the knight: grey armour, light helmet, dark visor, red plume
      rect('#94a3b8', x + 12, y + 12, 20, 44); rect('#64748b', x + 15, y + 26, 14, 28);
      rect('#cbd5e1', x + 15, y + 14, 14, 9); rect('#0f172a', x + 17, y + 17, 10, 3);
      rect('#ef4444', x + 20, y + 8, 4, 6); rect('#e5e7eb', x + 33, y + 22, 3, 26);   // and his sword
    } else {                                       // the princess: pink dress, yellow hair
      rect('#fcd34d', x + 13, y + 10, 18, 13); rect('#ec4899', x + 12, y + 23, 20, 34); rect('#f9a8d4', x + 15, y + 27, 14, 3);
    }
  }
  function candle(x, y) { rect('#efe9dd', x - 3, y, 6, 12); rect('#f2c14e', x - 2, y - 5, 4, 5); }
  function bone(x, y, w, h) { rect(C.boneWhite, x, y, w, h); }
  function furryBones(x, y) {                      // a furry minion: square skull with two white horns
    bone(x, y, 30, 22); rect(C.caveFloor, x + 4, y + 4, 22, 14);
    bone(x + 6, y + 6, 18, 10); rect('#2b2b2b', x + 8, y + 9, 5, 4); rect('#2b2b2b', x + 17, y + 9, 5, 4);
    g.fillStyle = '#f5f5f4';
    g.beginPath(); g.moveTo(x + 2, y + 4); g.lineTo(x - 6, y - 12); g.lineTo(x + 9, y + 2); g.fill();
    g.beginPath(); g.moveTo(x + 28, y + 4); g.lineTo(x + 36, y - 12); g.lineTo(x + 21, y + 2); g.fill();
    for (let i = 0; i < 4; i++) bone(x + 2 + i * 7, y + 26, 4, 8);
  }
  function tentacleBones(x, y) {                   // a tentacle minion: a round skull and curly bone tentacles
    g.fillStyle = C.boneWhite; g.beginPath(); g.arc(x + 14, y + 12, 14, Math.PI, 0); g.fill(); bone(x, y + 12, 28, 6);
    rect('#2b2b2b', x + 7, y + 7, 4, 4); rect('#2b2b2b', x + 17, y + 7, 4, 4);
    g.strokeStyle = C.boneShade; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const tx = x + 3 + i * 7; g.beginPath(); g.moveTo(tx, y + 18); g.quadraticCurveTo(tx + 5, y + 26, tx + 2, y + 34); g.stroke(); }
  }
  function insectBones(x, y) {                     // an insect minion: an oval shell, thin legs, antennae and open claws
    g.fillStyle = C.boneWhite; g.beginPath(); g.ellipse(x + 18, y + 18, 16, 12, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.caveFloor; g.beginPath(); g.ellipse(x + 18, y + 19, 10, 6, 0, 0, Math.PI * 2); g.fill();
    rect('#2b2b2b', x + 11, y + 11, 5, 5); rect('#2b2b2b', x + 21, y + 11, 5, 5);               // eye holes
    g.strokeStyle = C.boneShade; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + 12, y + 7); g.lineTo(x + 6, y - 6); g.moveTo(x + 24, y + 7); g.lineTo(x + 30, y - 6); g.stroke();   // antennae
    for (let i = 0; i < 3; i++) {                                                                  // legs
      g.beginPath(); g.moveTo(x + 8 + i * 10, y + 28); g.lineTo(x + 4 + i * 10, y + 38); g.stroke();
    }
    g.lineWidth = 3;                                                                               // claws, open, to both sides
    g.beginPath(); g.moveTo(x + 2, y + 18); g.lineTo(x - 10, y + 12); g.lineTo(x - 14, y + 4); g.moveTo(x - 10, y + 12); g.lineTo(x - 16, y + 16); g.stroke();
    g.beginPath(); g.moveTo(x + 34, y + 18); g.lineTo(x + 46, y + 12); g.lineTo(x + 50, y + 4); g.moveTo(x + 46, y + 12); g.lineTo(x + 52, y + 16); g.stroke();
  }
  function wingedBones(x, y) {                     // a winged minion: a square skull and two thin bone wings
    g.strokeStyle = C.boneShade; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x + 6, y + 10); g.lineTo(x - 16, y - 4); g.lineTo(x - 8, y + 20); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(x + 36, y + 10); g.lineTo(x + 58, y - 4); g.lineTo(x + 50, y + 20); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(x + 6, y + 10); g.lineTo(x - 12, y + 6); g.moveTo(x + 36, y + 10); g.lineTo(x + 54, y + 6); g.stroke();
    bone(x + 6, y + 4, 30, 24); rect(C.caveFloor, x + 10, y + 8, 22, 16);
    rect('#2b2b2b', x + 12, y + 11, 7, 6); rect('#2b2b2b', x + 23, y + 11, 7, 6);                // eye holes
    for (let i = 0; i < 3; i++) bone(x + 12 + i * 8, y + 30, 3, 6);
  }
  function chest(x, y) {                           // the treasure chest from Knight's Quest, open, with one coin
    rect('#78350f', x, y + 10, 40, 30); rect('#b45309', x + 3, y + 13, 34, 24);
    g.strokeStyle = '#f59e0b'; g.lineWidth = 3; g.strokeRect(x, y + 10, 40, 30);
    rect('#78350f', x, y, 40, 10); rect('#f59e0b', x + 17, y + 8, 6, 6);         // open lid
    g.fillStyle = '#facc15'; g.beginPath(); g.ellipse(x + 20, y + 26, 7, 8, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#a16207'; g.lineWidth = 2; g.stroke();
  }
  function dragonBones(x, y) {                     // the dragon boss: a long body of ribs, a wing, spikes and a horn
    g.fillStyle = 'rgba(233,230,220,0.9)';
    g.beginPath(); g.moveTo(x + 40, y + 10); g.lineTo(x + 170, y - 6); g.lineTo(x + 150, y + 16); g.fill();   // wing bones
    bone(x, y + 22, 260, 6);                                                                                 // spine
    for (let i = 0; i < 12; i++) { bone(x + 8 + i * 20, y + 10, 4, 30); }                                    // ribs
    for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(x + i * 16 + 8, y + 44); g.lineTo(x + i * 16, y + 54); g.lineTo(x + i * 16 + 16, y + 54); g.fillStyle = '#e8d8cc'; g.fill(); }
    bone(x + 260, y + 6, 40, 40); rect(C.caveFloor, x + 266, y + 12, 28, 28);                                // skull
    rect('#2b2b2b', x + 280, y + 14, 10, 10); rect('#2b2b2b', x + 280, y + 30, 10, 10);                       // eye holes
    g.fillStyle = C.boneWhite; g.beginPath(); g.moveTo(x + 300, y + 14); g.lineTo(x + 330, y + 6); g.lineTo(x + 300, y + 34); g.fill();   // horn
  }

  // The four minion skeletons lie scattered where they fell: different places and angles, loose bones around.
  // (Fixed for each world, so it looks the same every time.)
  function drawMinions(r, sx, sy) {
    const W2 = r.w * ts, H2 = r.h * ts, cx = (r.chest[0] + 0.5) * ts, cy = (r.chest[1] + 0.5) * ts;
    const rnd = k => { const v = Math.sin(r.x * 12.9898 + r.y * 78.233 + k * 37.719) * 43758.5453; return v - Math.floor(v); };
    const kinds = [[furryBones, 15, 12], [insectBones, 18, 16], [tentacleBones, 14, 17], [wingedBones, 21, 18]];
    // Spread-out places (not a row), never by the chest and not on top of each other.
    const cand = [[0.14, 0.3], [0.16, 0.74], [0.4, 0.33], [0.43, 0.74], [0.66, 0.28], [0.7, 0.74], [0.88, 0.45], [0.88, 0.2], [0.88, 0.8]]
      .map((c, i) => [c[0] * W2 + (rnd(i) - 0.5) * 22, c[1] * H2 + (rnd(i + 9) - 0.5) * 18, rnd(i + 60)])
      .sort((a, b) => a[2] - b[2]);
    // One of them lies right next to the treasure chest (a little into the room from its corner).
    const toMid = [W2 / 2 - cx, H2 / 2 - cy], len = Math.hypot(toMid[0], toMid[1]) || 1;
    const spots = [[cx + toMid[0] / len * 58, cy + toMid[1] / len * 46]];
    for (const gap of [75, 60, 45])
      cand.forEach(([x, y]) => { if (spots.length < 4 && Math.hypot(x - cx, y - cy) > 95 && spots.every(([u, v]) => Math.hypot(u - x, v - y) > gap)) spots.push([x, y]); });
    const order = [0, 1, 2, 3].sort((a, b) => rnd(a + 10) - rnd(b + 10));   // which skeleton lies where
    spots.forEach(([x, y], i) => {
      const kind = order[i];
      const [fn, hx, hy] = kinds[kind];
      g.save(); g.translate(sx + x, sy + y); g.rotate((rnd(i + 20) - 0.5) * 2.4);
      fn(-hx, -hy);
      g.restore();
    });
    for (let k = 0; k < 6; k++) {                                       // loose bones on the floor
      const x = 16 + rnd(k + 30) * (W2 - 32), y = 16 + rnd(k + 40) * (H2 - 32);
      if (Math.hypot(x - cx, y - cy) < 30) continue;
      g.save(); g.translate(sx + x, sy + y); g.rotate(rnd(k + 50) * Math.PI);
      rect(C.boneWhite, -6, -1, 12, 3); rect(C.boneWhite, -8, -2, 3, 5); rect(C.boneWhite, 5, -2, 3, 5);
      g.restore();
    }
  }
  function draw(ctx, camX, camY, viewW, viewH) {
    const cv = World.caveInfo();
    if (!cv) return;
    g = ctx;
    const order = ['sword', 'rail', 'bones', 'beam', 'cart', 'crystal', 'lantern'];
    order.forEach(type => cv.deco.forEach(d => {
      if (d.type !== type) return;
      const sx = d.x * ts - camX, sy = d.y * ts - camY;
      if (sx < -100 || sy < -100 || sx > viewW + 100 || sy > viewH + 100) return;
      drawDeco(d, sx, sy);
    }));
    cv.secrets.forEach(r => {
      if (!r.revealed) return;                          // not found yet: nothing to see
      const sx = r.x * ts - camX, sy = r.y * ts - camY;
      if (sx < -500 || sy < -300 || sx > viewW + 100 || sy > viewH + 100) return;
      drawSecret(r, sx, sy);
      roomTorches(r).forEach(t => {                     // wall torches
        const x = t.x - camX, y = t.y - camY;
        rect(C.axeHandle, x - 2, y - 2, 4, 10);
        rect('#5a4a3a', x - 4, y - 4, 8, 4);
        if (t.lit > 0) {
          g.globalAlpha = t.lit;
          rect(C.fireOuter, x - 4, y - 11, 8, 8); rect(C.fireInner, x - 2, y - 9, 4, 4);
          g.globalAlpha = 1;
        }
      });
    });
    cv.deco.forEach(d => { if (d.type === 'wisp') drawDeco(d, d.x * ts - camX, d.y * ts - camY); });
    drawBats(ctx, camX, camY);
  }
  function lights(camX, camY) {                         // the ghost lights move, so they are added here
    const cv = World.caveInfo();
    if (!cv) return [];
    const out = cv.deco.filter(d => d.type === 'wisp').map(d => { const p = wisp(d); return { x: p.x - camX, y: p.y - camY, r: 60 }; });
    cv.secrets.forEach(r => { if (r.revealed) roomTorches(r).forEach(t => { if (t.lit > 0) out.push({ x: t.x - camX, y: t.y - camY - 6, r: 150 * t.lit }); }); });
    return out;
  }

  function update(dt) {
    time += dt;
    if (!World.isUnder()) { if (Sound.kqPlaying()) Sound.kqMusic(null); return; }
    updateCoins(dt);
    updateBats(dt);
    checkSecrets();
  }

  return { enter, leave, update, draw, drawCoins, lights, useE, openChest, useShelf, SECRETS };
})();
