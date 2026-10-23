const Crafting = (() => {
  // Cut away empty rows and columns around the items.
  function trim(cells, size) {
    let r0 = size, r1 = -1, c0 = size, c1 = -1;
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (cells[r * size + c]) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
    if (r1 < 0) return null;
    const rows = [];
    for (let r = r0; r <= r1; r++) {
      const row = [];
      for (let c = c0; c <= c1; c++) row.push(cells[r * size + c] ? cells[r * size + c].id : null);
      rows.push(row);
    }
    return rows;
  }

  // near = { campfire: true/false }
  function match(cells, size, near) {
    const g = trim(cells, size);
    if (!g) return null;
    return CONFIG.recipes.find(rc => {
      if (rc.near && !near[rc.near]) return false;
      const pat = rc.pattern;
      if (pat.length !== g.length || pat[0].length !== g[0].length) return false;
      for (let r = 0; r < pat.length; r++)
        for (let c = 0; c < pat[r].length; c++) {
          const ch = pat[r][c];
          if ((ch === ' ' ? null : rc.key[ch]) !== g[r][c]) return false;
        }
      return true;
    }) || null;
  }

  function needsTable(rc) { return rc.pattern.length > 2 || rc.pattern[0].length > 2; }

  return { match, needsTable };
})();
