const Hud = (() => {
  const C = CONFIG.colors;
  // Tiny pixel pictures: each letter is one colour, "." is empty.
  const HEART = ['.XX.XX.', 'XoXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
  const CHICKEN = ['....MM.', '...MoMM', '..MMMMM', '..MMMM.', '.B.MM..', 'B......', 'BB.....'];

  function drawPixels(ctx, rows, x, y, scale, colors) {
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }));
  }

  function box(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(28, 34, 26, 0.82)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 8); else ctx.rect(x, y, w, h);
    ctx.fill();
  }

  function drawBars(ctx) {
    const S = CONFIG.survival, sv = Mechanics.survival;
    const scale = 3, gap = 24, x0 = 26, y0 = 24;
    box(ctx, 14, 14, gap * Math.max(S.maxHealth, S.maxHunger) + 16, 70);
    const full = { X: C.heart, o: C.heartShine }, emptyH = { X: C.iconEmpty, o: C.iconEmpty };
    for (let i = 0; i < S.maxHealth; i++)
      drawPixels(ctx, HEART, x0 + i * gap, y0, scale, i < sv.health ? full : emptyH);
    const food = { M: C.chicken, o: C.chickenShine, B: C.bone };
    const emptyF = { M: C.iconEmpty, o: C.iconEmpty, B: C.iconEmpty };
    for (let i = 0; i < S.maxHunger; i++)
      drawPixels(ctx, CHICKEN, x0 + i * gap, y0 + 26, scale, i < sv.hunger ? food : emptyF);
  }

  // A round clock like in Minecraft: the day half and the night half turn slowly.
  // The mark at the top shows the time now.
  function drawClock(ctx, viewW) {
    const w = 132, x = viewW - w - 14, y = 14, cx = x + w / 2, cy = y + 46, r = 32;
    box(ctx, x, y, w, 132);
    const dayArc = Time.dayFraction() * Math.PI * 2;
    const turn = -Time.fraction() * Math.PI * 2 - Math.PI / 2;     // "now" points up
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(turn);
    ctx.fillStyle = '#8cc4e8';                                     // day sky
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, 0, dayArc); ctx.fill();
    ctx.fillStyle = '#1f2a4a';                                     // night sky
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, dayArc, Math.PI * 2); ctx.fill();
    const sunA = dayArc / 2, moonA = dayArc + (Math.PI * 2 - dayArc) / 2;
    ctx.fillStyle = '#f5d25a';                                     // sun
    ctx.fillRect(Math.cos(sunA) * r * 0.6 - 7, Math.sin(sunA) * r * 0.6 - 7, 14, 14);
    ctx.fillStyle = '#e8e4d0';                                     // moon
    ctx.fillRect(Math.cos(moonA) * r * 0.6 - 6, Math.sin(moonA) * r * 0.6 - 6, 12, 12);
    if (!Animals.isFullMoon()) {                                   // a thin moon; on full-moon nights it is round
      ctx.fillStyle = '#1f2a4a';
      ctx.fillRect(Math.cos(moonA) * r * 0.6 - 2, Math.sin(moonA) * r * 0.6 - 6, 8, 8);
    }
    ctx.restore();
    ctx.strokeStyle = '#c9b48a'; ctx.lineWidth = 4;               // frame
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#f1ede0';                                     // "now" mark
    ctx.beginPath(); ctx.moveTo(cx - 6, cy - r - 8); ctx.lineTo(cx + 6, cy - r - 8); ctx.lineTo(cx, cy - r + 2); ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText(`Day ${Time.day()}`, cx, y + 106);
    ctx.font = '14px system-ui, sans-serif';
    const lbl = Time.label();
    ctx.fillText(lbl === 'Night' && Animals.isFullMoon() ? 'Full moon' : lbl, cx, y + 124);
    ctx.textAlign = 'left';
  }

  function draw(ctx, viewW) { drawBars(ctx); drawClock(ctx, viewW); }

  return { draw };
})();

// Goals: a small hint that shows what to try next.
const Goals = (() => {
  const el = document.getElementById('goal');
  const got = (st, g, id) => (st[g][id] || 0) >= 1;
  const list = [
    ['Chop a tree: walk up to it and press F.',                        st => got(st, 'broke', 'tree')],
    ['Press E. Put wood in the crafting grid to make planks.',         st => got(st, 'crafted', 'planks')],
    ['Make a crafting table: 4 planks in a square.',                   st => got(st, 'crafted', 'table')],
    ['Choose the table with a number key. Press Q to place it.',       st => got(st, 'placed', 'table')],
    ['Stand by the table. Press E. Make sticks, then a wooden pickaxe.', st => got(st, 'crafted', 'woodPickaxe')],
    ['Find grey rocks. Mine stone and coal with F.',                   st => got(st, 'broke', 'coal')],
    ['Make a campfire (sticks, coal and wood) and place it with Q.',   st => got(st, 'placed', 'campfire')],
    ['Hunt an animal. Hold the raw meat, face the campfire, press R to cook it.', st => (st.cooked || 0) >= 1],
    ['Eat: choose food and hold R (or the right mouse button).',      st => st.ate >= 1],
    ['Make a tent (4 wool + 2 sticks) and place it with Q.',          st => got(st, 'placed', 'tent')],
    ['Make a bed. Face your tent, press R to go inside, and place the bed.', st => got(st, 'placed', 'bedInTent')],
    ['In the evening or at night, go into your tent and sleep in your bed.', st => st.slept >= 1],
    ['Make stone tools and build your base with walls.',               st => (got(st, 'crafted', 'stonePickaxe') || got(st, 'crafted', 'stoneAxe')) &&
                                                                              (got(st, 'placed', 'woodWall') || got(st, 'placed', 'stoneWall'))],
    ['Find iron (rocks with orange spots, needs a stone pickaxe). Make a hunting rifle and ammo.',
                                                                       st => got(st, 'crafted', 'rifle') && got(st, 'crafted', 'ammo')],
    ['Find wild garlic (white flowers) and pick it with F. Plant some with Q.', st => got(st, 'placed', 'garlic0')],
    ['Make a garlic slingshot (sticks and wool). Vampires come out some nights!', st => got(st, 'crafted', 'slingshot')],
    ['Make a fishing rod (sticks and wool) and catch a fish in a pond or river.', st => (st.fished || 0) >= 1],
    ['Make an iron axe, then a chainsaw: the iron axe in the middle, iron all around it.', st => got(st, 'crafted', 'chainsaw')],
    ['Find a cave (a dark opening in the rocks), go inside with R and mine ore.', st => (st.caveOre || 0) >= 1]
  ];
  let last = '';
  function update() {
    const st = Mechanics.stats();
    const g = list.find(([, done]) => !done(st));
    const text = g ? 'Goal: ' + g[0] : 'Free play: build, explore and survive!';
    if (text !== last) { el.textContent = text; last = text; }
  }
  return { update };
})();

const Hotbar = (() => {
  const el = document.getElementById('hotbar');
  const nameEl = document.getElementById('itemName');

  function render() {
    const sel = Inventory.selected();
    let html = '';
    for (let i = 0; i < Inventory.H; i++) {
      const s = Inventory.slots[i];
      html += `<div class="hslot ${i === sel ? 'sel' : ''}"><span class="num">${(i + 1) % 10}</span>${s ? Icons.img(s.id, s.n) : ''}</div>`;
    }
    el.innerHTML = html;
  }

  // Show a short text above the hotbar that fades out slowly.
  function say(text) {
    nameEl.textContent = text;
    nameEl.classList.remove('show');
    void nameEl.offsetWidth;          // restart the fade
    nameEl.classList.add('show');
  }

  window.addEventListener('keydown', e => {
    const m = e.code.match(/^Digit(\d)$/);
    if (!m) return;
    const i = m[1] === '0' ? 9 : +m[1] - 1;
    if (i >= Inventory.H) return;
    Inventory.select(i);
    const s = Inventory.selectedItem();
    const it = s && CONFIG.items[s.id];
    say(!s ? 'Empty slot' : it.food ? `${it.name} · hold R to eat`
        : it.gun ? `${it.name} ${Mechanics.loaded()}/${CONFIG.rifle.shots} · F: shoot · R: reload`
        : it.sling ? `${it.name} · F: shoot garlic (${Inventory.count('garlic')} garlic)`
        : s.id === 'garlic' ? 'Garlic · Q: plant it · keeps vampires away while you hold it'
        : it.saw ? 'Chainsaw · F: cuts a tree in one go, very fast. Only for trees and wood'
        : it.rod ? 'Fishing rod · face the water and press F. When a fish bites, press F again'
        : s.id === 'key' ? 'Gate key · R at a closed gate: lock or unlock it'
        : s.id === 'bone' ? 'Bone · a treat for wolves: R facing a wolf to feed it'
        : s.id === 'gate' ? 'Wooden gate (2 squares wide) · Q: place it across the way you are facing'
        : s.id === 'coin' ? "Knight's Quest trophy coin · a secret prize from the hidden chest"
        : s.id === 'shelf' ? 'Trophy shelf · Q: place it at your base, then R to put your coins on it' : it.name);
  });

  Inventory.onChange(render);
  return { render, say };
})();
