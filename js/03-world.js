const World = (() => {
  const W = CONFIG.world;
  const C = CONFIG.colors;
  const B = CONFIG.blocks;
  // Tile numbers: 0 = grass, then one number for each block in CONFIG.blocks.
  const NAMES = ['grass', ...Object.keys(B)];
  const TILES = {};
  NAMES.forEach((n, i) => TILES[n] = i);
  const GRASS = 0, TREE = TILES.tree;
  let tiles, seed = W.seed, wantedTrees = 0, regrowTimer = 0;
  let damage = new Map();     // tile index -> damage taken
  let cooking = new Map();    // campfire tile index -> [[seconds cooked, raw item], ...] (old saves: just seconds = meat)
  let tents = new Map();      // tent tile index -> { bed, furnace } (what is inside each tent)
  let ring = null;            // a secret...
  let crops = new Map();      // planted garlic tile index -> seconds in this growing stage
  let caves = new Map();      // cave opening tile index -> { id, nodes: [{ dmg, mined, day }] } (id 0 is the old mine)
  let gates = new Map();      // gate tile index -> { dir, open, locked, side, swing }
  let fading = [];            // broken things slowly disappearing
  let shelves = new Map();    // trophy shelf tile index -> Knight's Quest coins on it
  // Underground: each cave is its own map. While you are inside, the forest waits in "forest".
  let under = null;           // null in the forest; inside a cave: that cave's id
  let forest = null;          // the forest's things, kept safe while you are underground
  let caveMaps = {};          // cave id -> its map (made the first time you go in, the same every time)
  let outside = null;         // where you stood in front of the cave opening
  let cave = null;            // the extras of the cave you are in: { id, title, chests, secrets, deco, exit, area }

  // Everything that belongs to one map (the forest, or one cave).
  function layer() { return { tiles, damage, cooking, tents, crops, gates, fading, shelves, cave }; }
  function useLayer(l) { ({ tiles, damage, cooking, tents, crops, gates, fading, shelves, cave } = l); }

  // Small repeatable random number generator (same seed = same forest).
  function makeRandom(s) {
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A fixed "random" value for any tile position, used for colours.
  function hash(x, y, k) {
    let h = (x * 374761393 + y * 668265263 + k * 2147483647 + seed) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function nameAt(tx, ty) { return NAMES[tileAt(tx, ty)]; }
  function blockAt(tx, ty) { return B[nameAt(tx, ty)] || null; }

  function generate(newSeed) {
    seed = newSeed;
    const rand = makeRandom(seed);
    tiles = new Uint8Array(W.width * W.height);
    const cx = Math.floor(W.width / 2), cy = Math.floor(W.height / 2);
    const nearStart = (x, y, extra = 0) => Math.hypot(x - cx, y - cy) <= W.clearingRadius + extra;
    for (let y = 0; y < W.height; y++)
      for (let x = 0; x < W.width; x++) {
        const r = rand();
        tiles[y * W.width + x] = isBorder(x, y) ? TREE : (!nearStart(x, y) && r < W.treeChance ? TREE : GRASS);
      }
    // Groups of grey rocks, some with coal.
    for (let g = 0; g < W.rockGroups; g++) {
      const gx = Math.floor(rand() * W.width), gy = Math.floor(rand() * W.height);
      const size = W.rockGroupSize;
      for (let y = gy - size; y <= gy + size; y++)
        for (let x = gx - size; x <= gx + size; x++) {
          if (x < 0 || y < 0 || x >= W.width || y >= W.height || isBorder(x, y) || nearStart(x, y, 1)) continue;
          if (Math.hypot(x - gx, y - gy) > size + 0.3 || rand() < 0.35) continue;
          const kind = rand();
          tiles[y * W.width + x] = kind < W.coalChance ? TILES.coal
                                 : kind < W.coalChance + W.ironChance ? TILES.iron : TILES.stone;
        }
    }
    // Make sure there is one small rock group near the start.
    for (let i = 0; i < 3; i++) {
      const x = cx + 6 + i, y = cy - 3;
      tiles[y * W.width + x] = i === 1 ? TILES.coal : TILES.stone;
    }
    makeWater(makeRandom(seed + 21), nearStart);
    makeCaves(makeRandom(seed + 31));
    ensureIron(makeRandom(seed + 5));
    // Wild garlic: small patches with white flowers.
    const grand = makeRandom(seed + 13);
    for (let g = 0; g < CONFIG.garlic.wildPatches; g++) {
      const gx = Math.floor(grand() * W.width), gy = Math.floor(grand() * W.height);
      for (let k = 0; k < 3; k++) {
        const x = gx + Math.floor(grand() * 3) - 1, y = gy + Math.floor(grand() * 3) - 1;
        if (tileAt(x, y) === GRASS && !isBorder(x, y) && !nearStart(x, y, 1)) tiles[y * W.width + x] = TILES.garlicWild;
      }
    }
    ensureGarlic(makeRandom(seed + 17));
    makeRing(makeRandom(seed + 9));
    wantedTrees = countTrees();
    damage = new Map(); fading = []; cooking = new Map(); tents = new Map(); crops = new Map(); gates = new Map();
    shelves = new Map(); cave = null; under = null; forest = null; caveMaps = {}; outside = null;
  }

  // ----- Rivers and ponds -----
  // safe: an existing world. Water only goes on grass, trees, rocks and wild garlic, never on or next to
  // anything you built, never where you stand, and never on the secret ring.
  let safeAvoid = null;
  function carve(x, y, safe) {
    if (x < 0 || y < 0 || x >= W.width || y >= W.height || isBorder(x, y)) return;
    if (safe) {
      const b = blockAt(x, y), ts = W.tileSize;
      if (b && !b.natural) return;
      if (!nothingBuiltNear(x, y, 2)) return;
      if (safeAvoid && Math.hypot((x + 0.5) * ts - safeAvoid.x, (y + 0.5) * ts - safeAvoid.y) < 4 * ts) return;
      if (ring && Math.abs(x - ring.tx) <= 3 && Math.abs(y - ring.ty) <= 3) return;
    }
    tiles[y * W.width + x] = TILES.water;
  }
  function pond(cx, cy, r, rand, safe) {
    for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
      for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++)
        if (Math.hypot(x - cx, y - cy) <= r + (rand() - 0.5) * 0.9) carve(x, y, safe);
  }
  function makeWater(rand, nearStart, safe) {
    const WA = CONFIG.water, cx = Math.floor(W.width / 2), cy = Math.floor(W.height / 2);
    // Rivers run from the top edge to the bottom edge, away from the middle, with dry fords to cross.
    for (let r = 0; r < WA.rivers; r++) {
      let x = rand() < 0.5 ? 10 + Math.floor(rand() * 18) : W.width - 28 + Math.floor(rand() * 18);
      for (let y = W.borderThickness; y < W.height - W.borderThickness; y++) {
        if (y % 3 === 0) x = Math.max(6, Math.min(W.width - 8, x + Math.floor(rand() * 3) - 1));
        if (y % WA.fordEvery < WA.fordWidth) continue;                  // a ford: dry ground to walk across
        for (let w = 0; w < 2; w++) if (!nearStart(x + w, y, 3)) carve(x + w, y, safe);
      }
    }
    // Ponds, far from the start, and one a short walk away.
    for (let p = 0; p < WA.ponds; p++) {
      const px = 6 + Math.floor(rand() * (W.width - 12)), py = 6 + Math.floor(rand() * (W.height - 12));
      if (Math.hypot(px - cx, py - cy) < 14) continue;
      pond(px, py, 1.5 + rand() * 1.8, rand, safe);
    }
    if (WA.pondNearStart) {
      const a = rand() * Math.PI * 2, d = 8 + rand() * 2;
      pond(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.8, rand, safe);
    }
  }
  // Older saves (made before there was water): add the river and the ponds once, safely (see carve()).
  function ensureWater(rand, avoid) {
    const cx = Math.floor(W.width / 2), cy = Math.floor(W.height / 2);
    const nearStart = (x, y, extra = 0) => Math.hypot(x - cx, y - cy) <= W.clearingRadius + extra;
    safeAvoid = avoid || null;
    makeWater(rand, nearStart, true);
    safeAvoid = null;
  }
  function isWater(tx, ty) { return tileAt(tx, ty) === TILES.water; }

  // ----- Caves -----
  // Each opening sits in a little hill of rocks. safe: an existing world (only empty ground, away from your things).
  function makeCaves(rand, safe, avoid) {
    const CV = CONFIG.caves, ts = W.tileSize, cx = Math.floor(W.width / 2), cy = Math.floor(W.height / 2);
    caves = new Map();
    const spots = [];
    for (let id = 0; id < CV.count; id++) {
      for (let tries = 0; tries < 3000; tries++) {
        const tx = 6 + Math.floor(rand() * (W.width - 12)), ty = 6 + Math.floor(rand() * (W.height - 12));
        if (Math.hypot(tx - cx, ty - cy) < CV.minFromStart) continue;
        if (spots.some(([x, y]) => Math.hypot(tx - x, ty - y) < CV.apart)) continue;
        let ok = true;
        for (let y = ty - 2; y <= ty + 2 && ok; y++) for (let x = tx - 2; x <= tx + 2; x++)
          if (isWater(x, y) || isBorder(x, y)) { ok = false; break; }
        if (!ok) continue;
        if (ring && Math.abs(tx - ring.tx) <= 4 && Math.abs(ty - ring.ty) <= 4) continue;
        if (safe && (!nothingBuiltNear(tx, ty, 3) ||
                     (avoid && Math.hypot((tx + 0.5) * ts - avoid.x, (ty + 0.5) * ts - avoid.y) < 4 * ts))) continue;
        spots.push([tx, ty]);
        for (let x = tx - 1; x <= tx + 1; x++) tiles[(ty - 1) * W.width + x] = TILES.stone;   // the hill around it
        tiles[ty * W.width + tx - 1] = TILES.stone; tiles[ty * W.width + tx + 1] = TILES.stone;
        tiles[ty * W.width + tx] = TILES.cave;
        tiles[(ty + 1) * W.width + tx] = GRASS;                                             // a way in
        caves.set(ty * W.width + tx, { id, nodes: [] });
        break;
      }
    }
  }
  function caveAt(tx, ty) { return nameAt(tx, ty) === 'cave' ? caves.get(ty * W.width + tx) || null : null; }

  // ----- Inside a cave: a big dark map of rooms and tunnels -----
  // The same seed always makes the same cave. Floor = 0 (drawn as cave floor underground).
  // Around every room and tunnel: rows of stone with coal and iron (you can mine them), then deep rock.
  // Secret rooms hide behind a cracked rock. Treasure chests wait in corners and dead ends.
  const SECRET_SIZE = { coffins: [7, 4], minions: [7, 4], dragon: [11, 5] };
  const CAVE_VERSION = 8;     // when the caves are made differently, caves saved before are made fresh
  function makeCaveMap(id) {
    const CV = CONFIG.caves, K = CV.kinds[id % CV.kinds.length];
    const rand = makeRandom(seed * 7 + 101 + id * 977);
    const Wd = W.width, FLOOR = GRASS, ROCK = TILES.caveRock;
    const t = new Uint8Array(Wd * W.height).fill(ROCK);
    const [cw, ch] = K.size, x0 = Math.floor((Wd - cw) / 2), y0 = Math.floor((W.height - ch) / 2);
    const x1 = x0 + cw - 1, y1 = y0 + ch - 1;
    const get = (x, y) => (x < x0 || y < y0 || x > x1 || y > y1) ? ROCK : t[y * Wd + x];
    const set = (x, y, v) => { if (x > x0 + 2 && y > y0 + 2 && x < x1 - 2 && y < y1 - 1) t[y * Wd + x] = v; };
    const isFloor = (x, y) => get(x, y) === FLOOR;
    const deco = [];
    // Rooms. The first one is just inside the way out (at the bottom).
    const exitX = Math.floor(Wd / 2), exitY = y1 - 1;
    const rooms = [{ x: exitX + 0.5, y: exitY - 5, r: 3 }];
    for (let tries = 0; rooms.length < K.rooms && tries < 3000; tries++) {
      const r = 2.5 + rand() * 3;
      const x = x0 + 4 + r + rand() * (cw - 8 - 2 * r), y = y0 + 4 + r + rand() * (ch - 9 - 2 * r);
      if (rooms.some(o => Math.hypot(o.x - x, o.y - y) < o.r + r + 3)) continue;
      rooms.push({ x, y, r });
    }
    rooms.forEach(o => {
      for (let y = Math.floor(o.y - o.r - 1); y <= o.y + o.r + 1; y++)
        for (let x = Math.floor(o.x - o.r * 1.3 - 1); x <= o.x + o.r * 1.3 + 1; x++)
          if (Math.hypot((x + 0.5 - o.x) / 1.3, y + 0.5 - o.y) <= o.r + (rand() - 0.5) * 0.7) set(x, y, FLOOR);
    });
    // Tunnels, 2 squares wide. In the old mine they are straight, like real mine tunnels.
    const paths = [];
    function tunnel(a, b) {
      let x = Math.floor(a.x), y = Math.floor(a.y);
      const tx = Math.floor(b.x), ty = Math.floor(b.y), path = [];
      const xFirst = rand() < 0.5;
      for (let guard = 0; (x !== tx || y !== ty) && guard < 300; guard++) {
        const dx = tx - x, dy = ty - y;
        const moveX = K.mine ? (xFirst ? dx !== 0 : dy === 0)
                             : dy === 0 || (dx !== 0 && rand() < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy)));
        if (moveX) x += Math.sign(dx); else y += Math.sign(dy);
        path.push([x, y, moveX ? 'h' : 'v']);
        for (let k = 0; k < 2; k++) for (let m = 0; m < 2; m++) set(x + k, y + m, FLOOR);
      }
      paths.push(path);
    }
    for (let i = 1; i < rooms.length; i++) {
      let best = 0, bd = Infinity;
      for (let j = 0; j < i; j++) { const d = Math.hypot(rooms[i].x - rooms[j].x, rooms[i].y - rooms[j].y); if (d < bd) { bd = d; best = j; } }
      tunnel(rooms[i], rooms[best]);
    }
    for (let k = 0; k < 2 && rooms.length > 4; k++) {                 // a couple of loops, so it is not one long line
      const a = rooms[1 + Math.floor(rand() * (rooms.length - 1))], b = rooms[1 + Math.floor(rand() * (rooms.length - 1))];
      if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < 18) tunnel(a, b);
    }
    for (let y = exitY - 5; y < exitY; y++) { t[y * Wd + exitX] = FLOOR; t[y * Wd + exitX + 1] = FLOOR; }   // the way in
    // Secret rooms behind a cracked rock.
    const secrets = [], chests = new Map();
    function digSecret(key) {
      const [sw, sh] = SECRET_SIZE[key];
      const dirs = [[1, 0], [-1, 0], [0, -1], [0, 1]];
      const open = [];
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (isFloor(x, y) && exitDist(x, y) > 6) open.push([x, y]);
      for (let tries = 0; tries < 8000 && open.length; tries++) {
        const M = tries < 5000 ? 2 : 1;                                // rock kept around it (less if the cave is crowded)
        let [x, y] = open[Math.floor(rand() * open.length)];
        const [ddx, ddy] = dirs[Math.floor(rand() * 4)];
        while (isFloor(x + ddx, y + ddy)) { x += ddx; y += ddy; }
        // A short tunnel that stops (the clue), the hidden rock, then a hidden passage to the room.
        const len = 5 + Math.floor(rand() * 4), ex = x + ddx * len, ey = y + ddy * len;
        let rx, ry;
        if (ddx === 1) { rx = ex + 1; ry = ey - Math.floor(sh / 2); }
        else if (ddx === -1) { rx = ex - sw; ry = ey - Math.floor(sh / 2); }
        else if (ddy === -1) { rx = ex - Math.floor(sw / 2); ry = ey - sh; }
        else { rx = ex - Math.floor(sw / 2); ry = ey + 1; }
        if (rx - M <= x0 + 1 || ry - M <= y0 + 1 || rx + sw + M >= x1 - 1 || ry + sh + M >= y1 - 2) continue;
        let ok = true;
        for (let yy = ry - M; ok && yy < ry + sh + M; yy++) for (let xx = rx - M; xx < rx + sw + M; xx++) if (get(xx, yy) !== ROCK) { ok = false; break; }
        for (let k = 2; ok && k <= len; k++)
          for (let s = -1; s <= 1; s++) if (get(x + ddx * k + (ddy ? s : 0), y + ddy * k + (ddx ? s : 0)) !== ROCK) ok = false;
        if (!ok) continue;
        const hidden = [];
        for (let k = 1; k <= len; k++) {
          const px = x + ddx * k, py = y + ddy * k;
          if (k === 3) t[py * Wd + px] = TILES.crackedRock;
          else { t[py * Wd + px] = FLOOR; if (k > 3) hidden.push([px, py]); }
        }
        deco.push({ type: 'sword', x: x + ddx * 2, y: y + ddy * 2, dir: ddx ? 'h' : 'v' });   // a tiny sword scratched in the floor
        for (let yy = ry; yy < ry + sh; yy++) for (let xx = rx; xx < rx + sw; xx++) t[yy * Wd + xx] = FLOOR;
        const cx = ddx === -1 ? rx : rx + sw - 1;                      // the minions room has a treasure chest in a back corner
        const cy = ddy === 1 ? ry + sh - 1 : ry;
        const ci = cy * Wd + cx;
        if (key === 'minions') { t[ci] = TILES.chest; chests.set(ci, { opened: false, coins: CV.secretCoins, secret: true }); }
        secrets.push({ key, x: rx, y: ry, w: sw, h: sh, chest: [cx - rx, cy - ry], hidden, revealed: false, announced: false, revealedAt: 0,
                       rock: [x + ddx * 3, y + ddy * 3] });
        return;
      }
    }
    function exitDist(x, y) { return Math.hypot(x - exitX, y - exitY); }
    K.secrets.forEach(digSecret);
    const inSecret = (x, y) => secrets.some(r => x >= r.x - 1 && y >= r.y - 1 && x <= r.x + r.w && y <= r.y + r.h);
    // A still pool of water (you can fish in it).
    if (K.pool) {
      const o = rooms.slice(1).sort((a, b) => b.r - a.r)[0];
      if (o && o.r >= 3.5)
        for (let y = Math.floor(o.y - 2); y <= o.y + 2; y++) for (let x = Math.floor(o.x - 2); x <= o.x + 2; x++)
          if (Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) <= 1.7 && isFloor(x, y)) t[y * Wd + x] = TILES.water;
    }
    // Stone walls with ore around everything you can walk on.
    const R = CV.wallRings;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (t[y * Wd + x] !== ROCK) continue;
      let near = false;
      for (let yy = y - R; !near && yy <= y + R; yy++) for (let xx = x - R; xx <= x + R; xx++) {
        const v = get(xx, yy);
        if (v === FLOOR || v === TILES.chest) { near = true; break; }
      }
      if (!near) continue;
      const r = rand(), gold = K.gold ? CV.goldChance : 0;
      t[y * Wd + x] = r < gold ? TILES.gold : r < gold + CV.coalChance ? TILES.coal
                    : r < gold + CV.coalChance + CV.ironChance ? TILES.iron : TILES.stone;
    }
    t[exitY * Wd + exitX] = TILES.caveExit;
    t[exitY * Wd + exitX + 1] = TILES.caveExit;
    // Floor squares, sorted into useful groups.
    const floor = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++)
      if (t[y * Wd + x] === FLOOR && !inSecret(x, y) && exitDist(x, y) > 3) floor.push([x, y]);
    const walls4 = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => !isFloor(x + a, y + b)).length;
    const walls8 = (x, y) => { let n = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if ((a || b) && !isFloor(x + a, y + b)) n++; return n; };
    const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
    shuffle(floor);
    const used = new Set();
    const free = (x, y, d) => ![...used].some(k => { const ux = k % Wd, uy = Math.floor(k / Wd); return Math.hypot(ux - x, uy - y) < d; });
    // Hidden treasure chests: dead ends and corners, far from the way in and from each other.
    let placed = 0;
    for (const [x, y] of floor) {
      if (placed >= CV.chests) break;
      if (exitDist(x, y) < 10 || walls8(x, y) < 5) continue;
      const w4 = walls4(x, y);
      if (w4 < 2) continue;
      if (w4 === 2 && (isFloor(x - 1, y) && isFloor(x + 1, y) || isFloor(x, y - 1) && isFloor(x, y + 1))) continue;   // never block a tunnel
      if (![...chests.keys()].every(k => Math.hypot(k % Wd - x, Math.floor(k / Wd) - y) >= 10)) continue;
      const ci = y * Wd + x;
      t[ci] = TILES.chest; chests.set(ci, { opened: false, coins: CV.coins[0] + Math.floor(rand() * (CV.coins[1] - CV.coins[0] + 1)) });
      used.add(ci); placed++;
    }
    const nearWall = floor.filter(([x, y]) => t[y * Wd + x] === FLOOR && walls4(x, y) >= 1 && walls4(x, y) <= 2 &&
                                             !(isFloor(x - 1, y) && isFloor(x + 1, y) && walls4(x, y) === 2) &&
                                             !(isFloor(x, y - 1) && isFloor(x, y + 1) && walls4(x, y) === 2));
    const takeSpots = (n, d, minExit = 5) => {
      const out = [];
      for (const [x, y] of nearWall) {
        if (out.length >= n) break;
        if (t[y * Wd + x] !== FLOOR || exitDist(x, y) < minExit || !free(x, y, d)) continue;
        used.add(y * Wd + x); out.push([x, y]);
      }
      return out;
    };
    takeSpots(CV.glowShrooms, 3).forEach(([x, y]) => t[y * Wd + x] = TILES.glowShroom);
    if (K.mine) {                                                       // rails, wooden beams, old carts and lanterns
      const seen = new Set();
      paths.forEach(path => path.forEach(([x, y, dir], i) => {
        const k = y * Wd + x + (dir === 'v' ? 0.5 : 0);
        if (seen.has(k)) return;
        seen.add(k);
        deco.push({ type: 'rail', x, y, dir });
        if (i % 7 === 3) deco.push({ type: 'beam', x, y, dir });
      }));
      const rails = deco.filter(d => d.type === 'rail' && exitDist(d.x, d.y) > 8);
      for (let k = 0; k < 3 && rails.length; k++) { const r = rails[Math.floor(rand() * rails.length)]; deco.push({ type: 'cart', x: r.x, y: r.y, dir: r.dir }); }
      takeSpots(8, 7).forEach(([x, y]) => deco.push({ type: 'lantern', x, y, light: 130 }));
      for (let k = 0; k < 4; k++) { const [x, y] = floor[Math.floor(rand() * floor.length)]; deco.push({ type: 'wisp', x, y, light: 60, k }); }
    }
    if (K.crystals) takeSpots(26, 2).forEach(([x, y], i) => deco.push({ type: 'crystal', x, y, light: 70, k: i }));
    takeSpots(7, 6).forEach(([x, y]) => deco.push({ type: 'bones', x, y, k: Math.floor(rand() * 3) }));
    const batSpots = takeSpots(CV.bats, 5, 8);                         // bats in every cave (small caves: closer together)
    if (batSpots.length < CV.bats) batSpots.push(...takeSpots(CV.bats - batSpots.length, 3, 6));
    for (const [x, y] of floor) {
      if (batSpots.length >= CV.bats) break;
      if (t[y * Wd + x] === FLOOR && exitDist(x, y) >= 5 && free(x, y, 2)) { used.add(y * Wd + x); batSpots.push([x, y]); }
    }
    batSpots.forEach(([x, y]) => deco.push({ type: 'bat', x, y }));
    return { tiles: t, damage: new Map(), cooking: new Map(), tents: new Map(), crops: new Map(), gates: new Map(),
             fading: [], shelves: new Map(),
             cave: { id, title: K.title, mine: !!K.mine, chests, secrets, deco, exit: { tx: exitX, ty: exitY },
                     area: { x0, y0, x1, y1 }, lanterns: deco.filter(d => d.type === 'lantern') } };
  }

  // Go into a cave: the forest is kept safe, and the cave's map comes in. Returns where you stand inside.
  function enterCave(id, from) {
    if (under !== null) return null;
    forest = layer(); outside = { x: from.x, y: from.y };
    if (!caveMaps[id]) caveMaps[id] = makeCaveMap(id);
    useLayer(caveMaps[id]); damage = new Map(); fading = [];
    under = id;
    const ts = W.tileSize;
    return { x: (cave.exit.tx + 1) * ts, y: (cave.exit.ty - 0.5) * ts };
  }
  // Back to the forest. Returns where you stood outside.
  function leaveCave() {
    if (under === null) return null;
    caveMaps[under] = layer();
    useLayer(forest); forest = null; under = null;
    return outside;
  }
  // A secret room you have not found yet (and its hidden passage): drawn as solid stone, and solid.
  function hiddenAt(tx, ty) {
    if (!cave) return null;
    for (const r of cave.secrets) {
      if (r.revealed) continue;
      if (tx >= r.x && ty >= r.y && tx < r.x + r.w && ty < r.y + r.h) return r;
      if (r.hidden.some(([a, b]) => a === tx && b === ty)) return r;
    }
    return null;
  }
  function chestAt(tx, ty) { return cave && nameAt(tx, ty) === 'chest' ? cave.chests.get(ty * W.width + tx) || null : null; }
  function shelfCoins(tx, ty) { return shelves.get(ty * W.width + tx) || 0; }
  function addShelfCoins(tx, ty, n) { const i = ty * W.width + tx; shelves.set(i, (shelves.get(i) || 0) + n); return shelves.get(i); }

  function countTrees() { let n = 0; for (const t of tiles) if (t === TREE) n++; return n; }

  function isBorder(tx, ty) {
    const b = W.borderThickness;
    return tx < b || ty < b || tx >= W.width - b || ty >= W.height - b;
  }

  function spawnPoint() {
    return { x: (Math.floor(W.width / 2) + 0.5) * W.tileSize, y: (Math.floor(W.height / 2) + 0.5) * W.tileSize };
  }

  function tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= W.width || ty >= W.height) return TREE;
    return tiles[ty * W.width + tx];
  }

  // Is this pixel position blocked?
  function isSolidAt(px, py) {
    const tx = Math.floor(px / W.tileSize), ty = Math.floor(py / W.tileSize), b = blockAt(tx, ty);
    if (under !== null && hiddenAt(tx, ty)) return true;
    if (b && b.gate) { const g = gates.get(ty * W.width + tx); return !(g && g.open); }   // an open gate lets you through
    return !!(b && b.solid);
  }

  function tileOf(px, py) { return { tx: Math.floor(px / W.tileSize), ty: Math.floor(py / W.tileSize) }; }

  // Returns { tx, ty, name, block } for a breakable thing at this pixel, or null.
  function breakableAt(px, py) {
    const { tx, ty } = tileOf(px, py);
    const name = nameAt(tx, ty);
    if (name === 'grass' || !B[name] || B[name].hits === 0 || isBorder(tx, ty)) return null;   // water and caves can't be broken
    return { tx, ty, name, block: B[name] };
  }

  // One hit. Returns the drops when it breaks, otherwise null.
  function hitBlock(tx, ty, power) {
    const i = ty * W.width + tx;
    const name = NAMES[tiles[i]];
    const dmg = (damage.get(i) || 0) + power;
    if (dmg < B[name].hits) { damage.set(i, dmg); return null; }
    damage.delete(i);
    tiles[i] = GRASS;
    crops.delete(i);
    const partner = partnerOf(i);                // a gate: both squares go together
    if (partner >= 0 && NAMES[tiles[partner]] === 'gate') {
      tiles[partner] = GRASS; damage.delete(partner);
      fading.push({ tx: partner % W.width, ty: Math.floor(partner / W.width), name, time: CONFIG.actions.fadeTime });
    }
    gates.delete(i); gates.delete(partner);
    fading.push({ tx, ty, name, time: CONFIG.actions.fadeTime });
    if (under !== null)                          // broke through into a secret room: it is found (the lights come on)
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => {
        const r = hiddenAt(tx + a, ty + b);
        if (r) { r.revealed = true; r.revealedAt = performance.now(); }
      });
    const onShelf = shelves.get(i);              // a trophy shelf: your coins come back too
    if (onShelf !== undefined) { shelves.delete(i); return onShelf ? Object.assign({}, B[name].drops, { coin: onShelf }) : B[name].drops; }
    // A bed inside a tent you break comes back too.
    const inside = tents.get(i);
    if (inside) {                              // everything inside a tent comes back too
      tents.delete(i);
      const back = Object.assign({}, B[name].drops), add = (id, n) => { back[id] = (back[id] || 0) + n; };
      if (name === 'tent') {                   // the things you placed inside the tent
        if (inside.bed) add('bed', 1);
        if (inside.furnace) add('furnace', 1);
        if (inside.table) add('table', 1);
        if (inside.chest) add('storage', 1);
        Object.keys(inside.trophies || {}).forEach(id => { if (inside.trophies[id]) add(id, 1); });   // your trophies come back too
      }
      if (inside.chest) inside.chest.forEach(sl => { if (sl) add(sl.id, sl.n); });
      if (inside.furnace) {
        const f = furnace(inside.furnace);
        f.cooking.forEach(e => back[e[1]] = (back[e[1]] || 0) + 1);
        Object.entries(f.done).forEach(([id, n]) => { if (n) back[id] = (back[id] || 0) + n; });
      }
      return back;
    }
    // Food still cooking on a campfire you break comes back raw.
    const pieces = cooking.get(i);
    cooking.delete(i);
    if (pieces && pieces.length) {
      const back = Object.assign({}, B[name].drops);
      pieces.forEach(e => { const raw = cookRaw(e); back[raw] = (back[raw] || 0) + 1; });
      return back;
    }
    return B[name].drops;
  }

  // Put something on an empty grass tile.
  function place(tx, ty, name) {
    if (isBorder(tx, ty) || tileAt(tx, ty) !== GRASS) return false;
    tiles[ty * W.width + tx] = TILES[name];
    if (name === 'garlic0') crops.set(ty * W.width + tx, 0);   // planted garlic starts growing
    tents.delete(ty * W.width + tx);
    if (name === 'furnace') tentData(tx, ty).furnace = { fuel: 0, cooking: [], done: {} };
    if (name === 'storage') tentData(tx, ty).chest = newChest();
    return true;
  }

  // Is there a tile with this name within r pixels of the point?
  function hasNear(px, py, name, r) {
    const ts = W.tileSize, type = TILES[name];
    const x0 = Math.floor((px - r) / ts), x1 = Math.floor((px + r) / ts);
    const y0 = Math.floor((py - r) / ts), y1 = Math.floor((py + r) / ts);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        if (tileAt(tx, ty) !== type) continue;
        const nx = Math.max(tx * ts, Math.min(px, (tx + 1) * ts));
        const ny = Math.max(ty * ts, Math.min(py, (ty + 1) * ts));
        if (Math.hypot(nx - px, ny - py) <= r) return true;
      }
    return false;
  }

  // Distance (pixels) to the nearest tile with this name within r, or Infinity.
  function nearestDistance(px, py, name, r) {
    const ts = W.tileSize, type = TILES[name];
    let best = Infinity;
    for (let ty = Math.floor((py - r) / ts); ty <= Math.floor((py + r) / ts); ty++)
      for (let tx = Math.floor((px - r) / ts); tx <= Math.floor((px + r) / ts); tx++)
        if (tileAt(tx, ty) === type) best = Math.min(best, Math.hypot((tx + 0.5) * ts - px, (ty + 0.5) * ts - py));
    return best;
  }

  // No built things (walls, beds ...) close to this tile?
  function nothingBuiltNear(tx, ty, r) {
    for (let y = ty - r; y <= ty + r; y++)
      for (let x = tx - r; x <= tx + r; x++) {
        const b = blockAt(x, y);
        if (b && !b.natural) return false;
      }
    return true;
  }

  // A random grass tile far away from the player.
  function randomFarGrass(rand) {
    const pl = Mechanics.player;
    for (let tries = 0; tries < 60; tries++) {
      const tx = Math.floor(rand() * W.width), ty = Math.floor(rand() * W.height);
      if (tileAt(tx, ty) !== GRASS || isBorder(tx, ty)) continue;
      const x = (tx + 0.5) * W.tileSize, y = (ty + 0.5) * W.tileSize;
      if (Math.hypot(x - pl.x, y - pl.y) < W.farAway) continue;
      return { tx, ty, x, y };
    }
    return null;
  }

  // What is kept on a square: inside a tent (bed, furnace, table, chest), or in a furnace or chest outside.
  function tentData(tx, ty) {
    const i = ty * W.width + tx;
    if (!tents.has(i)) tents.set(i, { bed: false, furnace: null, table: false, chest: null });
    return tents.get(i);
  }
  function newChest() { return new Array(CONFIG.storage.slots).fill(null); }
  // The slots of the chest on this square (outside). Each slot: null or { id, n }, like the inventory.
  function storageAt(tx, ty) { const d = tentData(tx, ty); if (!d.chest) d.chest = newChest(); return d.chest; }
  // Is there nothing in the chest on this square (or in the chest inside the tent on this square)?
  function storageEmpty(tx, ty) { const d = tents.get(ty * W.width + tx); return !d || !d.chest || d.chest.every(sl => !sl); }
  function tentHasBed(tx, ty) { const d = tents.get(ty * W.width + tx); return !!(d && d.bed); }
  function setTentBed(tx, ty, on) { tentData(tx, ty).bed = on; }
  // Cooking entries: [seconds, raw item]. Old saves stored only seconds (that was always meat).
  function cookT(e) { return Array.isArray(e) ? e[0] : e; }
  function cookRaw(e) { return Array.isArray(e) ? e[1] : 'meat'; }
  // A furnace: { fuel, cooking: [[seconds, raw item], ...], done: { cooked item: count } }.
  function furnace(f) {
    if (!f) return f;
    f.cooking = (f.cooking || []).map(e => Array.isArray(e) ? e : [e, 'meat']);
    f.done = f.done || {};
    if (f.ready) { f.done.cookedMeat = (f.done.cookedMeat || 0) + f.ready; f.ready = 0; }   // old saves
    return f;
  }
  function furnaceReady(f) { return f ? Object.values(furnace(f).done).reduce((a, b) => a + b, 0) : 0; }
  // Stone furnaces (inside tents and outside) cook one piece at a time (also while you are away).
  function cookFurnaces(dt) {
    tents.forEach(d => {
      const f = furnace(d.furnace);
      if (!f || !f.cooking.length) return;
      f.cooking[0][0] += dt;
      if (f.cooking[0][0] >= CONFIG.furnace.cookTime) {
        const out = CONFIG.items[f.cooking.shift()[1]].cooksInto;
        f.done[out] = (f.done[out] || 0) + 1;
        Mechanics.cooked();
      }
    });
  }

  // The secret: a ring of mushrooms far away in the forest.
  function makeRing(rand) {
    const start = spawnPoint(), ts = W.tileSize;
    for (let tries = 0; tries < 3000; tries++) {
      const tx = 6 + Math.floor(rand() * (W.width - 12)), ty = 6 + Math.floor(rand() * (W.height - 12));
      if (Math.hypot((tx + 0.5) * ts - start.x, (ty + 0.5) * ts - start.y) < CONFIG.easter.minDistanceFromStart * ts) continue;
      if (!nothingBuiltNear(tx, ty, 3)) continue;
      for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) tiles[y * W.width + x] = GRASS;
      ring = { tx, ty };
      return;
    }
  }
  function ringCenter() { return ring && under === null ? { x: (ring.tx + 0.5) * W.tileSize, y: (ring.ty + 0.5) * W.tileSize } : null; }

  // There is always enough iron: at least minIron rocks, and a few near the start.
  // farFrom: a position new iron must stay away from (so nothing appears in front of you).
  function ensureIron(rand, farFrom) {
    const ts = W.tileSize, start = spawnPoint();
    const far = (x, y) => !farFrom || Math.hypot((x + 0.5) * ts - farFrom.x, (y + 0.5) * ts - farFrom.y) > W.farAway;
    const okGrass = (x, y) => tileAt(x, y) === GRASS && !isBorder(x, y) && nothingBuiltNear(x, y, 2) && far(x, y);
    let count = 0, nearStart = 0;
    for (let y = 0; y < W.height; y++) for (let x = 0; x < W.width; x++)
      if (tiles[y * W.width + x] === TILES.iron) {
        count++;
        if (Math.hypot((x + 0.5) * ts - start.x, (y + 0.5) * ts - start.y) < 12 * ts) nearStart++;
      }
    // A few iron rocks 6–12 squares from the start.
    for (let tries = 0; nearStart < W.ironNearStart && tries < 400; tries++) {
      const a = rand() * Math.PI * 2, d = 6 + rand() * 6;
      const x = Math.floor(start.x / ts + Math.cos(a) * d), y = Math.floor(start.y / ts + Math.sin(a) * d);
      if (okGrass(x, y)) { tiles[y * W.width + x] = TILES.iron; nearStart++; count++; }
    }
    // Turn some stone rocks into iron.
    for (let tries = 0; count < W.minIron && tries < 4000; tries++) {
      const x = Math.floor(rand() * W.width), y = Math.floor(rand() * W.height);
      if (tileAt(x, y) === TILES.stone && far(x, y)) { tiles[y * W.width + x] = TILES.iron; count++; }
    }
    // Still not enough? Small new iron rocks on empty grass.
    for (let tries = 0; count < W.minIron && tries < 4000; tries++) {
      const x = Math.floor(rand() * W.width), y = Math.floor(rand() * W.height);
      if (okGrass(x, y)) { tiles[y * W.width + x] = TILES.iron; count++; }
    }
  }

  // There is always some wild garlic, and a little near the start (5–10 squares away).
  function ensureGarlic(rand, farFrom) {
    const G = CONFIG.garlic, ts = W.tileSize, start = spawnPoint();
    const far = (x, y) => !farFrom || Math.hypot((x + 0.5) * ts - farFrom.x, (y + 0.5) * ts - farFrom.y) > W.farAway;
    const ok = (x, y) => tileAt(x, y) === GRASS && !isBorder(x, y) && far(x, y);
    let count = 0, near = 0;
    for (let y = 0; y < W.height; y++) for (let x = 0; x < W.width; x++)
      if (tiles[y * W.width + x] === TILES.garlicWild) {
        count++;
        if (Math.hypot((x + 0.5) * ts - start.x, (y + 0.5) * ts - start.y) < 10 * ts) near++;
      }
    for (let tries = 0; near < G.wildNearStart && tries < 400; tries++) {
      const a = rand() * Math.PI * 2, d = 5 + rand() * 5;
      const x = Math.floor(start.x / ts + Math.cos(a) * d), y = Math.floor(start.y / ts + Math.sin(a) * d);
      if (ok(x, y)) { tiles[y * W.width + x] = TILES.garlicWild; near++; count++; }
    }
    for (let tries = 0; count < G.minWild && tries < 4000; tries++) {
      const x = Math.floor(rand() * W.width), y = Math.floor(rand() * W.height);
      if (ok(x, y) && nothingBuiltNear(x, y, 2)) { tiles[y * W.width + x] = TILES.garlicWild; count++; }
    }
  }

  // Planted garlic grows: sprout → green leaves → ripe.
  function growCrops(dt) {
    crops.forEach((t, i) => {
      t += dt;
      const name = NAMES[tiles[i]];
      if (name !== 'garlic0' && name !== 'garlic1') { crops.delete(i); return; }
      if (t >= CONFIG.garlic.stageTime) {
        tiles[i] = name === 'garlic0' ? TILES.garlic1 : TILES.garlic2;
        if (tiles[i] === TILES.garlic2) { crops.delete(i); return; }
        t = 0;
      }
      crops.set(i, t);
    });
  }

  // ----- Gates -----
  // A gate is 2 squares wide: one door on each square (part 0 = left or top, part 1 = right or bottom).
  // dir 'h': the gate runs left-right (you walk through it up/down). dir 'v': it runs up-down.
  // side: which way the doors swing open (+1 or -1 along the walking direction), always away from you.
  function partnerOf(i) {
    const g = gates.get(i);
    if (!g || g.part === undefined) return -1;
    const step = g.dir === 'h' ? 1 : W.width;
    return g.part === 0 ? i + step : i - step;
  }
  // Place a 2-square gate: (tx, ty) is the left or top square. Returns false if there is no space.
  function placeGate(tx, ty, dir) {
    const x2 = dir === 'h' ? tx + 1 : tx, y2 = dir === 'h' ? ty : ty + 1;
    if (isBorder(tx, ty) || isBorder(x2, y2) || tileAt(tx, ty) !== GRASS || tileAt(x2, y2) !== GRASS) return false;
    tiles[ty * W.width + tx] = TILES.gate; tiles[y2 * W.width + x2] = TILES.gate;
    const base = { dir, open: false, locked: false, side: 1, swing: 0 };
    gates.set(ty * W.width + tx, Object.assign({ part: 0 }, base));
    gates.set(y2 * W.width + x2, Object.assign({ part: 1 }, base));
    return true;
  }
  function gateAt(tx, ty) { return nameAt(tx, ty) === 'gate' ? gates.get(ty * W.width + tx) || null : null; }
  // Both squares of the gate: [{ tx, ty }, ...]
  function gateSquares(tx, ty) {
    const i = ty * W.width + tx, j = partnerOf(i), out = [{ tx, ty }];
    if (j >= 0 && gates.has(j)) out.push({ tx: j % W.width, ty: Math.floor(j / W.width) });
    return out;
  }
  // Change both doors together (open, locked, side).
  function setGate(tx, ty, changes) {
    gateSquares(tx, ty).forEach(t => Object.assign(gates.get(t.ty * W.width + t.tx), changes));
  }
  function updateGates(dt) {
    gates.forEach(g => {
      const target = g.open ? 1 : 0, step = dt / CONFIG.gate.swingTime;
      g.swing = g.swing < target ? Math.min(target, g.swing + step) : Math.max(target, g.swing - step);
    });
  }

  // Is this point in the light of a campfire or a torch? (Vampires stay out of the light.)
  function inLight(px, py) {
    const V = CONFIG.vampire;
    if (nearestDistance(px, py, 'campfire', V.campfireLight) < V.campfireLight ||
        nearestDistance(px, py, 'torch', V.torchLight) < V.torchLight) return true;
    if (under === null) return false;                // underground: the way out and the mine lanterns are safe too
    const ts = W.tileSize;
    return nearestDistance(px, py, 'caveExit', 170) < 170 ||
           cave.lanterns.some(d => Math.hypot((d.x + 0.5) * ts - px, (d.y + 0.5) * ts - py) < 110);
  }

  // Put one piece of raw food (meat or fish) on a campfire. Returns false if it is full.
  function addCooking(tx, ty, raw) {
    const i = ty * W.width + tx, list = cooking.get(i) || [];
    if (list.length >= CONFIG.food.campfireSlots) return false;
    list.push([0, raw || 'meat']);
    cooking.set(i, list);
    return true;
  }

  function update(dt) {
    cookFurnaces(dt);
    growCrops(dt);
    updateGates(dt);
    // Food on campfires cooks slowly, then drops next to the fire, cooked.
    cooking.forEach((list, i) => {
      for (let k = list.length - 1; k >= 0; k--) {
        if (!Array.isArray(list[k])) list[k] = [list[k], 'meat'];
        list[k][0] += dt;
        if (list[k][0] >= CONFIG.food.cookTime) {
          const raw = list.splice(k, 1)[0][1];
          const tx = i % W.width, ty = Math.floor(i / W.width);
          Drops.spawn(CONFIG.items[raw].cooksInto, 1, (tx + 0.5) * W.tileSize, (ty + 0.5) * W.tileSize);
          Mechanics.cooked();
        }
      }
      if (!list.length) cooking.delete(i);
    });
    fading.forEach(f => f.time -= dt);
    fading = fading.filter(f => f.time > 0);
    // Trees grow back slowly, far away from you. Iron too, if there is not much left.
    if (under === null) regrowTimer += dt;           // (nothing grows back underground)
    if (regrowTimer >= W.regrowEvery) {
      regrowTimer = 0;
      ensureIron(Math.random, Mechanics.player);
      ensureGarlic(Math.random, Mechanics.player);
      if (countTrees() < wantedTrees) {
        const spot = randomFarGrass(Math.random);
        if (spot && nothingBuiltNear(spot.tx, spot.ty, 3) && !Animals.blocksAt(spot.x, spot.y, W.tileSize / 2, null))
          tiles[spot.ty * W.width + spot.tx] = TREE;
      }
    }
  }

  // Lights for the night: [{ x, y, r }] in screen pixels.
  function lights(camX, camY, viewW, viewH) {
    const ts = W.tileSize, out = [], m = 5;
    const x0 = Math.max(0, Math.floor(camX / ts) - m), y0 = Math.max(0, Math.floor(camY / ts) - m);
    const x1 = Math.min(W.width - 1, Math.floor((camX + viewW) / ts) + m);
    const y1 = Math.min(W.height - 1, Math.floor((camY + viewH) / ts) + m);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        const b = blockAt(tx, ty);
        if (b && b.light) out.push({ x: (tx + 0.5) * ts - camX, y: (ty + 0.5) * ts - camY, r: b.light });
      }
    if (ring && under === null) out.push({ x: (ring.tx + 0.5) * ts - camX, y: (ring.ty + 0.5) * ts - camY, r: 75 });
    if (cave) cave.deco.forEach(d => {
      if (!d.light) return;
      const x = (d.x + 0.5) * ts - camX, y = (d.y + 0.5) * ts - camY;
      if (x > -200 && y > -200 && x < viewW + 200 && y < viewH + 200) out.push({ x, y, r: d.light });
    });
    return out;
  }

  // ----- Saving -----
  function encode(t) { let s = ''; for (let i = 0; i < t.length; i++) s += String.fromCharCode(t[i]); return btoa(s); }
  function save() {
    if (under !== null) caveMaps[under] = layer();
    const F = under === null ? layer() : forest;      // the forest (also while you are in a cave)
    // names: what each tile number means, so new kinds of blocks never mix up old saves.
    return { seed, tiles: encode(F.tiles), names: NAMES, wantedTrees, cooking: Array.from(F.cooking.entries()),
             tents: Array.from(F.tents.entries()), ring, crops: Array.from(F.crops.entries()),
             gates: Array.from(F.gates.entries()), water: 2, caves: Array.from(caves.entries()),
             shelves: Array.from(F.shelves.entries()), caveVersion: CAVE_VERSION,
             under: Object.keys(caveMaps).map(id => { const L = caveMaps[id]; return {
               id: +id, tiles: encode(L.tiles), cooking: Array.from(L.cooking.entries()), tents: Array.from(L.tents.entries()),
               gates: Array.from(L.gates.entries()), shelves: Array.from(L.shelves.entries()),
               chests: Array.from(L.cave.chests.entries()), revealed: L.cave.secrets.filter(r => r.revealed).map(r => r.key) }; }) };
  }
  // Tile numbers used by older saves that did not store names.
  const OLD_NAMES = ['grass', 'tree', 'stone', 'coal', 'table', 'tent', 'bed', 'campfire', 'torch', 'woodWall', 'stoneWall'];
  const IRON_NAMES = ['grass', 'tree', 'stone', 'coal', 'iron', 'table', 'tent', 'bed', 'campfire', 'torch', 'woodWall', 'stoneWall'];
  function load(d, hasIron, playerPos) {
    seed = d.seed;
    const s = atob(d.tiles);
    tiles = new Uint8Array(W.width * W.height);
    if (s.length !== tiles.length) throw new Error('world size changed');
    const names = d.names || (hasIron ? IRON_NAMES : OLD_NAMES);
    for (let i = 0; i < s.length; i++) {
      const t = TILES[names[s.charCodeAt(i)]];
      tiles[i] = t === undefined ? GRASS : t;
    }
    wantedTrees = d.wantedTrees || countTrees();
    damage = new Map(); fading = [];
    cooking = new Map(d.cooking || []);
    tents = new Map(d.tents || []);
    (d.tentBeds || []).forEach(i => { if (!tents.has(i)) tents.set(i, { bed: true, furnace: null }); });  // older saves
    ring = d.ring || null;
    if (!ring) makeRing(makeRandom(seed + 9));
    crops = new Map(d.crops || []);
    gates = new Map(d.gates || []);
    shelves = new Map(d.shelves || []);
    under = null; forest = null; cave = null; outside = null; caveMaps = {};
    (d.caveVersion === CAVE_VERSION ? d.under || [] : []).forEach(c => {                   // caves you have been in: the same map, with your changes
      try {
        const L = makeCaveMap(c.id), s2 = atob(c.tiles);
        if (s2.length !== L.tiles.length) return;
        for (let i = 0; i < s2.length; i++) { const v = TILES[names[s2.charCodeAt(i)]]; L.tiles[i] = v === undefined ? GRASS : v; }
        L.cooking = new Map(c.cooking || []); L.tents = new Map(c.tents || []); L.gates = new Map(c.gates || []);
        L.shelves = new Map(c.shelves || []); L.cave.chests = new Map(c.chests || []);
        L.cave.secrets.forEach(r => { if ((c.revealed || []).includes(r.key)) r.revealed = r.announced = true; });
        caveMaps[c.id] = L;
      } catch (e) { /* that cave is simply made fresh again */ }
    });
    // Older saves have no wild garlic or water: add some.
    ensureGarlic(makeRandom(seed + 17));
    if (d.water !== 2) ensureWater(makeRandom(seed + 21), playerPos);   // only once
    if (d.caves) caves = new Map(d.caves);
    else makeCaves(makeRandom(seed + 31), true, playerPos);             // older worlds get their caves once
    // Older saves may have little or no iron: make sure there is enough.
    ensureIron(makeRandom(seed + 5));
  }

  // Small bar that shows how many hits are left.
  function drawHitBar(ctx, cx, top, fractionLeft) {
    const w = 26, h = 5;
    ctx.fillStyle = C.hitBarBack;
    ctx.fillRect(Math.round(cx - w / 2), Math.round(top), w, h);
    ctx.fillStyle = C.hitBar;
    ctx.fillRect(Math.round(cx - w / 2) + 1, Math.round(top) + 1, Math.round((w - 2) * fractionLeft), h - 2);
  }

  // ----- Drawing each kind of tile -----
  function drawGrass(ctx, sx, sy, tx, ty) {
    const ts = W.tileSize;
    if (under !== null) {                  // underground: a dusty cave floor with a few pebbles
      ctx.fillStyle = C.caveFloors[Math.floor(hash(tx, ty, 1) * C.caveFloors.length)];
      ctx.fillRect(sx, sy, ts, ts);
      if (hash(tx, ty, 2) < 0.25) { ctx.fillStyle = C.caveFloorDark; ctx.fillRect(sx + 6 + Math.floor(hash(tx, ty, 3) * 24), sy + 6 + Math.floor(hash(tx, ty, 4) * 26), 6, 4); }
      return;
    }
    ctx.fillStyle = C.grass[Math.floor(hash(tx, ty, 1) * C.grass.length)];
    ctx.fillRect(sx, sy, ts, ts);          // plain grass: no small marks (they looked like cobwebs)
  }

  function drawBlocky(ctx, sx, sy, tx, ty, colors, pad, spots, spotChance = 0.3) {
    const ts = W.tileSize, cells = 4, cs = (ts - pad * 2) / cells;
    ctx.fillStyle = C.treeShadow;
    ctx.fillRect(sx + pad + 4, sy + pad + 4, ts - pad * 2, ts - pad * 2);
    for (let cy = 0; cy < cells; cy++)
      for (let cx = 0; cx < cells; cx++) {
        const h = hash(tx * 4 + cx, ty * 4 + cy, 5);
        ctx.fillStyle = spots && hash(tx * 4 + cx, ty * 4 + cy, 9) < spotChance ? spots : colors[Math.floor(h * colors.length)];
        ctx.fillRect(sx + pad + cx * cs, sy + pad + cy * cs, Math.ceil(cs), Math.ceil(cs));
      }
  }
  function drawTree(ctx, sx, sy, tx, ty)  { drawBlocky(ctx, sx, sy, tx, ty, C.leaves, 2); }
  function drawStone(ctx, sx, sy, tx, ty) { drawBlocky(ctx, sx, sy, tx, ty, C.rock, 4); }
  function drawCoal(ctx, sx, sy, tx, ty)  { drawBlocky(ctx, sx, sy, tx, ty, C.rock, 4, C.coalSpot); }
  function drawIron(ctx, sx, sy, tx, ty)  { drawBlocky(ctx, sx, sy, tx, ty, C.rock, 4, C.ironSpot, 0.45); }  // big orange spots
  function drawGold(ctx, sx, sy, tx, ty)  { drawBlocky(ctx, sx, sy, tx, ty, C.rock, 4, C.gold, 0.4); }       // shiny yellow spots

  function drawTable(ctx, sx, sy) {
    const ts = W.tileSize, pad = 5;
    ctx.fillStyle = C.treeShadow;
    ctx.fillRect(sx + pad + 3, sy + pad + 3, ts - pad * 2, ts - pad * 2);
    ctx.fillStyle = C.tableEdge;
    ctx.fillRect(sx + pad, sy + pad, ts - pad * 2, ts - pad * 2);
    ctx.fillStyle = C.tableTop;
    ctx.fillRect(sx + pad + 3, sy + pad + 3, ts - pad * 2 - 6, ts - pad * 2 - 6);
    ctx.fillStyle = C.tableLine;                      // 3 x 3 grid on top
    const inner = ts - pad * 2 - 6, step = inner / 3;
    for (let i = 1; i < 3; i++) {
      ctx.fillRect(Math.round(sx + pad + 3 + i * step) - 1, sy + pad + 3, 2, inner);
      ctx.fillRect(sx + pad + 3, Math.round(sy + pad + 3 + i * step) - 1, inner, 2);
    }
  }

  function drawTent(ctx, sx, sy) {
    const ts = W.tileSize, pad = 3, s = ts - pad * 2;
    ctx.fillStyle = C.treeShadow;
    ctx.fillRect(sx + pad + 3, sy + pad + 3, s, s);
    ctx.fillStyle = C.tentCloth;  ctx.fillRect(sx + pad, sy + pad, s / 2, s);          // left roof
    ctx.fillStyle = C.tentShade;  ctx.fillRect(sx + pad + s / 2, sy + pad, s / 2, s);  // right roof
    ctx.fillStyle = C.tentPole;   ctx.fillRect(sx + ts / 2 - 1, sy + pad, 2, s);       // ridge
    ctx.fillStyle = C.tentDoor;   ctx.fillRect(sx + ts / 2 - 5, sy + pad + s - 6, 10, 6);
  }

  function drawBed(ctx, sx, sy) {
    const ts = W.tileSize, w = 24, h = 34, x = sx + (ts - w) / 2, y = sy + (ts - h) / 2;
    ctx.fillStyle = C.treeShadow; ctx.fillRect(x + 3, y + 3, w, h);
    ctx.fillStyle = C.bedFrame;   ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.bedPillow;  ctx.fillRect(x + 3, y + 3, w - 6, 8);
    ctx.fillStyle = C.bedBlanket; ctx.fillRect(x + 3, y + 13, w - 6, h - 16);
  }

  function drawCampfire(ctx, sx, sy) {
    const ts = W.tileSize, cx = sx + ts / 2, cy = sy + ts / 2;
    ctx.fillStyle = C.fireGlow;                           // soft, steady glow (no flicker)
    ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.stone;                              // ring of stones
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * 13) - 3, Math.round(cy + Math.sin(a) * 13) - 3, 6, 6);
    }
    ctx.save(); ctx.translate(cx, cy);                    // crossed logs
    ctx.fillStyle = C.tableEdge;
    ctx.rotate(Math.PI / 4);  ctx.fillRect(-10, -2, 20, 4);
    ctx.rotate(-Math.PI / 2); ctx.fillRect(-10, -2, 20, 4);
    ctx.restore();
    ctx.fillStyle = C.fireOuter; ctx.fillRect(cx - 5, cy - 5, 10, 10);
    ctx.fillStyle = C.fireInner; ctx.fillRect(cx - 2, cy - 3, 5, 5);
  }

  function drawTorch(ctx, sx, sy) {
    const ts = W.tileSize, cx = sx + ts / 2, cy = sy + ts / 2;
    ctx.fillStyle = C.fireGlow;
    ctx.beginPath(); ctx.arc(cx, cy - 4, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.shadow;    ctx.fillRect(cx - 1, cy + 8, 6, 3);
    ctx.fillStyle = C.axeHandle; ctx.fillRect(cx - 2, cy - 4, 4, 14);
    ctx.fillStyle = C.fireOuter; ctx.fillRect(cx - 4, cy - 11, 8, 8);
    ctx.fillStyle = C.fireInner; ctx.fillRect(cx - 2, cy - 9, 4, 4);
  }

  function drawWall(ctx, sx, sy, tx, ty, fill, line) {
    const ts = W.tileSize;
    ctx.fillStyle = fill; ctx.fillRect(sx, sy, ts, ts);
    ctx.fillStyle = line;
    ctx.fillRect(sx, sy, ts, 2); ctx.fillRect(sx, sy + ts - 2, ts, 2);
    ctx.fillRect(sx, sy, 2, ts); ctx.fillRect(sx + ts - 2, sy, 2, ts);
    for (let r = 1; r < 4; r++) ctx.fillRect(sx, sy + r * 10, ts, 2);          // rows
    for (let r = 0; r < 4; r++) {                                              // joins
      const off = r % 2 ? 10 : 22;
      ctx.fillRect(sx + off, sy + r * 10, 2, 10);
    }
  }
  // Garlic, seen from above: green leaves, white flowers (wild) or a white bulb (ripe).
  function leaves(ctx, cx, cy, n, len) {
    ctx.fillStyle = C.garlicLeaf;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + 0.4;
      for (let d = 2; d < len; d += 2) ctx.fillRect(Math.round(cx + Math.cos(a) * d) - 1, Math.round(cy + Math.sin(a) * d) - 1, 3, 3);
    }
  }
  function drawGarlicWild(ctx, sx, sy, tx, ty) {
    const ts = W.tileSize;
    for (let k = 0; k < 3; k++) {
      const cx = sx + 8 + hash(tx, ty, 20 + k) * (ts - 16), cy = sy + 8 + hash(tx, ty, 30 + k) * (ts - 16);
      leaves(ctx, cx, cy, 5, 9);
      ctx.fillStyle = C.garlicFlower;
      ctx.fillRect(Math.round(cx) - 3, Math.round(cy) - 3, 6, 6);
      ctx.fillStyle = C.garlicStripe; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 2, 2);
    }
  }
  function soil(ctx, sx, sy) { ctx.fillStyle = C.soil; ctx.fillRect(sx + 6, sy + 6, W.tileSize - 12, W.tileSize - 12); }
  function drawGarlic0(ctx, sx, sy) { soil(ctx, sx, sy); leaves(ctx, sx + 20, sy + 20, 3, 6); }
  function drawGarlic1(ctx, sx, sy) { soil(ctx, sx, sy); leaves(ctx, sx + 20, sy + 20, 5, 12); }
  function drawGarlic2(ctx, sx, sy) {
    soil(ctx, sx, sy); leaves(ctx, sx + 20, sy + 20, 6, 15);
    ctx.fillStyle = C.garlicBulb; ctx.fillRect(sx + 14, sy + 14, 12, 12);
    ctx.fillStyle = C.garlicStripe; ctx.fillRect(sx + 17, sy + 15, 2, 10); ctx.fillRect(sx + 22, sy + 15, 2, 10);
  }
  // A farm gate seen from above: a post at each end and two doors that swing open away from you.
  function drawGate(ctx, sx, sy, tx, ty) {
    const ts = W.tileSize, g = gates.get(ty * W.width + tx) || { dir: 'h', swing: 0, side: 1, locked: false };
    ctx.save();
    ctx.translate(sx + ts / 2, sy + ts / 2);
    let side = g.side;
    if (g.dir === 'v') { ctx.rotate(Math.PI / 2); side = -side; }   // draw the same gate, turned
    const a = g.swing * Math.PI / 2 * side, half = ts / 2;
    const left = g.part !== 1;                                         // this square's door is hinged on the left (or top)
    const hinge = left ? -half + 3 : half - 3, door = ts - 4;          // one long door per square
    ctx.fillStyle = C.treeShadow; ctx.fillRect(-half + 2, -1, ts, 6);
    ctx.save(); ctx.translate(hinge, 0); ctx.rotate(left ? a : -a);
    const x0 = left ? 0 : -door;
    ctx.fillStyle = C.gateWood;  ctx.fillRect(x0, -4, door, 3); ctx.fillRect(x0, 2, door, 3);   // two rails
    ctx.fillStyle = C.gateBrace;
    for (const k of [0.05, 0.5, 0.92]) ctx.fillRect(x0 + Math.round(door * k), -5, 3, 11);    // upright slats
    ctx.restore();
    ctx.fillStyle = C.gatePost;                                        // the post the door hangs on
    ctx.fillRect(left ? -half : half - 6, -6, 6, 12);
    if (g.locked && g.swing === 0 && !left) {                          // a small padlock where the two doors meet
      ctx.fillStyle = C.lockDark; ctx.fillRect(-half - 3, -8, 6, 3);
      ctx.fillStyle = C.lock;     ctx.fillRect(-half - 4, -5, 8, 8);
      ctx.fillStyle = C.lockDark; ctx.fillRect(-half - 1, -3, 2, 3);
    }
    ctx.restore();
  }
  // A cave opening: rock with a dark arch. The old mine has a wooden frame and a little sign.
  function drawCave(ctx, sx, sy, tx, ty) {
    const ts = W.tileSize, d = caves.get(ty * W.width + tx);
    drawBlocky(ctx, sx, sy, tx, ty, C.rock, 0);
    ctx.fillStyle = '#16130f';
    ctx.fillRect(sx + 9, sy + 14, ts - 18, ts - 14); ctx.fillRect(sx + 12, sy + 10, ts - 24, 6);
    if (d && d.id === 0) {
      ctx.fillStyle = C.mineWood;
      ctx.fillRect(sx + 6, sy + 10, 4, ts - 10); ctx.fillRect(sx + ts - 10, sy + 10, 4, ts - 10); ctx.fillRect(sx + 4, sy + 7, ts - 8, 4);
      ctx.fillStyle = '#c9b48a'; ctx.fillRect(sx + 12, sy + 1, 16, 6);                // the old sign
      ctx.fillStyle = '#5a4030'; ctx.fillRect(sx + 14, sy + 3, 12, 1);
    }
  }
  // Water: calm blue with soft, still ripples (nothing moves or flickers). Lily pads on some squares.
  function drawWater(ctx, sx, sy, tx, ty) {
    const ts = W.tileSize;
    ctx.fillStyle = C.water[Math.floor(hash(tx, ty, 41) * C.water.length)];
    ctx.fillRect(sx, sy, ts, ts);
    ctx.fillStyle = C.waterEdge;                                  // a darker edge next to the grass
    if (!isWater(tx, ty - 1) && !isBorder(tx, ty - 1)) ctx.fillRect(sx, sy, ts, 3);
    if (!isWater(tx, ty + 1) && !isBorder(tx, ty + 1)) ctx.fillRect(sx, sy + ts - 3, ts, 3);
    if (!isWater(tx - 1, ty) && !isBorder(tx - 1, ty)) ctx.fillRect(sx, sy, 3, ts);
    if (!isWater(tx + 1, ty) && !isBorder(tx + 1, ty)) ctx.fillRect(sx + ts - 3, sy, 3, ts);
    ctx.fillStyle = C.waterLight;                                 // two little ripples
    for (let k = 0; k < 2; k++) {
      const rx = sx + 6 + Math.floor(hash(tx, ty, 43 + k) * (ts - 20)), ry = sy + 8 + Math.floor(hash(tx, ty, 47 + k) * (ts - 16));
      ctx.fillRect(rx, ry, 8, 2); ctx.fillRect(rx + 3, ry + 4, 6, 2);
    }
    if (hash(tx, ty, 53) < 0.12) {                                // a lily pad
      const lx = sx + 10 + Math.floor(hash(tx, ty, 59) * 16), ly = sy + 10 + Math.floor(hash(tx, ty, 61) * 16);
      ctx.fillStyle = C.lily; ctx.beginPath(); ctx.arc(lx, ly, 6, 0.4, Math.PI * 2); ctx.lineTo(lx, ly); ctx.fill();
      if (hash(tx, ty, 67) < 0.4) { ctx.fillStyle = C.lilyFlower; ctx.fillRect(lx - 2, ly - 2, 4, 4); }
    }
  }
  // ----- Underground tiles -----
  function drawCaveRock(ctx, sx, sy, tx, ty) { drawBlocky(ctx, sx, sy, tx, ty, C.caveRock, 0); }
  function drawCracked(ctx, sx, sy, tx, ty) { drawStone(ctx, sx, sy, tx, ty); }   // the hidden rock looks just like stone
  function drawCaveExit(ctx, sx, sy, tx, ty) {         // daylight: the way back out to the forest
    const ts = W.tileSize;
    ctx.fillStyle = C.grass[0]; ctx.fillRect(sx, sy, ts, ts);
    ctx.fillStyle = 'rgba(255, 244, 200, 0.35)'; ctx.fillRect(sx + 4, sy, ts - 8, ts);
    ctx.fillStyle = C.grassTuft; ctx.fillRect(sx + 8, sy + 26, 4, 6); ctx.fillRect(sx + 26, sy + 22, 4, 8);
    if (nameAt(tx - 1, ty) !== 'caveExit') { ctx.fillStyle = C.caveRock[0]; ctx.fillRect(sx, sy, 5, ts); }
    if (nameAt(tx + 1, ty) !== 'caveExit') { ctx.fillStyle = C.caveRock[0]; ctx.fillRect(sx + ts - 5, sy, 5, ts); }
  }
  function drawChest(ctx, sx, sy, tx, ty) {             // the treasure chest from Knight's Quest
    const c = cave && cave.chests.get(ty * W.width + tx), open = c && c.opened;
    const x = sx + 4, y = sy + 9, w = 32, h = 24;
    ctx.fillStyle = C.treeShadow; ctx.fillRect(x + 3, y + 3, w, h);
    if (open) { ctx.fillStyle = C.chestOpen; ctx.fillRect(x, y - 7, w, 7); }          // the lid, open
    ctx.fillStyle = open ? C.chestOpen : C.chestClosed; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.chestTrim; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);
    if (open) { ctx.fillStyle = '#3b1f0b'; ctx.fillRect(x + 6, y + 6, w - 12, h - 12); }
    else { ctx.fillStyle = C.chestLatch; ctx.fillRect(x + w / 2 - 3, y + h / 2 - 2, 6, 4); }
  }
  function drawGlowShroom(ctx, sx, sy, tx, ty) {        // little glowing mushrooms
    ctx.fillStyle = 'rgba(127, 214, 224, 0.12)'; ctx.beginPath(); ctx.arc(sx + 20, sy + 20, 18, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 3; k++) {
      const mx = sx + 9 + Math.floor(hash(tx, ty, 70 + k) * 22), my = sy + 10 + Math.floor(hash(tx, ty, 80 + k) * 20);
      ctx.fillStyle = C.glowStem; ctx.fillRect(mx - 1, my, 3, 5);
      ctx.fillStyle = C.glowCap;  ctx.fillRect(mx - 4, my - 4, 9, 5);
    }
  }
  function drawShelf(ctx, sx, sy, tx, ty) {             // a wooden shelf with your Knight's Quest coins in little stacks
    const ts = W.tileSize, n = shelves.get(ty * W.width + tx) || 0;
    ctx.fillStyle = C.treeShadow; ctx.fillRect(sx + 6, sy + 7, ts - 6, ts - 8);
    ctx.fillStyle = C.tableEdge;  ctx.fillRect(sx + 2, sy + 3, ts - 4, ts - 6);
    ctx.fillStyle = C.tableTop;   ctx.fillRect(sx + 4, sy + 5, ts - 8, 13); ctx.fillRect(sx + 4, sy + 21, ts - 8, 13);
    for (let k = 0; k < 6; k++) {                        // 6 stacks (3 on each board), up to 5 coins each, then the stacks get taller
      const inStack = Math.min(Math.ceil(Math.max(0, n - k) / 6), 8);
      if (!inStack) continue;
      const cx = sx + 10 + (k % 3) * 10, base = sy + (k < 3 ? 16 : 32);
      for (let c = 0; c < inStack; c++) {
        ctx.fillStyle = C.coinEdge; ctx.fillRect(cx - 4, base - c * 2 - 1, 9, 3);
        ctx.fillStyle = C.coin;     ctx.fillRect(cx - 3, base - c * 2 - 1, 7, 2);
      }
    }
  }
  function drawFurnace(ctx, sx, sy, tx, ty) {           // a stone furnace: warm and orange inside while it cooks
    const ts = W.tileSize, d = tents.get(ty * W.width + tx), burning = d && d.furnace && d.furnace.cooking && d.furnace.cooking.length;
    if (burning) { ctx.fillStyle = 'rgba(242, 150, 70, 0.16)'; ctx.beginPath(); ctx.arc(sx + ts / 2, sy + ts / 2, 26, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = C.treeShadow; ctx.fillRect(sx + 7, sy + 7, ts - 8, ts - 8);
    ctx.fillStyle = C.stone;      ctx.fillRect(sx + 4, sy + 4, ts - 8, ts - 8);
    ctx.fillStyle = '#6f6f6b';
    for (let r = 1; r < 4; r++) ctx.fillRect(sx + 4, sy + 4 + r * 8, ts - 8, 2);
    for (let r = 0; r < 4; r++) ctx.fillRect(sx + (r % 2 ? 14 : 24), sy + 4 + r * 8, 2, 8);
    ctx.fillStyle = '#2b2b2b';    ctx.fillRect(sx + 13, sy + 21, 14, 11);              // the opening
    if (burning) { ctx.fillStyle = C.fireOuter; ctx.fillRect(sx + 15, sy + 25, 10, 7); ctx.fillStyle = C.fireInner; ctx.fillRect(sx + 18, sy + 27, 4, 4); }
  }
  function drawStorage(ctx, sx, sy) {                     // a wooden chest for your things
    const x = sx + 5, y = sy + 8, w = 30, h = 24;
    ctx.fillStyle = C.treeShadow; ctx.fillRect(x + 3, y + 3, w, h);
    ctx.fillStyle = C.tableEdge;  ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.tableTop;   ctx.fillRect(x + 2, y + 2, w - 4, 8); ctx.fillRect(x + 2, y + 12, w - 4, h - 14);
    ctx.fillStyle = C.tableLine;  ctx.fillRect(x + 2, y + 10, w - 4, 2);
    ctx.fillStyle = '#9a9a95';    ctx.fillRect(x + w / 2 - 3, y + 8, 6, 6);           // the latch
    ctx.fillStyle = '#5c5c58';    ctx.fillRect(x + w / 2 - 1, y + 10, 2, 3);
  }
  function drawWoodWall(ctx, sx, sy, tx, ty)  { drawWall(ctx, sx, sy, tx, ty, C.woodWall, C.woodWallLine); }
  function drawStoneWall(ctx, sx, sy, tx, ty) { drawWall(ctx, sx, sy, tx, ty, C.stoneWall, C.stoneWallLine); }

  const drawTile = {
    tree: drawTree, stone: drawStone, coal: drawCoal, iron: drawIron, table: drawTable, tent: drawTent,
    bed: drawBed, campfire: drawCampfire, torch: drawTorch, woodWall: drawWoodWall, stoneWall: drawStoneWall,
    garlicWild: drawGarlicWild, garlic0: drawGarlic0, garlic1: drawGarlic1, garlic2: drawGarlic2, gate: drawGate, water: drawWater, cave: drawCave,
    caveRock: drawCaveRock, crackedRock: drawCracked, caveExit: drawCaveExit, chest: drawChest, glowShroom: drawGlowShroom, shelf: drawShelf, gold: drawGold,
    furnace: drawFurnace, storage: drawStorage
  };

  // Draw only the tiles that are on screen.
  function draw(ctx, camX, camY, viewW, viewH) {
    const ts = W.tileSize;
    const x0 = Math.max(0, Math.floor(camX / ts)), y0 = Math.max(0, Math.floor(camY / ts));
    const x1 = Math.min(W.width - 1, Math.floor((camX + viewW) / ts));
    const y1 = Math.min(W.height - 1, Math.floor((camY + viewH) / ts));
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        drawGrass(ctx, tx * ts - camX, ty * ts - camY, tx, ty);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) {
        const t = tiles[ty * W.width + tx];
        if (cave && hiddenAt(tx, ty)) drawStone(ctx, tx * ts - camX, ty * ts - camY, tx, ty);   // not found yet: looks like stone
        else if (t !== GRASS) drawTile[NAMES[t]](ctx, tx * ts - camX, ty * ts - camY, tx, ty);
      }
    // The ring of mushrooms (they glow softly at night).
    if (ring && under === null) {
      const cx = (ring.tx + 0.5) * ts - camX, cy = (ring.ty + 0.5) * ts - camY;
      if (cx > -100 && cy > -100 && cx < viewW + 100 && cy < viewH + 100) {
        const glow = Time.nightAmount();
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2, mx = Math.round(cx + Math.cos(a) * 46), my = Math.round(cy + Math.sin(a) * 46);
          if (glow > 0.2) { ctx.fillStyle = `rgba(255, 160, 150, ${0.2 * glow})`; ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI * 2); ctx.fill(); }
          ctx.fillStyle = C.mushroomStem; ctx.fillRect(mx - 2, my, 4, 6);
          ctx.fillStyle = C.mushroomCap;  ctx.fillRect(mx - 6, my - 5, 12, 6);
          ctx.fillStyle = C.mushroomDot;  ctx.fillRect(mx - 3, my - 4, 2, 2); ctx.fillRect(mx + 2, my - 3, 2, 2);
        }
      }
    }
    // Broken things fade away slowly.
    fading.forEach(f => {
      ctx.globalAlpha = f.time / CONFIG.actions.fadeTime;
      drawTile[f.name](ctx, f.tx * ts - camX, f.ty * ts - camY, f.tx, f.ty);
      ctx.globalAlpha = 1;
    });
    // Meat on campfires: slowly changes from raw red to cooked brown (no flicker).
    const raw = [0xc9, 0x67, 0x5b], done = [0x8a, 0x4a, 0x2a];
    cooking.forEach((list, i) => {
      const tx = i % W.width, ty = Math.floor(i / W.width);
      const cx = tx * ts - camX + ts / 2, cy = ty * ts - camY + ts / 2;
      list.forEach((e, k) => {
        const f = Math.min(1, cookT(e) / CONFIG.food.cookTime);
        const c = raw.map((v, j) => Math.round(v + (done[j] - v) * f));
        ctx.fillStyle = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
        ctx.fillRect(cx + (k % 2 ? 2 : -10), cy + (k < 2 ? -10 : 3), 8, 7);
      });
    });
    // Hit bars on damaged things.
    damage.forEach((dmg, i) => {
      const tx = i % W.width, ty = Math.floor(i / W.width);
      const b = B[NAMES[tiles[i]]];
      if (b) drawHitBar(ctx, tx * ts - camX + ts / 2, ty * ts - camY - 8, 1 - dmg / b.hits);
    });
  }

  return { generate, spawnPoint, isSolidAt, isBorder, tileAt, nameAt, blockAt, tileOf, breakableAt,
           hitBlock, place, hasNear, nearestDistance, addCooking, tentHasBed, setTentBed, tentData, cookFurnaces, storageAt, storageEmpty,
           ringCenter, growCrops, inLight, isWater, caveAt, furnace, furnaceReady, placeGate, gateAt, gateSquares, setGate, update, draw, lights, drawHitBar, makeRandom, randomFarGrass,
           save, load, TILES, GRASS, getSeed: () => seed,
           enterCave, leaveCave, chestAt, shelfCoins, addShelfCoins, caveTitle: id => CONFIG.caves.kinds[id % CONFIG.caves.kinds.length].title,
           isUnder: () => under !== null, underground: () => under, caveInfo: () => cave, outsidePos: () => outside };
})();
