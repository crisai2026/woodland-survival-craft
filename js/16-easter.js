const Easter = (() => {
  const E = CONFIG.easter;
  let flies = [];
  function activate() {
    if (!Time.isNight()) return 'The mushrooms seem to be waiting for the night...';
    flies = [];
    for (let i = 0; i < E.fireflyCount; i++)
      flies.push({ a: Math.random() * Math.PI * 2, r: 30 + Math.random() * 110,
                   s: (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.25),
                   t: 0, life: E.fireflyTime * (0.6 + Math.random() * 0.4), z: Math.random() * 6 });
    Sound.chime();
    Mechanics.stats().fairyRing = true;
    if (Inventory.count('goldenAxe')) return 'The fireflies dance around you.';
    const pl = Mechanics.player, left = Inventory.add('goldenAxe', 1);
    if (left) Drops.spawn('goldenAxe', 1, pl.x, pl.y);
    return 'Magic! The fairy ring gives you a Golden axe. It chops a tree in one hit.';
  }
  function update(dt) {
    flies.forEach(f => { f.t += dt; f.a += f.s * dt; });
    flies = flies.filter(f => f.t < f.life);
  }
  // Fireflies float slowly around you. They fade in and out softly (no blinking).
  function draw(ctx, camX, camY) {
    const pl = Mechanics.player;
    flies.forEach(f => {
      const k = Math.sin(Math.PI * f.t / f.life);
      const x = pl.x - camX + Math.cos(f.a) * f.r, y = pl.y - camY + Math.sin(f.a) * f.r * 0.8 + Math.sin(f.t * 1.3 + f.z) * 6;
      ctx.fillStyle = `rgba(230, 245, 150, ${0.25 * k})`;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(250, 255, 200, ${0.9 * k})`;
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    });
  }
  return { activate, update, draw };
})();
