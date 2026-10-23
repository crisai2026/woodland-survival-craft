const Inventory = (() => {
  const H = CONFIG.inventory.hotbarSize, BP = CONFIG.inventory.backpackSize;
  const slots = new Array(H + BP).fill(null);     // each slot: null or { id, n }
  let selected = 0;
  const listeners = [];

  function maxStack(id) { return CONFIG.items[id].stack || CONFIG.inventory.stackSize; }
  function changed() { listeners.forEach(f => f()); }

  // Add items into slots from..to. Fills matching stacks first, then empty slots.
  // Returns how many did NOT fit.
  function addTo(id, n, from, to) {
    for (let i = from; i < to && n > 0; i++) {
      const s = slots[i];
      if (s && s.id === id && s.n < maxStack(id)) { const m = Math.min(n, maxStack(id) - s.n); s.n += m; n -= m; }
    }
    for (let i = from; i < to && n > 0; i++)
      if (!slots[i]) { const m = Math.min(n, maxStack(id)); slots[i] = { id, n: m }; n -= m; }
    return n;
  }
  function add(id, n) { const left = addTo(id, n, 0, slots.length); changed(); return left; }

  function canAdd(id) { return slots.some(s => !s || (s.id === id && s.n < maxStack(id))); }

  function takeOne(i) {
    const s = slots[i];
    if (!s) return;
    s.n -= 1;
    if (s.n <= 0) slots[i] = null;
    changed();
  }

  // The best value of a property (like tool power) among the items you carry.
  function best(test, value) {
    let v = 0;
    slots.forEach(s => { if (s && test(CONFIG.items[s.id])) v = Math.max(v, value(CONFIG.items[s.id])); });
    return v;
  }

  function select(i) { selected = i; changed(); }

  function count(id) { return slots.reduce((t, s) => t + (s && s.id === id ? s.n : 0), 0); }
  // Take n items, from the backpack first. Returns how many were taken.
  function take(id, n) {
    let got = 0;
    for (let i = slots.length - 1; i >= 0 && got < n; i--) {
      const s = slots[i];
      if (!s || s.id !== id) continue;
      const m = Math.min(n - got, s.n); s.n -= m; got += m;
      if (s.n <= 0) slots[i] = null;
    }
    changed();
    return got;
  }

  function save() { return { slots: slots.map(s => s && { id: s.id, n: s.n }), selected }; }
  function load(d) {
    for (let i = 0; i < slots.length; i++) {
      const s = d.slots[i];
      slots[i] = s && CONFIG.items[s.id] ? { id: s.id, n: s.n } : null;
    }
    selected = d.selected || 0;
    changed();
  }

  return { slots, add, addTo, canAdd, takeOne, maxStack, best, select, changed, save, load, count, take,
           selected: () => selected, selectedItem: () => slots[selected],
           onChange: f => listeners.push(f), H, BP };
})();
