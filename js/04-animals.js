const Animals = (() => {
  const A = CONFIG.animals;
  const C = CONFIG.colors;
  const W = CONFIG.world;
  let list = [];
  let rand = Math.random, respawnTimer = 0;

  function between(min, max) { return min + rand() * (max - min); }
  function kindOf(a) { return A.kinds[a.kind]; }

  function make(kind, x, y) {
    const angle = rand() * Math.PI * 2;
    return { kind, x, y, angle, targetAngle: angle, dx: 0, dy: 0, walking: false,
             timer: between(A.restTimeMin, A.restTimeMax), hits: 0, dying: false, fade: 0,
             mode: 'calm', alertT: 0, biteT: 0,       // mode: 'calm', 'alert' (shows "!") or 'chase'
             tame: 0, pet: false, heartT: 0 };        // tame: times fed. pet: it is your dog
  }

  function init() {
    rand = World.makeRandom(World.getSeed() + 77);
    list = [];
    const spawn = World.spawnPoint();
    Object.keys(A.kinds).forEach(kind => {
      const k = A.kinds[kind];
      let made = 0, tries = 0;
      while (made < k.count && tries < 8000) {
        tries++;
        const tx = Math.floor(rand() * W.width), ty = Math.floor(rand() * W.height);
        if (World.isBorder(tx, ty) || World.tileAt(tx, ty) !== World.GRASS) continue;
        const x = (tx + 0.5) * W.tileSize, y = (ty + 0.5) * W.tileSize;
        const d = Math.hypot(x - spawn.x, y - spawn.y) / W.tileSize;
        // The first few of each kind start near you so you can see them.
        if (made < k.nearStart ? (d < W.clearingRadius + 1 || d > 9) : d < (k.minStartDistance || W.clearingRadius + 2)) continue;
        const a = make(kind, x, y);
        if (!canStand(a, x, y)) continue;
        list.push(a);
        made++;
      }
    });
    rand = Math.random;
  }

  // Does a living animal overlap this box? (skip = the animal asking)
  function blocksAt(x, y, half, skip, ignorePets) {
    return list.some(a => {
      if (a === skip || a.dying || (ignorePets && a.pet)) return false;
      const h = kindOf(a).hitbox / 2;
      return Math.abs(a.x - x) < half + h && Math.abs(a.y - y) < half + h;
    });
  }

  function canStand(a, x, y, ignoreLight) {
    const h = kindOf(a).hitbox / 2;
    if (kindOf(a).avoidLight && !ignoreLight && World.inLight(x, y)) return false;   // night creatures stay out of the light
    if (World.isSolidAt(x - h, y - h) || World.isSolidAt(x + h, y - h) ||
        World.isSolidAt(x - h, y + h) || World.isSolidAt(x + h, y + h)) return false;
    if (blocksAt(x, y, h, a)) return false;
    const pl = Mechanics.player, ph = CONFIG.player.hitbox / 2;
    return !(Math.abs(pl.x - x) < h + ph && Math.abs(pl.y - y) < h + ph);
  }

  // ----- Attacking (calm and fair: a "!" first, steady speed, you are faster) -----
  function startAlert(a) {
    a.mode = 'alert'; a.alertT = A.alertTime; a.biteT = A.biteEvery * 0.6; a.walking = false;
  }
  function face(a, pl) { a.targetAngle = Math.atan2(pl.y - a.y, pl.x - a.x) + Math.PI / 2; }
  function moveToward(a, pl, step, ignoreLight) {      // a negative step moves away
    const d = Math.hypot(pl.x - a.x, pl.y - a.y) || 1;
    const dx = (pl.x - a.x) / d * step, dy = (pl.y - a.y) / d * step;
    if (canStand(a, a.x + dx, a.y + dy, ignoreLight)) { a.x += dx; a.y += dy; }
    else if (canStand(a, a.x + dx, a.y, ignoreLight)) a.x += dx;          // slide around trees
    else if (canStand(a, a.x, a.y + dy, ignoreLight)) a.y += dy;
  }
  function calmAll() { list.forEach(a => { a.mode = 'calm'; a.walking = false; }); }

  function update(dt) {
    const pl = Mechanics.player;
    const peaceful = Screens.peaceful();
    list.forEach(a => {
      if (a.dying) { a.fade -= dt; return; }
      const k = kindOf(a);
      const dist = Math.hypot(pl.x - a.x, pl.y - a.y);
      a.heartT = Math.max(0, a.heartT - dt);
      if (peaceful || a.pet || a.tame > 0) a.mode = 'calm';     // a wolf you have fed never attacks you
      if (k.behavior === 'vampire' && vampireStep(a, pl, dist, dt)) return;
      if (k.behavior === 'night' && nightStep(a, pl, dist, dt)) return;
      // Hunters notice you when you come close.
      const hunts = k.behavior === 'hunter' || k.behavior === 'vampire' || k.behavior === 'night';
      const notice = World.isUnder() ? Math.min(k.notice || A.noticeRadius, CONFIG.caves.notice) : (k.notice || A.noticeRadius);
      if (!peaceful && hunts && !(a.tame > 0) && a.mode === 'calm' && dist < notice) startAlert(a);
      // Far enough away: the animal gives up and becomes calm again.
      if (a.mode !== 'calm' && dist > (k.giveUp || A.giveUpDistance)) {
        a.mode = 'calm'; a.walking = false; a.timer = between(A.restTimeMin, A.restTimeMax);
      }
      if (a.mode === 'alert') {
        face(a, pl);
        a.alertT -= dt;
        if (a.alertT <= 0) a.mode = 'chase';
      } else if (a.mode === 'chase') {
        face(a, pl);
        const reach = (k.hitbox + CONFIG.player.hitbox) / 2 * 1.42 + 6;
        if (k.behavior === 'vampire' && Mechanics.holding('garlic') && dist < CONFIG.vampire.keepAway) {
          moveToward(a, pl, -k.chaseSpeed * dt);       // holding garlic: the vampire backs away
          a.biteT = Math.max(a.biteT, 0.5);
        } else if (k.behavior === 'vampire' && Mechanics.holding('garlic') && dist < CONFIG.vampire.keepAway + 25) {
          // it waits at a safe distance
        } else if (k.ranged) {
          rangedStep(a, pl, dist, dt);                 // a skeleton keeps its distance and throws bones
        } else if (dist > reach) moveToward(a, pl, k.chaseSpeed * dt);
        else {
          a.biteT -= dt;
          if (a.biteT <= 0) { a.biteT = A.biteEvery; Mechanics.hurt(k.damage, k.name); }
        }
      } else if (a.pet) {
        follow(a, pl, dist, dt);
      } else {
        wander(a, dt);
      }
      let diff = a.targetAngle - a.angle;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      a.angle += diff * Math.min(1, dt * A.turnSpeed);
    });
    afterUpdate(dt);
  }

  // ----- Night creatures: zombies, skeletons and (on full-moon nights) a werewolf -----
  const N = CONFIG.night;
  const isNightKind = a => kindOf(a).behavior === 'night';
  function isFullMoon(d = Time.day()) { return d >= N.fullMoonFirst && (d - N.fullMoonFirst) % N.fullMoonEvery === 0; }
  let sunriseSaid = 0;
  // Returns true when this creature is done for this frame.
  function nightStep(a, pl, dist, dt) {
    if (Time.nightAmount() < 0.4 && !World.isUnder()) {   // (underground it is always dark)                      // sunrise: it slowly fades away
      a.dying = true; a.fade = CONFIG.actions.fadeTime * 2;
      if (sunriseSaid !== Time.day()) { sunriseSaid = Time.day(); Hotbar.say('The sun is rising. The night creatures fade away.'); }
      return true;
    }
    if (World.inLight(a.x, a.y)) {                       // caught in the light: it hurries out of it
      a.mode = 'calm'; a.walking = false;
      moveToward(a, pl, -kindOf(a).chaseSpeed * dt, true);
      return true;
    }
    return false;
  }
  // A skeleton walks to a safe distance and throws a bone now and then (slow, you can see it coming).
  let bones = [];
  function rangedStep(a, pl, dist, dt) {
    const k = kindOf(a), [near, far] = N.keepDistance;
    if (dist > far) moveToward(a, pl, k.chaseSpeed * dt);
    else if (dist < near) moveToward(a, pl, -k.chaseSpeed * dt);
    a.biteT -= dt;
    if (a.biteT <= 0 && dist < N.boneRange) {
      a.biteT = N.boneEvery;
      const d = dist || 1;
      bones.push({ x: a.x, y: a.y, dx: (pl.x - a.x) / d, dy: (pl.y - a.y) / d, t: 0, d: 0, from: k.name, damage: k.damage });
      Sound.toss();
    }
  }
  function updateBones(dt) {
    const pl = Mechanics.player, ph = CONFIG.player.hitbox / 2 + 3;
    bones.forEach(b => {
      const step = N.boneSpeed * dt;
      b.x += b.dx * step; b.y += b.dy * step; b.d += step; b.t += dt;
      if (Math.abs(b.x - pl.x) < ph && Math.abs(b.y - pl.y) < ph) { b.done = true; Mechanics.hurt(b.damage, b.from); return; }
      if (World.isSolidAt(b.x, b.y) || b.d > N.boneRange + 60) b.done = true;   // trees, walls and closed gates stop bones
    });
    bones = bones.filter(b => !b.done);
  }
  function drawBones(ctx, camX, camY) {
    bones.forEach(b => {
      ctx.save(); ctx.translate(Math.round(b.x - camX), Math.round(b.y - camY)); ctx.rotate(b.t * 4);   // a slow spin
      ctx.fillStyle = C.boneWhite; ctx.fillRect(-6, -1.5, 12, 3);
      ctx.fillRect(-8, -3, 3, 3); ctx.fillRect(-8, 0, 3, 3); ctx.fillRect(5, -3, 3, 3); ctx.fillRect(5, 0, 3, 3);
      ctx.restore();
    });
  }
  // New night creatures appear now and then, far from you and never in the light.
  let nightTimer = 0, wereDay = 0, moonWarned = 0;
  function spawnNight(dt) {
    if (Screens.peaceful()) return;
    const day = Time.day();
    if (isFullMoon() && moonWarned !== day && Time.label() === 'Night is coming') {   // a calm warning in the evening
      moonWarned = day;
      Hotbar.say(Animals.isVampireNight()
        ? 'Tonight is a full moon, and a vampire may come out too. Stay near your light!'
        : 'Tonight is a full moon. A werewolf may come out. Stay near your light!');
    }
    if (day < N.firstNight || Time.nightAmount() < N.startAt) { nightTimer = N.spawnEvery; return; }   // the first ones come out right away
    if (isFullMoon() && wereDay !== day && trySpawn('werewolf')) {
      wereDay = day;
      Sound.howl();
      Hotbar.say('A werewolf is out tonight! It is strong: 16 hits, or 4 rifle shots. You are faster than it.');
    }
    nightTimer += dt;
    if (nightTimer < N.spawnEvery) return;
    nightTimer = 0;
    const alive = kind => list.filter(a => a.kind === kind && !a.dying).length;
    for (let n = 0; n < N.perSpawn; n++) {
      if (alive('zombie') < N.maxZombies && (alive('skeleton') >= N.maxSkeletons || Math.random() < 0.6)) trySpawn('zombie');
      else if (alive('skeleton') < N.maxSkeletons) trySpawn('skeleton');
    }
  }
  function trySpawn(kind) {
    const pl = Mechanics.player, D = N.spawnDistance;
    for (let tries = 0; tries < 40; tries++) {
      const ang = Math.random() * Math.PI * 2, x = pl.x + Math.cos(ang) * D, y = pl.y + Math.sin(ang) * D;
      const t = World.tileOf(x, y);
      if (World.isBorder(t.tx, t.ty)) continue;
      const m = make(kind, x, y);
      if (!canStand(m, x, y)) continue;
      list.push(m);
      return true;
    }
    return false;
  }

  // ----- The vampire -----
  // Returns true when the vampire is done for this frame.
  function vampireStep(a, pl, dist, dt) {
    if (Time.nightAmount() < CONFIG.vampire.leaveAt && !World.isUnder()) { leave(a, false); return true; }   // morning: it flies away
    if (World.inLight(a.x, a.y)) {                       // caught in the light: it hurries out of it
      a.mode = 'calm'; a.walking = false;
      moveToward(a, pl, -kindOf(a).chaseSpeed * dt, true);
      return true;
    }
    return false;
  }
  let bats = [];
  function leave(a, beaten) {
    a.dying = true; a.fade = CONFIG.actions.fadeTime;
    for (let i = 0; i < 9; i++) {
      const ang = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 50;
      bats.push({ x: a.x, y: a.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0, life: 2 + Math.random() });
    }
    Sound.bats();
    Hotbar.say(beaten ? 'You beat the vampire! It turns into bats and flies away.'
                      : 'The sun is rising. The vampire turns into bats and flies away.');
  }
  function isVampireNight() {
    const V = CONFIG.vampire, d = Time.day();
    return d >= V.firstNight && (d - V.firstNight) % V.everyNights === 0;
  }
  let spawnedDay = 0, warnedDay = 0;
  function spawnVampire() {
    if (!isVampireNight() || Screens.peaceful()) return;
    const day = Time.day();
    if (warnedDay !== day && Time.label() === 'Night is coming') {      // a calm warning in the evening
      warnedDay = day;
      Hotbar.say('Tonight a vampire may come out. Only garlic hurts it. Get your garlic ready!');
    }
    if (spawnedDay === day || Time.nightAmount() < 0.7 || list.some(a => a.kind === 'vampire' && !a.dying)) return;
    const pl = Mechanics.player, D = CONFIG.vampire.spawnDistance;
    for (let tries = 0; tries < 40; tries++) {
      const ang = Math.random() * Math.PI * 2, x = pl.x + Math.cos(ang) * D, y = pl.y + Math.sin(ang) * D;
      const t = World.tileOf(x, y);
      if (World.isBorder(t.tx, t.ty)) continue;
      const v = make('vampire', x, y);
      if (!canStand(v, x, y)) continue;
      list.push(v); spawnedDay = day;
      Hotbar.say('A vampire is out tonight. Hold garlic to keep it away, or use your garlic slingshot.');
      return;
    }
  }
  function updateBats(dt) {
    bats.forEach(b => { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 1.01; b.vy *= 1.01; });
    bats = bats.filter(b => b.t < b.life);
  }
  function drawBats(ctx, camX, camY) {
    bats.forEach(b => {
      ctx.globalAlpha = Math.max(0, 1 - b.t / b.life);
      const x = Math.round(b.x - camX), y = Math.round(b.y - camY), up = Math.sin(b.t * 9) > 0 ? -2 : 1;   // slow wing beat
      ctx.fillStyle = C.bat;
      ctx.fillRect(x - 2, y - 2, 4, 4);
      ctx.fillRect(x - 7, y - 2 + up, 5, 2); ctx.fillRect(x + 2, y - 2 + up, 5, 2);
      ctx.globalAlpha = 1;
    });
  }

  // Your dog walks after you and sits down when it is close.
  function follow(a, pl, dist, dt) {
    const T = A.taming;
    if (dist > T.teleportDistance) {                 // very far away: it finds you again
      for (const ang of [Math.PI / 2, -Math.PI / 2, Math.PI, 0]) {
        const x = pl.x + Math.cos(ang) * 60, y = pl.y + Math.sin(ang) * 60;
        if (canStand(a, x, y)) { a.x = x; a.y = y; break; }
      }
      return;
    }
    if (dist > T.followDistance) { face(a, pl); moveToward(a, pl, T.petSpeed * dt); }
  }
  // R with meat facing a wolf: feed it. Returns 'pet' when it becomes your dog, else how many times it was fed.
  function canTame(a) { return a.kind === 'wolf' && !a.pet && !a.dying; }
  function feed(a) {
    a.tame++; a.mode = 'calm'; a.walking = false; a.timer = between(A.restTimeMin, A.restTimeMax); a.heartT = 1.5;
    if (a.tame >= A.taming.feedsNeeded) { a.pet = true; return 'pet'; }
    return a.tame;
  }

  // Calm animals walk a little, then rest.
  function wander(a, dt) {
      a.timer -= dt;
      if (a.timer <= 0) {
        a.walking = !a.walking;
        if (a.walking) {
          const dir = rand() * Math.PI * 2;
          a.dx = Math.cos(dir); a.dy = Math.sin(dir);
          a.targetAngle = dir + Math.PI / 2;
          a.timer = between(A.walkTimeMin, A.walkTimeMax);
        } else {
          a.timer = between(A.restTimeMin, A.restTimeMax);
        }
      }
      if (a.walking) {
        const step = kindOf(a).speed * dt;
        const nx = a.x + a.dx * step, ny = a.y + a.dy * step;
        if (canStand(a, nx, ny)) { a.x = nx; a.y = ny; }
        else { a.walking = false; a.timer = between(A.restTimeMin, A.restTimeMax); }
      }
  }

  function afterUpdate(dt) {
    list = list.filter(a => !a.dying || a.fade > 0);
    updateBones(dt);
    updateBats(dt);
    if (World.isUnder()) return;                       // in a cave: only the creatures that live there
    spawnVampire();
    spawnNight(dt);

    // New animals appear far away when there are too few.
    respawnTimer += dt;
    if (respawnTimer >= A.respawnEvery) {
      respawnTimer = 0;
      const kind = Object.keys(A.kinds).find(k => list.filter(a => a.kind === k && !a.dying && !a.pet).length < A.kinds[k].count);
      const spot = kind && World.randomFarGrass(Math.random);
      const start = World.spawnPoint(), minD = (A.kinds[kind] && A.kinds[kind].minStartDistance || 0) * W.tileSize;
      if (spot && Math.hypot(spot.x - start.x, spot.y - start.y) >= minD) {
        const a = make(kind, spot.x, spot.y);
        if (canStand(a, spot.x, spot.y)) list.push(a);
      }
    }
  }

  // The closest living animal that the point touches, or null.
  // factor: how big the touch area is (axe uses a wide one, a shot a narrow one).
  function findNear(px, py, factor) {
    let best = null, bestD = Infinity;
    list.forEach(a => {
      if (a.dying || a.pet) return;                  // your dog is never hit
      const d = Math.hypot(a.x - px, a.y - py);
      const reach = factor ? kindOf(a).size * factor + 4 : kindOf(a).size * 0.6 + 8;
      if (d <= reach && d < bestD) { best = a; bestD = d; }
    });
    return best;
  }

  // A hit with some power. Returns its drops when the hunt is done, otherwise null.
  let lastNoFeel = -1e9;
  function hit(a, power, byGarlic) {
    if (kindOf(a).garlicOnly) return hitVampire(a, byGarlic);
    a.hits += power;
    a.walking = false;
    a.timer = between(A.restTimeMin, A.restTimeMax);
    // Moose (and hunters) fight back when you hit them.
    if (!Screens.peaceful() && kindOf(a).behavior !== 'calm' && a.mode === 'calm') startAlert(a);
    if (a.hits < kindOf(a).hits) return null;
    a.dying = true;
    a.fade = CONFIG.actions.fadeTime;
    return kindOf(a).drops;
  }

  // Only garlic hurts the vampire. Each hit makes it flinch and step back.
  function hitVampire(a, byGarlic) {
    if (!Screens.peaceful() && a.mode === 'calm') startAlert(a);
    if (!byGarlic) {
      const now = performance.now();
      if (now - lastNoFeel > 2500) { lastNoFeel = now; Hotbar.say("The vampire doesn't feel it. Try garlic!"); }
      return null;
    }
    a.hits += 1;
    moveToward(a, Mechanics.player, -36);                // flinch: it steps back
    a.mode = 'alert'; a.alertT = A.alertTime;           // and waits a moment
    if (a.hits < kindOf(a).hits) { Hotbar.say(`The vampire hates garlic! (${a.hits}/${kindOf(a).hits})`); return null; }
    leave(a, true);
    Mechanics.stats().vampires = (Mechanics.stats().vampires || 0) + 1;
    return Inventory.count('cape') ? { garlic: 3 } : { cape: 1 };
  }

  // Going into a cave: the forest animals wait; your dog comes with you. Returns your dogs.
  let stash = null;
  function enterUnder(creatures) {
    const pets = list.filter(a => a.pet && !a.dying);
    stash = list.filter(a => !a.pet);
    list = creatures.concat(pets);
    bones = []; bats = [];
    return pets;
  }
  // Coming out: the cave creatures stay in the cave (returned), the forest animals come back.
  function leaveUnder() {
    const pets = list.filter(a => a.pet && !a.dying), creatures = list.filter(a => !a.pet && !a.dying);
    creatures.forEach(a => { a.mode = 'calm'; a.walking = false; });
    list = (stash || []).concat(pets); stash = null;
    bones = []; bats = [];
    return creatures;
  }
  // Put a creature here if it fits (not in the light, not in a wall). Returns true if it did.
  function spawnAt(kind, x, y) {
    const m = make(kind, x, y);
    if (!canStand(m, x, y)) return false;
    list.push(m);
    return true;
  }
  function save() {
    let all = list;
    if (stash) {                                       // saved while in a cave: your dog waits outside with you
      const o = World.outsidePos() || Mechanics.player;
      all = stash.concat(list.filter(a => a.pet).map(a => Object.assign({}, a, { x: o.x, y: o.y + 45 })));
    }
    return all.filter(a => !a.dying && a.kind !== 'vampire' && !isNightKind(a)).map(a => ({ kind: a.kind, x: Math.round(a.x), y: Math.round(a.y), tame: a.tame, pet: a.pet }));
  }
  function load(d) {
    stash = null;
    list = d.filter(a => A.kinds[a.kind]).map(a => Object.assign(make(a.kind, a.x, a.y), { tame: a.tame || 0, pet: !!a.pet }));
    // An animal standing where new water appeared (older saves): it simply comes back somewhere else later.
    list = list.filter(a => a.pet || !World.isSolidAt(a.x, a.y));
    list.filter(a => a.pet && World.isSolidAt(a.x, a.y)).forEach(a => { const pl = Mechanics.player; a.x = pl.x + 50; a.y = pl.y; });
  }

  // ----- Drawings, seen from above. Each faces "up" before rotating. -----
  function rect(ctx, color, x, y, w, h, p) { ctx.fillStyle = color; ctx.fillRect(x * p, y * p, w * p, h * p); }

  const drawBody = {
    rabbit(ctx, p) {
      rect(ctx, C.rabbit,     -2.5, -2,   5,   6,   p);   // body
      rect(ctx, C.rabbit,     -2,   -6,   4,   4,   p);   // head
      rect(ctx, C.rabbitEar,  -2,   -10,  1.5, 4.5, p);   // ears
      rect(ctx, C.rabbitEar,   0.5, -10,  1.5, 4.5, p);
      rect(ctx, C.rabbitTail, -1,    4,   2,   2,   p);   // tail
    },
    deer(ctx, p) {
      rect(ctx, C.deer,     -3,   -4,   6,   10,  p);     // body
      rect(ctx, C.deerDark, -0.5, -3,   1,   7,   p);     // back stripe
      rect(ctx, C.deerTail, -1,    6,   2,   1.5, p);     // tail
      rect(ctx, C.deer,     -2,   -8,   4,   4,   p);     // head
      rect(ctx, C.deerDark, -1,   -9,   2,   1,   p);     // nose
      rect(ctx, C.deerLight,-3.5, -7.5, 1.5, 1.5, p);     // ears
      rect(ctx, C.deerLight, 2,   -7.5, 1.5, 1.5, p);
    },
    sheep(ctx, p) {                                       // blocky white sheep, like Minecraft
      rect(ctx, C.sheepLeg,       -4,   -3,  1.5, 2,  p);  // legs peeking out
      rect(ctx, C.sheepLeg,        2.5, -3,  1.5, 2,  p);
      rect(ctx, C.sheepLeg,       -4,    4,  1.5, 2,  p);
      rect(ctx, C.sheepLeg,        2.5,  4,  1.5, 2,  p);
      rect(ctx, C.sheepWool,      -3.5, -4.5, 7, 11, p);   // fluffy body
      rect(ctx, C.sheepWoolShade, -2.5, -2,  2, 2,  p);    // wool curls
      rect(ctx, C.sheepWoolShade,  1,    1,  2, 2,  p);
      rect(ctx, C.sheepWoolShade, -2,    3.5,2, 2,  p);
      rect(ctx, C.sheepHead,      -2,   -8.5,4, 4,  p);    // grey face
      rect(ctx, C.sheepWool,      -2,   -6,  4, 1.5, p);   // wool on top of the head
      rect(ctx, C.sheepHead,      -3.5, -7.5,1.5, 1.5, p); // ears
      rect(ctx, C.sheepHead,       2,   -7.5,1.5, 1.5, p);
    },
    fox(ctx, p) {
      rect(ctx, C.fox,      -1.5,  4,   3,   5,   p);     // long tail
      rect(ctx, C.foxLight, -1.5,  8.5, 3,   1.5, p);     // white tail tip
      rect(ctx, C.fox,      -2.5, -3,   5,   8,   p);     // body
      rect(ctx, C.fox,      -2,   -7,   4,   4,   p);     // head
      rect(ctx, C.foxLight, -1,   -8.5, 2,   1.5, p);     // white snout
      rect(ctx, C.foxDark,  -2.5, -8,   1.5, 1.5, p);     // pointed ears
      rect(ctx, C.foxDark,   1,   -8,   1.5, 1.5, p);
    },
    wolf(ctx, p) {
      rect(ctx, C.wolfDark,  -1,    6,   2,   4,   p);    // tail
      rect(ctx, C.wolf,      -3,   -4,   6,   10,  p);    // body
      rect(ctx, C.wolfDark,  -1.5, -3,   3,   7,   p);    // dark back
      rect(ctx, C.wolf,      -2.2, -8,   4.4, 4.2, p);    // head
      rect(ctx, C.wolfLight, -1,   -9.5, 2,   1.8, p);    // snout
      rect(ctx, C.wolfDark,  -2.5, -9,   1.4, 1.6, p);    // ears
      rect(ctx, C.wolfDark,   1.1, -9,   1.4, 1.6, p);
    },
    bear(ctx, p) {
      rect(ctx, C.bear,      -4.5, -4,   9,   11,  p);    // big body
      rect(ctx, C.bearDark,  -3,   -3,   6,   4,   p);    // shoulder hump
      rect(ctx, C.bear,      -3,   -8.5, 6,   5,   p);    // head
      rect(ctx, C.bearSnout, -1.5, -10,  3,   2,   p);    // snout
      rect(ctx, C.bearDark,  -3.5, -9,   2,   2,   p);    // round ears
      rect(ctx, C.bearDark,   1.5, -9,   2,   2,   p);
    },
    zombie(ctx, p) {                                      // arms reaching forward, torn blue shirt
      rect(ctx, C.zombieSkin,      -4.5, -7,   1.8, 5,  p);  // arms
      rect(ctx, C.zombieSkin,       2.7, -7,   1.8, 5,  p);
      rect(ctx, C.zombieShirt,     -4.5, -2.5, 9,   5,  p);  // shoulders
      rect(ctx, C.zombieShirtDark, -1.5,  1.5, 3,   1,  p);  // torn edge
      rect(ctx, C.zombieSkin,      -2.5, -3.5, 5,   5,  p);  // head
      rect(ctx, C.zombieHair,      -2.5,  0.5, 5,   1,  p);  // messy hair at the back
    },
    skeleton(ctx, p) {                                    // white bones, thin arms
      rect(ctx, C.boneShade,  -4.5, -2,   1.2, 5,   p);    // arms
      rect(ctx, C.boneShade,   3.3, -2,   1.2, 5,   p);
      rect(ctx, C.boneWhite,  -4,   -2,   8,   1.2, p);    // shoulders
      rect(ctx, C.boneShade,  -0.6, -1,   1.2, 5,   p);    // spine
      rect(ctx, C.boneWhite,  -2.5,  0.5, 5,   0.9, p);    // ribs
      rect(ctx, C.boneWhite,  -2.5,  2.2, 5,   0.9, p);
      rect(ctx, C.boneWhite,  -2.5, -6,   5,   4.5, p);    // skull
      rect(ctx, C.boneDark,   -1.8, -5.2, 1.2, 1.2, p);    // eyes
      rect(ctx, C.boneDark,    0.6, -5.2, 1.2, 1.2, p);
    },
    werewolf(ctx, p) {                                    // a big, shaggy wolf-man
      rect(ctx, C.wereDark,  -1,    5,   2,   4,   p);     // tail
      rect(ctx, C.wereFur,   -4.5, -3,   9,   9,   p);     // big shoulders
      rect(ctx, C.wereDark,  -2,   -2,   4,   6,   p);     // dark back
      rect(ctx, C.wereFur,   -5.5, -5,   2,   4,   p);     // arms with claws
      rect(ctx, C.wereFur,    3.5, -5,   2,   4,   p);
      rect(ctx, C.wereLight, -5.5, -6,   2,   1,   p);
      rect(ctx, C.wereLight,  3.5, -6,   2,   1,   p);
      rect(ctx, C.wereFur,   -2.5, -8,   5,   5,   p);     // head
      rect(ctx, C.wereLight, -1,   -9.5, 2,   2,   p);     // snout
      rect(ctx, C.wereDark,  -2.8, -9,   1.5, 2,   p);     // pointed ears
      rect(ctx, C.wereDark,   1.3, -9,   1.5, 2,   p);
      rect(ctx, C.wereEye,   -1.6, -7,   1,   1,   p);     // yellow eyes (steady, no blinking)
      rect(ctx, C.wereEye,    0.6, -7,   1,   1,   p);
    },
    vampire(ctx, p) {                                     // seen from above: a wide cape, pale face
      rect(ctx, C.vampCape,   -5.5, -2,   11,  9,   p);    // cape
      rect(ctx, C.vampLining, -5.5,  6,   11,  1,   p);    // red lining at the bottom
      rect(ctx, C.vampLining, -4,   -2.5,  1.5, 2, p);    // high collar
      rect(ctx, C.vampLining,  2.5, -2.5,  1.5, 2, p);
      rect(ctx, C.vampFace,   -2.5, -6,   5,   5,   p);    // pale face
      rect(ctx, C.vampHair,   -2.5, -6,   5,   2,   p);    // dark hair
      rect(ctx, C.vampHair,   -0.5, -6,   1,   3,   p);    // pointed hairline
    },
    moose(ctx, p) {
      rect(ctx, C.moose,       -3.5, -4,   7,   11,  p);  // big body
      rect(ctx, C.mooseDark,   -3.5, -4,   7,   3,   p);  // dark shoulders
      rect(ctx, C.moose,       -2,   -8.5, 4,   5,   p);  // head
      rect(ctx, C.mooseDark,   -1.5, -9.5, 3,   1.5, p);  // nose
      rect(ctx, C.mooseAntler, -6.5, -7.5, 4,   2,   p);  // wide flat antlers
      rect(ctx, C.mooseAntler,  2.5, -7.5, 4,   2,   p);
      rect(ctx, C.mooseAntler, -6.5, -9,   1,   1.5, p);
      rect(ctx, C.mooseAntler,  5.5, -9,   1,   1.5, p);
    }
  };

  function drawAnimal(ctx, a, sx, sy) {
    const k = kindOf(a);
    const p = k.size / 13;
    ctx.save();
    if (a.dying) ctx.globalAlpha = Math.max(0, a.fade / CONFIG.actions.fadeTime);
    ctx.translate(Math.round(sx), Math.round(sy));
    ctx.fillStyle = C.shadow;
    ctx.beginPath();
    ctx.ellipse(2, 3, 4.5 * p, 7 * p, a.angle, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(a.angle);
    drawBody[a.kind](ctx, p);
    if (a.pet) rect(ctx, C.collar, -2.2, -4.6, 4.4, 1.3, p);      // your dog wears a red collar
    ctx.restore();
    if (a.heartT > 0) {                                           // a small heart after feeding
      ctx.globalAlpha = Math.min(1, a.heartT);
      const hx = Math.round(sx) - 6, hy = Math.round(sy - k.size * 0.75 - 22);
      ctx.fillStyle = C.heart2;
      ctx.fillRect(hx, hy, 4, 4); ctx.fillRect(hx + 8, hy, 4, 4); ctx.fillRect(hx, hy + 2, 12, 4);
      ctx.fillRect(hx + 2, hy + 6, 8, 2); ctx.fillRect(hx + 4, hy + 8, 4, 2);
      ctx.globalAlpha = 1;
    }
    if (a.hits > 0 && !a.dying)
      World.drawHitBar(ctx, sx, sy - k.size * 0.75 - 4, 1 - a.hits / k.hits);
    // A steady "!" (no blinking) shows this animal is coming toward you.
    if (a.mode !== 'calm' && !a.dying) {
      const bx = Math.round(sx) - 7, by = Math.round(sy - k.size * 0.75 - 28);
      ctx.fillStyle = C.alertBox; ctx.fillRect(bx, by, 14, 18);
      ctx.fillStyle = C.alertText;
      ctx.font = '700 14px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('!', bx + 7, by + 14); ctx.textAlign = 'left';
    }
  }

  function draw(ctx, camX, camY, viewW, viewH) {
    list.forEach(a => {
      const sx = a.x - camX, sy = a.y - camY;
      if (sx < -60 || sy < -60 || sx > viewW + 60 || sy > viewH + 60) return;
      drawAnimal(ctx, a, sx, sy);
    });
    drawBones(ctx, camX, camY);
    drawBats(ctx, camX, camY);
  }

  return { init, update, draw, findNear, hit, blocksAt, save, load, calmAll, canTame, feed, enterUnder, leaveUnder, spawnAt, canStandAt: (a, x, y) => canStand(a, x, y, true),
           hasPet: () => list.some(a => a.pet && !a.dying), list: () => list, isVampireNight, isFullMoon,
           // A small soft light around night creatures, so you can see them coming in the dark.
           lights: (camX, camY) => list.filter(a => !a.dying && (isNightKind(a) || a.kind === 'vampire'))
                                       .map(a => ({ x: a.x - camX, y: a.y - camY, r: 55 })) };
})();
