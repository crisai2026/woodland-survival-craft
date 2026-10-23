const Drops = (() => {
  const D = CONFIG.drops;
  let list = [];

  function spawn(item, amount, x, y) {
    for (let i = 0; i < amount; i++)
      list.push({ item, age: 0,
        x: x + (Math.random() - 0.5) * D.spread * 2,
        y: y + (Math.random() - 0.5) * D.spread * 2 });
  }

  function update(dt) {
    const pl = Mechanics.player;
    list.forEach(d => {
      d.age += dt;
      if (d.age < D.pickupDelay || !Inventory.canAdd(d.item)) return;   // full: it stays on the ground
      const dist = Math.hypot(pl.x - d.x, pl.y - d.y);
      if (dist <= D.pickupRadius) { Inventory.add(d.item, 1); d.taken = true; return; }
      if (dist <= D.magnetRadius) {                 // slide gently toward the player
        const step = Math.min(dist, D.magnetSpeed * dt);
        d.x += (pl.x - d.x) / dist * step;
        d.y += (pl.y - d.y) / dist * step;
      }
    });
    list = list.filter(d => !d.taken);
  }

  function draw(ctx, camX, camY) {
    list.forEach(d => {
      const sx = Math.round(d.x - camX), sy = Math.round(d.y - camY);
      const bob = Math.sin(d.age * 2) * 1.5;        // slow, small float
      ctx.fillStyle = CONFIG.colors.shadow;
      ctx.beginPath();
      ctx.ellipse(sx, sy + D.size / 2, D.size / 2.5, D.size / 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(Icons.canvas(d.item), sx - D.size / 2, Math.round(sy - D.size / 2 - bob), D.size, D.size);
    });
  }

  // In a cave, the forest's drops wait. Things dropped in a cave stay there while you are inside.
  let stash = null;
  function enterUnder() { stash = list; list = []; }
  function leaveUnder() {                           // anything still on the cave floor comes with you
    const pl = Mechanics.player;
    list.forEach(d => { if (Inventory.add(d.item, 1)) stash.push({ item: d.item, x: pl.x, y: pl.y, age: 0 }); });
    list = stash; stash = null;
  }
  function save() { return (stash || list).map(d => ({ item: d.item, x: Math.round(d.x), y: Math.round(d.y) })); }
  function load(d) { stash = null; list = d.filter(x => CONFIG.items[x.item] && !World.isWater(Math.floor(x.x / 40), Math.floor(x.y / 40))).map(x => ({ item: x.item, x: x.x, y: x.y, age: 0 })); }

  return { spawn, update, draw, save, load, enterUnder, leaveUnder };
})();
