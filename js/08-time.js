const Time = (() => {
  const T = CONFIG.time;
  const total = T.dayLength + T.nightLength;
  let t = T.startTime, day = 1;

  function update(dt) { t += dt; if (t >= total) { t -= total; day++; } }

  // 0 = full day, 1 = full night. Changes slowly in the evening and the morning.
  function nightAmount() {
    const f = T.fadeLength;
    let d;
    if (t < f) d = 1 - t / f;                                   // morning
    else if (t < T.dayLength - f) d = 0;                        // day
    else if (t < T.dayLength) d = (t - (T.dayLength - f)) / f;  // evening
    else d = 1;                                                 // night
    return d * d * (3 - 2 * d);                                 // smooth
  }

  function isNight() { return t >= T.dayLength || t < T.fadeLength / 2; }
  function canSleep() { return t >= T.dayLength - T.warnBefore || t < T.fadeLength / 2; }

  function label() {
    if (t < T.fadeLength) return 'Morning';
    if (t < T.dayLength - T.warnBefore) return 'Daytime';
    if (t < T.dayLength) return 'Night is coming';
    if (t > total - T.warnBefore) return 'Morning soon';
    return 'Night';
  }

  function sleepToMorning() {
    if (t >= T.dayLength - T.warnBefore) day++;   // sleeping in the evening or night → next day
    t = T.fadeLength;
  }

  return { update, nightAmount, isNight, canSleep, label, sleepToMorning,
           fraction: () => t / total, dayFraction: () => T.dayLength / total, day: () => day,
           save: () => ({ t, day }), load: d => { t = d.t; day = d.day; } };
})();
