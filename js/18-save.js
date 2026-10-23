const Save = (() => {
  const key = CONFIG.save.key;
  const seedKey = key + '-next-seed';

  function write() {
    try {
      localStorage.setItem(key, JSON.stringify({
        version: 1, world: World.save(), animals: Animals.save(), drops: Drops.save(),
        player: Mechanics.save(), inventory: Inventory.save(), time: Time.save()
      }));
    } catch (e) { /* saving is not possible here; the game still works */ }
  }

  function read() {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  function nextSeed() {
    try { const s = localStorage.getItem(seedKey); if (s) return +s; } catch (e) {}
    return CONFIG.world.seed;
  }

  function newWorld() {
    try {
      localStorage.removeItem(key);
      localStorage.setItem(seedKey, String(Math.floor(Math.random() * 1e9)));
    } catch (e) {}
    location.reload();
  }

  window.addEventListener('beforeunload', write);
  document.addEventListener('visibilitychange', () => { if (document.hidden) write(); });

  return { write, read, nextSeed, newWorld };
})();
