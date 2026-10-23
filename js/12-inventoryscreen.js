const InventoryScreen = (() => {
  const screen = document.getElementById('invScreen');
  const panel = document.getElementById('invPanel');
  const book = document.getElementById('book');
  const cursorEl = document.getElementById('cursorItem');
  let open = false, gridSize = 2, grid = [], cursor = null, bookOpen = true, drag = null, message = '';
  let near = { campfire: false };

  const arrFor = area => area === 'inv' ? Inventory.slots : grid;
  const max = id => Inventory.maxStack(id);
  const isDragOver = (area, i) => drag && drag.mode === 'spread' && drag.visited.length > 1 &&
                                  drag.visited.some(v => v.area === area && v.i === i);

  function slot(area, i, item, extra = '') {
    if (isDragOver(area, i)) extra += ' dragOver';
    return `<div class="slot ${extra}" data-area="${area}" data-i="${i}">${item ? Icons.img(item.id, item.n) : ''}</div>`;
  }

  function render() {
    const result = Crafting.match(grid, gridSize, near);
    const inv = Inventory.slots, H = Inventory.H, sel = Inventory.selected();
    let backpack = '', hotbar = '';
    for (let i = H; i < inv.length; i++) backpack += slot('inv', i, inv[i]);
    for (let i = 0; i < H; i++) hotbar += slot('inv', i, inv[i], i === sel ? 'sel' : '');
    const title = gridSize === 3 ? 'Crafting table' : 'Crafting';
    panel.innerHTML = `
      <div class="label">${title}</div>
      <div class="craftArea">
        <div class="craftGrid" style="grid-template-columns: repeat(${gridSize}, var(--slot))">
          ${grid.map((s, i) => slot('grid', i, s)).join('')}
        </div>
        <div class="arrow">➜</div>
        ${slot('result', 0, result ? { id: result.makes, n: result.amount } : null, 'big')}
        <button class="book" data-book>${bookOpen ? 'Hide recipes' : 'Recipes'}</button>
      </div>
      <div class="craftMsg">${message}</div>
      ${gridSize === 2 ? '<div class="note">Stand next to a crafting table to get the big 3 × 3 grid.</div>' : ''}
      <div class="label">Inventory</div>
      <div class="slots">${backpack}</div>
      <div class="slots hotrow">${hotbar}</div>
      <div class="note">Recipes: click one to fill the grid (Shift + click: as many as you can) · Click or drag to move items · Right-click: one item · E: close</div>`;
    renderBook();
    renderCursor();
  }

  // The recipe book shows the shape of every recipe.
  function renderBook() {
    book.classList.toggle('open', bookOpen);
    if (!bookOpen) return;
    const scroll = book.scrollTop;                     // keep the list where it was
    book.innerHTML = '<div class="label">Recipes</div>' + CONFIG.recipes.map(rc => {
      const cols = rc.pattern[0].length;
      const cells = rc.pattern.join('').split('').map(ch =>
        `<div class="rbCell">${ch === ' ' ? '' : `<img src="${Icons.get(rc.key[ch])}" title="${CONFIG.items[rc.key[ch]].name}" alt="">`}</div>`).join('');
      const tag = rc.near ? 'next to a campfire' : Crafting.needsTable(rc) ? 'crafting table' : '';
      const why = whyNot(rc);
      const status = why ? why : 'Click to fill the grid';
      return `<div class="rbRow ${why ? 'cannot' : 'can'}" data-recipe="${CONFIG.recipes.indexOf(rc)}">
        <div class="rbGrid" style="grid-template-columns: repeat(${cols}, 20px)">${cells}</div>
        <div class="rbOut">➜ <img src="${Icons.get(rc.makes)}" alt=""> ${rc.amount} ${CONFIG.items[rc.makes].name}
          ${tag ? `<span class="rbTag">${tag}</span>` : ''}
          <span class="rbStatus">${status}</span></div>
      </div>`;
    }).join('');
    book.scrollTop = scroll;
  }

  function renderCursor() {
    cursorEl.style.display = cursor ? 'block' : 'none';
    cursorEl.innerHTML = cursor ? Icons.img(cursor.id, cursor.n) : '';
  }

  // ----- Moving items -----
  function pickUp(area, i, half) {
    const arr = arrFor(area), s = arr[i];
    if (!s) return;
    if (!half) { cursor = s; arr[i] = null; return; }
    const n = Math.ceil(s.n / 2);
    cursor = { id: s.id, n }; s.n -= n;
    if (s.n <= 0) arr[i] = null;
  }

  function putDown(area, i, one) {
    const arr = arrFor(area), s = arr[i];
    if (!cursor) return;
    if (one) {
      if (!s) { arr[i] = { id: cursor.id, n: 1 }; cursor.n--; }
      else if (s.id === cursor.id && s.n < max(s.id)) { s.n++; cursor.n--; }
    } else if (!s) { arr[i] = cursor; cursor = null; return; }
    else if (s.id === cursor.id) { const m = Math.min(cursor.n, max(s.id) - s.n); s.n += m; cursor.n -= m; }
    else { arr[i] = cursor; cursor = s; return; }                                     // swap
    if (cursor.n <= 0) cursor = null;
  }

  function fits(area, i) {
    const s = arrFor(area)[i];
    return !s || (s.id === cursor.id && s.n < max(s.id));
  }

  // Share the items on the cursor across the slots you dragged over.
  function spread(list, one) {
    const targets = list.filter(v => fits(v.area, v.i));
    if (!targets.length) return;
    const per = one ? 1 : Math.max(1, Math.floor(cursor.n / targets.length));
    for (const v of targets) {
      if (!cursor) break;
      const arr = arrFor(v.area), s = arr[v.i];
      const m = Math.min(per, cursor.n, s ? max(s.id) - s.n : max(cursor.id));
      if (m <= 0) continue;
      if (s) s.n += m; else arr[v.i] = { id: cursor.id, n: m };
      cursor.n -= m;
      if (cursor.n <= 0) cursor = null;
    }
  }

  // Shift + click: move a whole stack between the hotbar and the backpack.
  function quickMove(i) {
    const s = Inventory.slots[i];
    if (!s) return;
    Inventory.slots[i] = null;
    const H = Inventory.H, total = Inventory.slots.length;
    let left = i < H ? Inventory.addTo(s.id, s.n, H, total) : Inventory.addTo(s.id, s.n, 0, H);
    if (left) left = Inventory.addTo(s.id, left, 0, total);
    if (left) Inventory.slots[i] = { id: s.id, n: left };
  }

  // ----- Crafting -----
  function useGrid() { grid.forEach((s, i) => { if (s) { s.n--; if (s.n <= 0) grid[i] = null; } }); }

  function craftOnce() {
    const rc = Crafting.match(grid, gridSize, near);
    if (!rc) return;
    if (cursor && (cursor.id !== rc.makes || cursor.n + rc.amount > max(rc.makes))) return;
    if (cursor) cursor.n += rc.amount; else cursor = { id: rc.makes, n: rc.amount };
    useGrid();
    Mechanics.count('crafted', rc.makes);
  }

  // Shift + click on the result: craft as many as possible, straight into the inventory.
  function craftAll() {
    for (let k = 0; k < 64; k++) {
      const rc = Crafting.match(grid, gridSize, near);
      if (!rc) break;
      useGrid();
      Mechanics.count('crafted', rc.makes);
      const left = Inventory.addTo(rc.makes, rc.amount, 0, Inventory.slots.length);
      if (left) { const pl = Mechanics.player; Drops.spawn(rc.makes, left, pl.x, pl.y); break; }
    }
  }

  // ----- Recipe book: click a recipe and the ingredients go into the grid -----
  function countItem(id) { return Inventory.slots.reduce((t, s) => t + (s && s.id === id ? s.n : 0), 0); }
  function takeItem(id, n) {
    for (let i = Inventory.slots.length - 1; i >= 0 && n > 0; i--) {     // take from the backpack first
      const s = Inventory.slots[i];
      if (!s || s.id !== id) continue;
      const m = Math.min(n, s.n); s.n -= m; n -= m;
      if (s.n <= 0) Inventory.slots[i] = null;
    }
  }
  function needsOf(rc) {
    const need = {};
    rc.pattern.join('').split('').forEach(ch => { if (ch !== ' ') need[rc.key[ch]] = (need[rc.key[ch]] || 0) + 1; });
    return need;
  }
  function fitsGrid(rc) { return rc.pattern.length <= gridSize && rc.pattern[0].length <= gridSize; }
  // Counts the items in the grid as yours too, because filling puts them back first.
  function haveCount(id) { return countItem(id) + grid.reduce((t, s) => t + (s && s.id === id ? s.n : 0), 0) +
                                  (cursor && cursor.id === id ? cursor.n : 0); }
  // Returns a short reason why this recipe can't be made now, or '' if it can.
  function whyNot(rc) {
    if (!fitsGrid(rc)) return 'Needs a crafting table';
    if (rc.near && !near[rc.near]) return 'Needs a campfire nearby';
    const missing = Object.entries(needsOf(rc)).filter(([id, n]) => haveCount(id) < n)
      .map(([id, n]) => `${n - haveCount(id)} ${CONFIG.items[id].name}`);
    return missing.length ? 'Missing: ' + missing.join(', ') : '';
  }
  // Put everything in the grid (and in your hand) back into the inventory.
  function emptyGrid() {
    const back = grid.filter(Boolean);
    if (cursor) back.push(cursor);
    const pl = Mechanics.player;
    back.forEach(s => { const left = Inventory.addTo(s.id, s.n, 0, Inventory.slots.length); if (left) Drops.spawn(s.id, left, pl.x, pl.y); });
    grid = grid.map(() => null); cursor = null;
  }
  function fillRecipe(i, many) {
    const rc = CONFIG.recipes[i], name = CONFIG.items[rc.makes].name;
    const why = whyNot(rc);
    if (why) { message = `${name}: ${why.toLowerCase()}.`; return; }
    emptyGrid();
    const need = needsOf(rc);
    let sets = Math.min(...Object.entries(need).map(([id, n]) => Math.floor(countItem(id) / n)));
    sets = many ? Math.min(sets, CONFIG.inventory.stackSize) : 1;
    Object.entries(need).forEach(([id, n]) => takeItem(id, n * sets));
    rc.pattern.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== ' ') grid[r * gridSize + c] = { id: rc.key[ch], n: sets };
    }));
    message = sets > 1
      ? `Ready! Shift + click the result to make all ${sets * rc.amount} ${name}.`
      : `Ready! Click the result on the right to make ${rc.amount} ${name}.`;
  }

  book.addEventListener('mousedown', e => {
    const row = e.target.closest('[data-recipe]');
    if (!row) return;
    e.preventDefault();
    fillRecipe(+row.dataset.recipe, e.shiftKey);
    Inventory.changed();
    render();
  });

  function slotAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const s = el && el.closest && el.closest('#invPanel .slot[data-area]');
    return s ? { area: s.dataset.area, i: +s.dataset.i } : null;
  }

  panel.addEventListener('mousedown', e => {
    const el = e.target.closest('.slot[data-area]');
    if (!el) {
      if (e.target.closest('[data-book]')) { bookOpen = !bookOpen; render(); }
      return;
    }
    e.preventDefault();
    const area = el.dataset.area, i = +el.dataset.i, right = e.button === 2;
    if (area === 'result') { e.shiftKey ? craftAll() : craftOnce(); message = ''; }
    else if (e.shiftKey && !cursor && area === 'inv') quickMove(i);
    else if (!cursor) { pickUp(area, i, right); if (cursor) drag = { mode: 'carry', area, i }; }
    else drag = { mode: 'spread', one: right, visited: [{ area, i }] };
    Inventory.changed();
    render();
  });

  window.addEventListener('mousemove', e => {
    cursorEl.style.left = e.clientX + 'px';
    cursorEl.style.top = e.clientY + 'px';
    if (!drag || drag.mode !== 'spread' || !cursor) return;
    const s = slotAt(e.clientX, e.clientY);
    if (!s || s.area === 'result') return;
    if (drag.visited.some(v => v.area === s.area && v.i === s.i)) return;
    if (!fits(s.area, s.i) || drag.visited.length >= cursor.n) return;
    drag.visited.push(s);
    render();
  });

  window.addEventListener('mouseup', e => {
    if (!drag) return;
    const d = drag;
    drag = null;
    const s = slotAt(e.clientX, e.clientY);
    if (d.mode === 'carry') {
      // Let go on a different slot = drop the items there.
      if (s && s.area !== 'result' && !(s.area === d.area && s.i === d.i)) putDown(s.area, s.i, false);
    } else if (d.visited.length === 1) putDown(d.visited[0].area, d.visited[0].i, d.one);
    else spread(d.visited, d.one);
    Inventory.changed();
    render();
  });

  screen.addEventListener('contextmenu', e => e.preventDefault());

  function show() {
    open = true;
    Mechanics.clearKeys();
    gridSize = Mechanics.nearTable() ? 3 : 2;
    near = { campfire: Mechanics.nearCampfire() };
    grid = new Array(gridSize * gridSize).fill(null);
    cursor = null; drag = null; message = '';
    render();
    screen.classList.add('open');
  }

  // Items left in the grid or on the cursor go back to the inventory
  // (or onto the ground if there is no space).
  function close() {
    const back = grid.filter(Boolean);
    if (cursor) back.push(cursor);
    const pl = Mechanics.player;
    back.forEach(s => { const left = Inventory.add(s.id, s.n); if (left) Drops.spawn(s.id, left, pl.x, pl.y); });
    grid = []; cursor = null; drag = null;
    renderCursor();
    open = false;
    Mechanics.clearKeys();
    screen.classList.remove('open');
    Inventory.changed();
  }

  window.addEventListener('keydown', e => {
    if (e.repeat) return;
    if (e.code === 'KeyE' && !Screens.busy()) { e.preventDefault(); if (!open && Under.useE()) return; open ? close() : show(); }
    else if (e.code === 'Escape' && open) close();
  });

  return { isOpen: () => open, close };
})();
